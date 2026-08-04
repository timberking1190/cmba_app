import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Trophy, CheckCircle2, Clock } from 'lucide-react'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { ChallengeSubmitForm } from '@/components/athlete/ChallengeSubmitForm'
import { PhotoHero } from '@/components/media/PhotoHero'
import { EmptyState } from '@/components/feedback/EmptyState'
import type { Challenge, ChallengeSubmission, Team } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Skill Challenges | CMBA Connect' }

const nameOf = (rel: number | string | { title?: string; name?: string } | null | undefined): string =>
  rel && typeof rel === 'object' ? (rel.title ?? rel.name ?? '') : ''

export default async function AthleteChallengesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/athlete/challenges')
  const payload = await getPayloadClient()

  const [challengesRes, teamsRes, subsRes] = await Promise.all([
    payload.find({ collection: 'challenges', where: { active: { equals: true } }, limit: 50, depth: 0, overrideAccess: true, sort: 'title' }),
    payload.find({ collection: 'teams', limit: 300, depth: 0, overrideAccess: true, sort: 'name' }),
    payload.find({ collection: 'challenge-submissions', where: { user: { equals: user.id } }, depth: 1, limit: 50, overrideAccess: true, sort: '-submittedAt' }),
  ])
  const challenges = challengesRes.docs as Challenge[]
  const teams = (teamsRes.docs as Team[]).map((t) => ({ id: t.id, name: t.name }))
  const submissions = subsRes.docs as ChallengeSubmission[]

  return (
    <div>
      <PhotoHero image="youthOutdoor" eyebrow="Athlete Hub · Challenges" title="Skill" accent="Challenges"
        subtitle="Pick a challenge, log your result, and earn XP. Get a coach to verify it and it counts toward your badges." />

      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-10">
        <section>
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-4 flex items-center gap-2">
            <Trophy size={22} className="text-cmba-red" /> This week&apos;s challenges
          </h2>
          {challenges.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No active challenges right now"
              description="New skill challenges are posted through the season. Check back soon, or ask your coach what to work on next."
            />
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => (
                <div key={c.id} className="bg-cmba-black-card border border-white/12 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display font-bold text-white">{c.title}</div>
                      {c.skill && <span className="font-mono text-[10px] uppercase tracking-wider text-cmba-red">{c.skill}</span>}
                      {c.description && <p className="text-sm text-cmba-grey mt-1">{c.description}</p>}
                    </div>
                    <span className="font-mono text-[11px] text-cmba-grey-mid shrink-0">{c.xpReward ?? 100} XP</span>
                  </div>
                  {c.instructions && <p className="text-xs text-cmba-grey-light mt-2">{c.instructions}</p>}
                  <ChallengeSubmitForm challengeId={c.id} teams={teams} />
                </div>
              ))}
            </div>
          )}
        </section>

        {submissions.length > 0 && (
          <section>
            <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-3">My submissions</h2>
            <div className="space-y-2">
              {submissions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-cmba-black-card border border-white/12 p-3 text-sm">
                  {s.verified
                    ? <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                    : <Clock size={16} className="text-orange-400 shrink-0" />}
                  <span className="text-cmba-grey-light">{nameOf(s.challenge)}</span>
                  {s.result && <span className="font-mono text-xs text-cmba-grey-mid">{s.result}</span>}
                  <span className={`font-mono text-[10px] uppercase ml-auto ${s.verified ? 'text-green-400' : 'text-orange-400'}`}>
                    {s.verified ? 'Verified' : 'Pending verification'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
