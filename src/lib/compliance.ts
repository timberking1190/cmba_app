/*
 * Sport-development logic — the professional layer.
 *
 * Pure-ish helpers over the Payload Local API that compute, from REAL data:
 *  - getComplianceForUser: required vs held certifications, what's missing/expiring
 *  - getPathwayProgress: per-stage completion for the user's pathways
 *  - getUserProgress: real XP, level, and badges (replaces the static demo values)
 *
 * Display status is recomputed from expiry at read time so it is always current
 * even between runs of the Phase 2 refresh cron.
 */
import type { Payload, TypedUser, Where } from 'payload'

import type { Certification, CertificationType, Pathway } from '../payload-types'
import { computeCertStatus, daysUntil, type CertStatus } from './certStatus'
import { COACH_BADGES, REF_BADGES, getLevelForXP, type Badge } from './gamification'

type Role = NonNullable<TypedUser['roles']>[number]

export type UserLike = { id: number | string; roles?: Role[] | null }

const idOf = (rel: unknown): number | string | undefined => {
  if (rel == null) return undefined
  if (typeof rel === 'object') return (rel as { id: number | string }).id
  return rel as number | string
}

const liveStatus = (c: Certification): CertStatus =>
  computeCertStatus({ verifiedAt: c.verifiedAt, expiryDate: c.expiryDate })

const isHeldValid = (status: CertStatus) => status === 'valid' || status === 'expiring'

/** Fetch a user's certifications with their type populated. */
async function getUserCertifications(payload: Payload, userId: number | string): Promise<Certification[]> {
  const res = await payload.find({
    collection: 'certifications',
    where: { user: { equals: userId } },
    depth: 1,
    limit: 500,
    overrideAccess: true,
  })
  return res.docs
}

export type ComplianceItem = {
  type: CertificationType
  held: boolean
  status: CertStatus | 'missing'
  expiryDate?: string | null
  daysUntilExpiry?: number | null
  renewalUrl?: string | null
}

export type ComplianceResult = {
  overall: 'compliant' | 'attention' | 'non-compliant'
  requiredCount: number
  heldValidCount: number
  items: ComplianceItem[]
  missing: ComplianceItem[]
  expiring: ComplianceItem[]
}

export async function getComplianceForUser(
  payload: Payload,
  user: UserLike,
): Promise<ComplianceResult> {
  const roles = user.roles ?? []
  const requiredRes = await payload.find({
    collection: 'certification-types',
    where: {
      and: [{ isRequired: { equals: true } }, ...(roles.length ? [{ requiredForRoles: { in: roles } }] : [])],
    },
    limit: 200,
    overrideAccess: true,
  })
  const required = roles.length ? requiredRes.docs : []
  const certs = await getUserCertifications(payload, user.id)

  // Best held cert per type id.
  const bestByType = new Map<number | string, { cert: Certification; status: CertStatus }>()
  for (const c of certs) {
    const typeId = idOf(c.type)
    if (typeId == null) continue
    const status = liveStatus(c)
    const existing = bestByType.get(typeId)
    // prefer a valid/expiring cert over expired/pending
    if (!existing || (isHeldValid(status) && !isHeldValid(existing.status))) {
      bestByType.set(typeId, { cert: c, status })
    }
  }

  const items: ComplianceItem[] = required.map((type) => {
    const hit = bestByType.get(type.id)
    if (!hit || !isHeldValid(hit.status)) {
      return {
        type,
        held: false,
        status: hit ? hit.status : 'missing',
        renewalUrl: type.renewalUrl,
      }
    }
    return {
      type,
      held: true,
      status: hit.status,
      expiryDate: hit.cert.expiryDate,
      daysUntilExpiry: daysUntil(hit.cert.expiryDate),
      renewalUrl: type.renewalUrl,
    }
  })

  const missing = items.filter((i) => !i.held)
  const expiring = items.filter((i) => i.held && i.status === 'expiring')
  const heldValidCount = items.filter((i) => i.held).length

  const overall: ComplianceResult['overall'] =
    missing.length > 0 ? 'non-compliant' : expiring.length > 0 ? 'attention' : 'compliant'

  return { overall, requiredCount: required.length, heldValidCount, items, missing, expiring }
}

export type StageProgress = {
  name: string
  description?: string | null
  order: number
  xpReward: number
  requiredTypeIds: (number | string)[]
  heldCount: number
  requiredCount: number
  percent: number
  complete: boolean
}

export type PathwayProgress = {
  pathway: Pathway
  stages: StageProgress[]
  overallPercent: number
}

/** Per-stage completion for one or all pathways matching the user's audience. */
export async function getPathwayProgress(
  payload: Payload,
  user: UserLike,
  audience?: 'coach' | 'official',
): Promise<PathwayProgress[]> {
  const where: Where = audience ? { audience: { equals: audience } } : {}
  const pathwaysRes = await payload.find({
    collection: 'pathways',
    where,
    depth: 0,
    limit: 50,
    overrideAccess: true,
  })
  const certs = await getUserCertifications(payload, user.id)
  const validTypeIds = new Set<number | string>()
  for (const c of certs) {
    if (isHeldValid(liveStatus(c))) {
      const t = idOf(c.type)
      if (t != null) validTypeIds.add(t)
    }
  }

  return pathwaysRes.docs.map((pathway) => {
    const stages: StageProgress[] = (pathway.stages ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((s) => {
        const requiredTypeIds = (s.requiredCertificationTypes ?? [])
          .map(idOf)
          .filter((x): x is number | string => x != null)
        const heldCount = requiredTypeIds.filter((id) => validTypeIds.has(id)).length
        const requiredCount = requiredTypeIds.length
        const percent = requiredCount === 0 ? 100 : Math.round((heldCount / requiredCount) * 100)
        return {
          name: s.name,
          description: s.description,
          order: s.order ?? 0,
          xpReward: s.xpReward ?? 0,
          requiredTypeIds,
          heldCount,
          requiredCount,
          percent,
          complete: requiredCount > 0 && heldCount === requiredCount,
        }
      })
    const overallPercent = stages.length
      ? Math.round(stages.reduce((sum, s) => sum + s.percent, 0) / stages.length)
      : 0
    return { pathway, stages, overallPercent }
  })
}

export type UserProgress = {
  xp: number
  level: number
  levelTitle: string
  nextLevelXp: number
  progress: number
  completedStages: number
  earnedBadges: Badge[]
  lockedBadges: Badge[]
}

/** Real XP/level/badges from completed pathway stages (no static demo values). */
export async function getUserProgress(payload: Payload, user: UserLike): Promise<UserProgress> {
  const roles = user.roles ?? []
  const audience: 'coach' | 'official' | undefined = roles.includes('coach')
    ? 'coach'
    : roles.includes('official')
      ? 'official'
      : undefined
  const pathways = await getPathwayProgress(payload, user, audience)
  const completedStages = pathways.reduce((n, p) => n + p.stages.filter((s) => s.complete).length, 0)
  const xp = pathways.reduce(
    (sum, p) => sum + p.stages.filter((s) => s.complete).reduce((a, s) => a + s.xpReward, 0),
    0,
  )
  const lvl = getLevelForXP(xp)
  const badgeSet = audience === 'official' ? REF_BADGES : COACH_BADGES
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
