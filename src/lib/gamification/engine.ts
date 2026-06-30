/*
 * Gamification award engine - the single write-path for XP and badges.
 *
 * Every XP-bearing action goes through awardXp, which inserts ONE immutable
 * XpEvent (idempotent on the unique (user, dedupeKey) index) and then re-evaluates
 * badges. The ONLY way to mint a verified event or an award is through this engine
 * via payload.create({ overrideAccess: true, req }); the collections deny all API
 * writes. `req` is threaded so nested writes join the parent transaction (the
 * games/service.ts lesson: a forgotten req deadlocks on the parent-locked row).
 *
 * Trust model: an XpEvent's `verified` flag and an auto BadgeAward fire only on
 * the correct basis - a verificationRequired badge is checked against VERIFIED XP
 * only, so when it fires the award legitimately counts (verified=true). Fun
 * badges (verificationRequired=false) count trivially.
 *
 * NOTE: this engine is authored but not yet wired to any caller, and it queries
 * the F1a tables (xp-events / badge-awards / badges / streaks). It must not run
 * until the F1a migration is applied.
 */
import type { Payload, PayloadRequest } from 'payload'

import type { Badge, XpEvent } from '../../payload-types'
import { isUnder18 } from '../age'
import { eligibleAudiences } from '../audience'
import { writeAudit } from '../games/service'

type Req = PayloadRequest | undefined

const relId = (r: unknown): number | string | undefined => {
  if (r == null) return undefined
  if (typeof r === 'object') return (r as { id: number | string }).id
  return r as number | string
}

/* ── Pure helpers (unit-tested, no DB) ──────────────────────────────────────── */

export type XpStats = {
  totalXp: number
  verifiedXp: number
  /** Count of VERIFIED events keyed by event kind (the verified_count source key). */
  verifiedCountByKind: Record<string, number>
}

type XpEventLike = { amount?: number | null; verified?: boolean | null; kind?: string | null }

/** Fold a user's Xp events into the totals used to evaluate badges. */
export function deriveXpStats(events: XpEventLike[]): XpStats {
  let totalXp = 0
  let verifiedXp = 0
  const verifiedCountByKind: Record<string, number> = {}
  for (const e of events) {
    const amt = e.amount ?? 0
    totalXp += amt
    if (e.verified) {
      verifiedXp += amt
      const k = e.kind ?? 'unknown'
      verifiedCountByKind[k] = (verifiedCountByKind[k] ?? 0) + 1
    }
  }
  return { totalXp, verifiedXp, verifiedCountByKind }
}

export type BadgeEarnContext = XpStats & { currentStreakDays: number }

type BadgeRule = Pick<Badge, 'earnKind' | 'earnConfig' | 'verificationRequired'>

/**
 * Pure earn check for the auto-evaluable badge kinds. pathway_stage, recognition,
 * and manual badges are awarded by their own flows, not here, so they return false.
 */
export function isBadgeEarned(badge: BadgeRule, ctx: BadgeEarnContext): boolean {
  const threshold = badge.earnConfig?.threshold ?? 0
  switch (badge.earnKind) {
    case 'xp_threshold':
      return (badge.verificationRequired ? ctx.verifiedXp : ctx.totalXp) >= threshold
    case 'streak_threshold':
      return ctx.currentStreakDays >= threshold
    case 'verified_count':
      return (ctx.verifiedCountByKind[badge.earnConfig?.sourceKey ?? ''] ?? 0) >= threshold
    default:
      return false
  }
}

/* ── DB orchestration (overrideAccess engine writes) ────────────────────────── */

export type AwardXpInput = {
  user: number | string
  kind: XpEvent['kind']
  amount: number
  counts?: 'fun_only' | 'meaningful'
  verified?: boolean
  source?: { collection?: string; docId?: string }
  /** Idempotency key, unique per user; a repeat call with the same key is a no-op. */
  dedupeKey: string
  occurredAt?: string
}

/**
 * Insert one immutable XpEvent (idempotent on (user, dedupeKey)) then re-evaluate
 * badges. Returns whether a new event was created.
 */
