/*
 * Unified gamification progress — the single source of truth.
 *
 * Consolidates the XP -> level and badge computation that was duplicated three
 * ways (compliance.getUserProgress, the coach pathway page, the ref dashboard).
 * Today progress is derived from completed certification-pathway stages (the
 * existing compute-on-read model); the Member-Value foundation (F1) will add the
 * XpEvents / BadgeAwards / Streaks ledger on top WITHOUT changing these call
 * sites or the returned shape.
 */
import type { Payload } from 'payload'

import { COACH_BADGES, REF_BADGES, getLevelForXP, type Badge } from '../gamification'
import { pathwayAudienceFor, type PathwayAudience } from '../audience'
import { getPathwayProgress, type UserLike } from '../compliance'

export type UnifiedProgress = {
  xp: number
  level: number
  levelTitle: string
  nextLevelXp: number
  progress: number
  completedStages: number
  earnedBadges: Badge[]
  lockedBadges: Badge[]
  /** Current activity streak, populated only when the ledger is enabled. */
  streakDays?: number
}

/**
 * The XpEvents/BadgeAwards/Streaks ledger is read only when explicitly enabled.
 * Default OFF so production (where the F1a tables are not yet migrated) keeps the
 * cert-derived behavior and never queries the not-yet-existent tables.
 */
const ledgerEnabled = (): boolean => process.env.FEATURE_GAMIFICATION_LEDGER === 'true'

/** Map a populated BadgeAward.badge doc onto the positional Badge display shape. */
const toDisplayBadge = (badge: unknown): Badge | null => {
  if (!badge || typeof badge !== 'object') return null
  const b = badge as { slug?: string | null; name?: string | null; icon?: string | null; description?: string | null }
  if (!b.slug) return null
  return { id: b.slug, name: b.name ?? b.slug, icon: b.icon ?? '', description: b.description ?? '' }
}

/** Dedupe badges by id, preserving first occurrence. Pure. */
export function dedupeBadgesById(badges: Badge[]): Badge[] {
  const seen = new Set<string>()
  const out: Badge[] = []
  for (const b of badges) {
    if (seen.has(b.id)) continue
    seen.add(b.id)
    out.push(b)
  }
  return out
}

/** Positional badge set for a pathway audience (coaches default; officials get REF_BADGES). */
const badgeSetFor = (audience: PathwayAudience | undefined): Badge[] =>
  audience === 'official' ? REF_BADGES : COACH_BADGES

/**
 * Pure progress summary from a completed-stage count + earned XP. Shared by the
 * compute-on-read service below and the coach/ref pathway pages so the XP->level
 * ladder and the positional badge award live in exactly one place. (F1 swaps the
 * positional COACH/REF_BADGES slice for the Badges/BadgeAwards ledger here.)
 */
export function summarizeProgress(input: {
  completedStages: number
  xp: number
  audience?: PathwayAudience
}): UnifiedProgress {
  const { completedStages, xp } = input
  const lvl = getLevelForXP(xp)
  const badgeSet = badgeSetFor(input.audience)
  const earnedBadges = badgeSet.slice(0, Math.min(completedStages, badgeSet.length))
  const lockedBadges = badgeSet.slice(earnedBadges.length)
  return {
    xp,
    level: lvl.level,
    levelTitle: lvl.title,
    nextLevelXp: lvl.nextLevelXp,
    progress: lvl.progress,
    completedStages,
    earnedBadges,
    lockedBadges,
  }
}

/**
 * The single source of truth for a user's gamification progress, derived from
 * their completed certification-pathway stages. Replaces the old
 * compliance.getUserProgress; F1 extends it with the XpEvents/BadgeAwards ledger.
 */
export async function getUnifiedProgress(payload: Payload, user: UserLike): Promise<UnifiedProgress> {
  const audience = pathwayAudienceFor(user.roles)
  const pathways = await getPathwayProgress(payload, user, audience)
  const completedStages = pathways.reduce((n, p) => n + p.stages.filter((s) => s.complete).length, 0)
  const certXp = pathways.reduce(
    (sum, p) => sum + p.stages.filter((s) => s.complete).reduce((a, s) => a + s.xpReward, 0),
    0,
  )
  const base = summarizeProgress({ completedStages, xp: certXp, audience })
  if (!ledgerEnabled()) return base
  try {
    return await withLedger(payload, user.id, base)
  } catch (err) {
    // Fail safe: if the ledger tables are unavailable, degrade to the cert-derived
    // result rather than breaking the page.
    payload.logger?.error?.({ err }, 'getUnifiedProgress: ledger read failed, using cert-only')
    return base
  }
}

/**
 * Add ledger XP, the current streak, and BadgeAward badges on top of the
 * cert-derived base. This is a read path (page render), so it intentionally does
 * NOT thread a `req`/transaction. The find limits are a deliberate ceiling; a user
 * exceeding them would undercount XP (revisit with pagination before high volume).
 */
async function withLedger(payload: Payload, userId: number | string, base: UnifiedProgress): Promise<UnifiedProgress> {
  const [eventsRes, streakRes, awardsRes] = await Promise.all([
    payload.find({ collection: 'xp-events', where: { user: { equals: userId } }, limit: 5000, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'streaks', where: { user: { equals: userId } }, limit: 1, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'badge-awards', where: { user: { equals: userId } }, limit: 1000, depth: 1, overrideAccess: true }),
  ])
  const ledgerXp = eventsRes.docs.reduce((sum, e) => {
    const ev = e as { amount?: number | null; kind?: string | null }
    // pathway_stage XP is already counted in base.xp (cert-derived); skip it here
    // so a future pathway-completion event does not double-count.
    if (ev.kind === 'pathway_stage') return sum
    return sum + (ev.amount ?? 0)
  }, 0)
  const streakDays = (streakRes.docs[0] as { currentStreakDays?: number | null } | undefined)?.currentStreakDays ?? 0
  const ledgerBadges = awardsRes.docs
    .map((a) => toDisplayBadge((a as { badge?: unknown }).badge))
    .filter((b): b is Badge => b !== null)

  const totalXp = base.xp + ledgerXp
  const lvl = getLevelForXP(totalXp)
  const earnedBadges = dedupeBadgesById([...base.earnedBadges, ...ledgerBadges])
  const earnedIds = new Set(earnedBadges.map((b) => b.id))
  const lockedBadges = base.lockedBadges.filter((b) => !earnedIds.has(b.id))

  return {
    xp: totalXp,
    level: lvl.level,
    levelTitle: lvl.title,
    nextLevelXp: lvl.nextLevelXp,
    progress: lvl.progress,
    completedStages: base.completedStages,
    earnedBadges,
    lockedBadges,
    streakDays,
  }
}
