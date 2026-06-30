import type { Metadata } from 'next'
import type { Where } from 'payload'
import { redirect } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'

import { isAnyAdmin } from '@/access/index'
import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { privacySafeName } from '@/lib/displayName'
import { getVerifiedTeamIdsForRole } from '@/lib/teamAccess'
import { ChallengeVerifyButton } from '@/components/coach/ChallengeVerifyButton'
import { PhotoHero } from '@/components/media/PhotoHero'
import type { ChallengeSubmission, Team, User } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Verify Challenges | CMBA Connect' }

const nameOf = (rel: number | string | { title?: string; name?: string } | null | undefined): string =>
  rel && typeof rel === 'object' ? (rel.title ?? rel.name ?? '') : ''

export default async function CoachVerifyChallengesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/coach/challenges')
  const payload = await getPayloadClient()

  const admin = isAnyAdmin(user)
  const coachTeams = admin ? [] : await getVerifiedTeamIdsForRole(payload, user.id, 'coach')
  const isCoach = admin || coachTeams.length > 0

  const where: Where = admin
    ? { verified: { equals: false } }
    : { and: [{ verified: { equals: false } }, { team: { in: coachTeams } }] }

  const subsRes = isCoach
    ? await payload.find({ collection: 'challenge-submissions', where, depth: 2, limit: 100, overrideAccess: true, sort: '-submittedAt' })
    : { docs: [] as ChallengeSubmission[] }
  const submissions = subsRes.docs as ChallengeSubmission[]

  return (
    <div>
      <PhotoHero image="swish" eyebrow="Coach Hub · Verify" title="Challenge" accent="Verification"
        subtitle="Confirm the skill challenges your athletes have logged. Verifying turns a self-reported result into earned, meaningful XP." />

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {!isCoach ? (
          <p className="text-sm text-cmba-grey">This page is for verified coaches. If you coach a team and do not see submissions, ask an admin to verify your coach membership.</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-cmba-grey">No submissions are waiting for verification right now.</p>
        ) : (
          <>
            <h2 className="font-display font-black text-xl text-white uppercase tracking-tight mb-4 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-cmba-red" /> Pending verification ({submissions.length})
            </h2>
            <div className="space-y-2">
              {submissions.map((s) => {
                const athlete = (s.user && typeof s.user === 'object' ? s.user : null) as User | null
                return (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 bg-cmba-black-card border border-white/12 p-4">
                    <div className="min-w-0">
                      <div className="font-display font-bold text-sm text-white">{nameOf(s.challenge)}</div>
                      <div className="font-mono text-[11px] text-cmba-grey-mid">
                        {athlete ? privacySafeName(athlete) : 'Athlete'}
                        {s.result ? ` · ${s.result}` : ''}
                        {s.team && typeof s.team === 'object' ? ` · ${(s.team as Team).name}` : ''}
                      </div>
                    </div>
                    <span className="ml-auto"><ChallengeVerifyButton submissionId={s.id} /></span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
