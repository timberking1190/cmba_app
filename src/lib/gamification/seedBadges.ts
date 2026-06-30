/*
 * Badge catalog seed - projects the legacy positional badge arrays
 * (COACH_BADGES / REF_BADGES) into declarative Badges-collection rows so the same
 * badges exist in the CMS catalog once the award engine (F1b) switches the source
 * from the positional slice to the Badges/BadgeAwards ledger.
 *
 * This module is PURE (no DB): `buildBadgeSeeds()` returns the seed rows. The DB
 * upsert (idempotent on `externalId`) lands with the F1b seed script once the
 * schema is migrated.
 */
import type { Payload, PayloadRequest } from 'payload'

import type { Audience } from '../audience'
import { COACH_BADGES, REF_BADGES, type Badge } from '../gamification'

export type BadgeSeed = {
  slug: string
  name: string
  description: string
  icon: string
  audience: Audience[]
  tier: 'bronze' | 'silver' | 'gold' | 'milestone'
  earnKind: 'xp_threshold' | 'streak_threshold' | 'verified_count' | 'pathway_stage' | 'recognition' | 'manual'
  earnConfig?: { threshold?: number; sourceKey?: string }
  verificationRequired: boolean
  externalId: string
}

/** A streak/warrior badge is fun-only (self-reported); everything else here is cert-pathway derived. */
const isStreakBadge = (b: Badge): boolean => /streak|warrior/i.test(b.id) || /streak/i.test(b.name)

/** The day threshold a streak badge requires, read from its id/name (30-day vs 7-day). */
const streakThreshold = (b: Badge): number => (/month|30/i.test(`${b.id} ${b.name}`) ? 30 : 7)

const toSeed = (b: Badge, audience: Audience): BadgeSeed => {
  const streak = isStreakBadge(b)
  return {
    slug: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    audience: [audience],
    tier: streak ? 'silver' : 'bronze',
    earnKind: streak ? 'streak_threshold' : 'pathway_stage',
    // A streak badge MUST carry its day threshold, else isBadgeEarned treats a
    // missing threshold as 0 and auto-awards it at streak zero. Pathway badges are
    // awarded by the cert flow (the engine ignores pathway_stage), so no threshold.
    earnConfig: streak ? { threshold: streakThreshold(b) } : undefined,
    // Pathway badges derive from VERIFIED certifications, so they count as
    // meaningful; streak badges are fun-only and do not require verification.
    verificationRequired: !streak,
    externalId: `seed:${b.id}`,
  }
}

/** Declarative catalog seed projected from the legacy positional badge arrays. */
export function buildBadgeSeeds(): BadgeSeed[] {
  return [
    ...COACH_BADGES.map((b) => toSeed(b, 'coach')),
    ...REF_BADGES.map((b) => toSeed(b, 'official')),
  ]
}

/**
 * Upsert the badge catalog into the Badges collection, idempotent on externalId.
 * Run AFTER the F1a migration is applied (operator/seed step); requires the
 * badges table to exist. Safe to re-run.
 */
export async function seedBadges(
  payload: Payload,
  req?: PayloadRequest,
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0
  for (const s of buildBadgeSeeds()) {
    const data = {
      slug: s.slug,
      name: s.name,
      description: s.description,
      icon: s.icon,
      audience: s.audience,
      tier: s.tier,
      earnKind: s.earnKind,
      earnConfig: s.earnConfig ?? {},
      verificationRequired: s.verificationRequired,
      active: true,
      externalId: s.externalId,
    }
    const existing = await payload.find({
      collection: 'badges',
      where: { externalId: { equals: s.externalId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (existing.docs[0]) {
      await payload.update({ collection: 'badges', id: existing.docs[0].id, overrideAccess: true, req, data: data as never })
      updated++
    } else {
      await payload.create({ collection: 'badges', overrideAccess: true, req, data: data as never })
      created++
    }
  }
  return { created, updated }
}
