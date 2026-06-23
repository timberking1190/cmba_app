import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, BookOpen, ArrowRight } from 'lucide-react'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { computeCertStatus } from '@/lib/certStatus'
import { REF_BADGES, getLevelForXP } from '@/lib/gamification'
import { RefHubView } from '@/components/ref/RefHubView'
import { PhotoHero } from '@/components/media/PhotoHero'
import { PhotoBand } from '@/components/media/PhotoBand'
import { CourtLines } from '@/components/graphics/CourtLines'
import { CalgarySkyline } from '@/components/graphics/CalgarySkyline'
import type { PathwayLevel } from '@/components/coach/CoachPathwayView'
import type { Certification, CertificationType, Pathway } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Referee Dashboard | CMBA Connect' }

const idOf = (rel: unknown): number | string | undefined =>
  rel && typeof rel === 'object' ? (rel as { id: number | string }).id : (rel as number | string | undefined)

export default async function RefDashboard() {
  const user = await getCurrentUser()
  const payload = await getPayloadClient()

  const pathwaysRes = await payload.find({
    collection: 'pathways',
    where: { audience: { equals: 'official' } },
    depth: 2,
    limit: 10,
    overrideAccess: true,
  })
  const pathways = pathwaysRes.docs as Pathway[]

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

  const levels: PathwayLevel[] = []
  for (const p of pathways) {
    const stages = (p.stages ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    for (const s of stages) {
      const reqTypes = (s.requiredCertificationTypes ?? []) as (CertificationType | number | string)[]
      const requirements = reqTypes.map((rt) => {
        const type = typeof rt === 'object' ? rt : undefined
        const id = idOf(rt)
        return { name: type?.name ?? `Certification ${id}`, held: id != null && validTypeIds.has(id), renewalUrl: type?.renewalUrl ?? null }
      })
      const requiredCount = requirements.length
      const heldCount = requirements.filter((r) => r.held).length
      levels.push({
        name: s.name,
        description: s.description,
        order: s.order ?? 0,
        xpReward: s.xpReward ?? 0,
        requirements,
        heldCount,
        requiredCount,
        percent: requiredCount === 0 ? 0 : Math.round((heldCount / requiredCount) * 100),
        complete: requiredCount > 0 && heldCount === requiredCount,
      })
    }
  }

  const completedStages = levels.filter((l) => l.complete).length
  const xp = levels.filter((l) => l.complete).reduce((a, l) => a + l.xpReward, 0)
  const lvl = getLevelForXP(xp)
  const earnedBadges = REF_BADGES.slice(0, Math.min(completedStages, REF_BADGES.length))
  const lockedBadges = REF_BADGES.slice(earnedBadges.length)

  return (
    <div>
      {/* Hero */}
      <PhotoHero
        image="hoopNetSky"
        eyebrow="Referee Hub · Officiating"
        title="Referee"
        accent="Hub"
        subtitle="Signals, mechanics, rule interpretations, and certification tracking — everything you need to officiate CMBA games with confidence."
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/ref/quick-ref"
            className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
            <FileText size={16} /> Quick Ref Card
          </Link>
          <Link href="/ref/signals"
            className="inline-flex items-center gap-2 border border-white/30 text-white hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors backdrop-blur-sm">
            <BookOpen size={16} /> Signals Guide
          </Link>
        </div>
      </PhotoHero>

      {/* Live referee dashboard (functional UI — unchanged) */}
      <div className="relative">
        <CourtLines className="pointer-events-none absolute top-8 right-0 w-64 text-cmba-red/[0.06] hidden lg:block" />
        <RefHubView
          levels={levels}
          signedIn={Boolean(user)}
          userName={user?.preferredName || user?.fullName}
          xp={xp}
          level={lvl.level}
          levelTitle={lvl.title}
          nextLevelXp={lvl.nextLevelXp}
          progress={lvl.progress}
          earnedBadges={earnedBadges}
          lockedBadges={lockedBadges}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-12">
        {/* Photo band */}
        <PhotoBand
          image="swish"
          side="right"
          eyebrow="On the whistle"
          title="Own the floor"
        >
          <p>Great officiating is invisible when it&apos;s done right. Stay sharp on signals and mechanics, keep your RAMP certifications current, and earn XP as you advance through the pathway.</p>
        </PhotoBand>
      </div>

      {/* CTA */}
      <section className="relative bg-cmba-red overflow-hidden">
        <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-20 text-black/10" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-8 text-center">
          <p className="reveal text-white/90 text-sm mb-4">Ready to call your next game? Submit a report or brush up on the rules.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/game-report"
              className="inline-flex items-center gap-2 bg-white text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-2.5 hover:bg-cmba-grey-light transition-colors">
              Submit a Game Report <ArrowRight size={16} />
            </Link>
            <Link href="/rules"
              className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-2.5 hover:bg-white/10 transition-colors">
              Rules Library
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
