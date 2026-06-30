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
