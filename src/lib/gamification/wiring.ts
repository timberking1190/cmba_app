/*
 * Engine wiring - emits XP events from real app actions. Every caller is gated on
 * FEATURE_GAMIFICATION_LEDGER so production stays completely inert (and never
 * queries the not-yet-migrated tables) until the foundation is switched on.
 */
import type { Payload, PayloadRequest } from 'payload'

import { XP_REWARDS } from '../gamification'
import { awardXp } from './engine'

type Req = PayloadRequest | undefined

const ledgerEnabled = (): boolean => process.env.FEATURE_GAMIFICATION_LEDGER === 'true'

/** Small fun-only XP for logging a challenge attempt (self-reported). */
export const CHALLENGE_PARTICIPATION_XP = 25
/** Fallback meaningful XP for a verified challenge when the challenge has none set. */
export const CHALLENGE_DEFAULT_XP = 100

const relId = (r: unknown): number | string | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: number | string }).id : (r as number | string)

/**
 * A verified certification is a real, verified achievement, so it emits a
 * meaningful XP event (idempotent per certification). kind 'pathway_stage' is
 * excluded from the unified XP total on read (cert XP is already counted from the
 * pathway), so this does not double-count; its value is feeding verified_count
 * badges and giving the ledger a real, verified source from day one.
 */
export async function onCertificationVerified(
  payload: Payload,
  cert: { id: number | string; user?: unknown; verifiedAt?: string | null } | null | undefined,
  req?: Req,
): Promise<void> {
  if (!ledgerEnabled() || !cert) return
  if (!cert.verifiedAt) return
  const userId = relId(cert.user)
  if (userId == null) return
  await awardXp(
    payload,
    {
      user: userId,
      kind: 'pathway_stage',
      amount: XP_REWARDS.completeCourse,
      counts: 'meaningful',
      verified: true,
      source: { collection: 'certifications', docId: String(cert.id) },
      dedupeKey: `cert:${cert.id}`,
    },
    req,
  )
}

/**
 * A logged challenge attempt earns small fun-only (self-reported) participation XP.
 * Idempotent per submission. The meaningful reward comes later, on verification.
 */
export async function onChallengeSubmitted(
  payload: Payload,
  submission: { id: number | string; user?: unknown; challenge?: unknown } | null | undefined,
  req?: Req,
): Promise<void> {
  if (!ledgerEnabled() || !submission) return
  const userId = relId(submission.user)
  if (userId == null) return
  // Dedup per (user, challenge) so re-logging the SAME challenge does not stack
  // participation XP; the source still traces to this specific submission.
  const challengeId = relId(submission.challenge) ?? submission.id
  await awardXp(
    payload,
    {
      user: userId,
      kind: 'challenge',
      amount: CHALLENGE_PARTICIPATION_XP,
      counts: 'fun_only',
      verified: false,
      source: { collection: 'challenge-submissions', docId: String(submission.id) },
      dedupeKey: `challenge-sub:${challengeId}`,
    },
    req,
  )
}

/**
 * A coach/admin-verified challenge grants the challenge's meaningful (verified) XP,
 * which counts toward verification-required badges. Idempotent per submission.
 */
export async function onChallengeVerified(
  payload: Payload,
  submission: { id: number | string; user?: unknown; challenge?: unknown } | null | undefined,
  req?: Req,
): Promise<void> {
  if (!ledgerEnabled() || !submission) return
  const userId = relId(submission.user)
  if (userId == null) return
  let reward = CHALLENGE_DEFAULT_XP
  const challengeId = relId(submission.challenge)
  if (challengeId != null) {
    const ch = await payload.findByID({ collection: 'challenges', id: challengeId, depth: 0, overrideAccess: true, req }).catch(() => null)
    const r = (ch as { xpReward?: number | null } | null)?.xpReward
    if (typeof r === 'number') reward = r
  }
  await awardXp(
    payload,
    {
      user: userId,
      kind: 'challenge',
      amount: reward,
      counts: 'meaningful',
      verified: true,
      source: { collection: 'challenge-submissions', docId: String(submission.id) },
      // Dedup per (user, challenge): the meaningful reward is earned once per
      // challenge no matter how many submissions of it get verified.
      dedupeKey: `challenge-verified:${challengeId ?? submission.id}`,
    },
    req,
  )
}