export async function awardXp(payload: Payload, input: AwardXpInput, req?: Req): Promise<{ created: boolean }> {
  // Enforce the trust invariant: meaningful <=> verified. `verified` is the trust
  // signal deriveXpStats keys off, so the two must never disagree. Fail closed on a
  // contradiction rather than minting an event that lies about its trust level.
  const verified = input.verified ?? false
  const counts = input.counts ?? (verified ? 'meaningful' : 'fun_only')
  if (verified !== (counts === 'meaningful')) {
    throw new Error(`awardXp: counts=${counts} contradicts verified=${verified} (meaningful must be verified and vice versa)`)
  }
  try {
    await payload.create({
      collection: 'xp-events',
      overrideAccess: true,
      req,
      data: {
        user: input.user,
        amount: input.amount,
        kind: input.kind,
        counts,
        verified,
        source: { collection: input.source?.collection ?? null, docId: input.source?.docId ?? null },
        occurredAt: input.occurredAt ?? new Date().toISOString(),
        dedupeKey: input.dedupeKey,
      } as never,
    })
  } catch (err) {
    // A unique (user, dedupeKey) violation means this action was already credited;
    // confirm the row exists and treat as an idempotent no-op, else rethrow.
    const existing = await payload.find({
      collection: 'xp-events',
      where: { and: [{ user: { equals: input.user } }, { dedupeKey: { equals: input.dedupeKey } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (existing.docs.length > 0) return { created: false }
    throw err
  }
  await evaluateBadges(payload, input.user, req)
  return { created: true }
}

/**
 * Re-evaluate and grant any newly-earned auto badges for a user. Idempotent: the
 * unique (user, badge) index means a badge is never awarded twice. Returns the
 * number of newly granted badges.
 */
export async function evaluateBadges(payload: Payload, userId: number | string, req?: Req): Promise<number> {
  const [eventsRes, streakRes, awardedRes, user] = await Promise.all([
    payload.find({ collection: 'xp-events', where: { user: { equals: userId } }, limit: 2000, depth: 0, overrideAccess: true, req }),
    payload.find({ collection: 'streaks', where: { user: { equals: userId } }, limit: 1, depth: 0, overrideAccess: true, req }),
    payload.find({ collection: 'badge-awards', where: { user: { equals: userId } }, limit: 1000, depth: 0, overrideAccess: true, req }),
    payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true, req }).catch(() => null),
  ])

  const ctx: BadgeEarnContext = {
    ...deriveXpStats(eventsRes.docs),
    currentStreakDays: streakRes.docs[0]?.currentStreakDays ?? 0,
  }

  // Re-derive isMinor server-side from date of birth; never trust a cached flag.
  const isMinor = isUnder18((user as { dateOfBirth?: string | null } | null)?.dateOfBirth)
  const audiences = new Set(eligibleAudiences((user as { roles?: string[] } | null)?.roles))
  const awardedBadgeIds = new Set(awardedRes.docs.map((a) => relId(a.badge)))

  const badgesRes = await payload.find({
    collection: 'badges',
    where: { active: { equals: true } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    req,
  })

  let granted = 0
  for (const badge of badgesRes.docs) {
    if (awardedBadgeIds.has(badge.id)) continue
    if (!badge.audience?.some((a) => audiences.has(a))) continue
    if (!isBadgeEarned(badge, ctx)) continue
    try {
      await payload.create({
        collection: 'badge-awards',
        overrideAccess: true,
        req,
        data: {
          user: userId,
          badge: badge.id,
          awardedVia: 'auto',
          // A verificationRequired badge fired against verified XP only, so its award
          // counts as verified; a fun badge (no verification required) does not.
          verified: badge.verificationRequired === true,
          isMinor,
          awardedAt: new Date().toISOString(),
        } as never,
      })
      await writeAudit(
        payload,
        { action: 'badge.award.auto', entity: 'badge-awards', entityId: badge.id, after: { user: userId, badge: badge.slug } },
        req,
      )
      granted++
    } catch {
      // Unique (user, badge) violation: awarded concurrently. Ignore.
    }
  }
  return granted
}
