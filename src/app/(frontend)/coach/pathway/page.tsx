import type { Metadata } from 'next'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { computeCertStatus } from '@/lib/certStatus'
import { COACH_BADGES, getLevelForXP } from '@/lib/gamification'
import { CoachPathwayView, type PathwayLevel } from '@/components/coach/CoachPathwayView'
import type { Certification, CertificationType, Pathway } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Coach Certification Pathway | CMBA Connect' }

const idOf = (rel: unknown): number | string | undefined =>
  rel && typeof rel === 'object' ? (rel as { id: number | string }).id : (rel as number | string | undefined)

export default async function CoachPathwayPage() {
  const user = await getCurrentUser()
  const payload = await getPayloadClient()

  // Coach pathway(s) with cert types populated (for names + renewal links).
  const pathwaysRes = await payload.find({
    collection: 'pathways',
    where: { audience: { equals: 'coach' } },
    depth: 2,
    limit: 10,
    overrideAccess: true,
  })
  const pathways = pathwaysRes.docs as Pathway[]

  // The signed-in user's valid certification type ids (real progress source).
  const validTypeIds = new Set<number | string>()
  if (user) {
    const certRes = await payload.find({
      collection: 'certifications',
      where: { user: { equals: user.id } },
      depth: 0,
      limit: 500,
      overrideAccess: true,
    })
    for (const c of certRes.docs as Certification[]) {
      const status = computeCertStatus({ verifiedAt: c.verifiedAt, expiryDate: c.expiryDate })
      if (status === 'valid' || status === 'expiring') {
        const t = idOf(c.type)
        if (t != null) validTypeIds.add(t)
      }
    }
  }

  // Flatten the coach pathway stages into display levels with real completion.
  const levels: PathwayLevel[] = []
  for (const p of pathways) {
    const stages = (p.stages ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    for (const s of stages) {
      const reqTypes = (s.requiredCertificationTypes ?? []) as (CertificationType | number | string)[]
      const requirements = reqTypes.map((rt) => {
        const type = typeof rt === 'object' ? rt : undefined
        const id = idOf(rt)
        return {
          name: type?.name ?? `Certification ${id}`,
          held: id != null && validTypeIds.has(id),
          renewalUrl: type?.renewalUrl ?? null,
        }
      })
      const requiredCount = requirements.length
      const heldCount = requirements.filter((r) => r.held).length
      const percent = requiredCount === 0 ? 0 : Math.round((heldCount / requiredCount) * 100)
      levels.push({
        name: s.name,
        description: s.description,
        order: s.order ?? 0,
        xpReward: s.xpReward ?? 0,
        requirements,
        heldCount,
        requiredCount,
        percent,
        complete: requiredCount > 0 && heldCount === requiredCount,
      })
    }
  }

  const completedStages = levels.filter((l) => l.complete).length
  const xp = levels.filter((l) => l.complete).reduce((a, l) => a + l.xpReward, 0)
  const lvl = getLevelForXP(xp)
  const earnedBadges = COACH_BADGES.slice(0, Math.min(completedStages, COACH_BADGES.length))
  const lockedBadges = COACH_BADGES.slice(earnedBadges.length)

  return (
    <CoachPathwayView
      levels={levels}
      signedIn={Boolean(user)}
      xp={xp}
      level={lvl.level}
      levelTitle={lvl.title}
      nextLevelXp={lvl.nextLevelXp}
      progress={lvl.progress}
      earnedBadges={earnedBadges}
      lockedBadges={lockedBadges}
    />
  )
}
