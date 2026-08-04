import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ClipboardList, CheckCircle2, BarChart3 } from 'lucide-react'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { aggregateResponses, type ResponseLike, type SurveyQuestion } from '@/lib/survey/results'
import { SurveyForm, type FormQuestion } from '@/components/SurveyForm'
import { EmptyState } from '@/components/feedback/EmptyState'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Season Survey | CMBA Connect' }

type Survey = { id: string | number; title: string; intro?: string | null; showResults?: boolean | null; questions?: SurveyQuestion[] | null }

export default async function SurveyPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/survey')
  const payload = await getPayloadClient()

  const open = await payload.find({ collection: 'season-surveys', where: { status: { equals: 'open' } }, sort: '-createdAt', limit: 1, depth: 0, overrideAccess: true })
  const survey = open.docs[0] as Survey | undefined

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-12 lg:pt-20 pb-20">
      <div className="label-xs text-cmba-grey mb-3">Season Survey</div>
      <h1 className="font-display font-black uppercase leading-[0.9] tracking-tighter2 text-[clamp(32px,8vw,56px)] mb-6">
        Tell us how <span className="text-stroke">it went</span>
      </h1>

      {!survey ? (
        <EmptyState icon={ClipboardList} title="No survey open right now" description="When a season wraps up we post a short survey here. Check back at the end of the season." />
      ) : (
        <SurveyBody payload={payload} survey={survey} userId={user.id} />
      )}
    </div>
  )
}

async function SurveyBody({ payload, survey, userId }: { payload: Awaited<ReturnType<typeof getPayloadClient>>; survey: Survey; userId: string | number }) {
  const questions = (survey.questions ?? []) as SurveyQuestion[]

  const mine = await payload.find({
    collection: 'survey-responses',
    where: { and: [{ survey: { equals: survey.id } }, { respondent: { equals: userId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const responded = mine.docs.length > 0

  let aggregate: ReturnType<typeof aggregateResponses> | null = null
  if (survey.showResults || responded) {
    const all = await payload.find({ collection: 'survey-responses', where: { survey: { equals: survey.id } }, limit: 5000, depth: 0, overrideAccess: true })
    aggregate = aggregateResponses(questions, all.docs as ResponseLike[])
  }

  return (
    <div className="space-y-8">
      {survey.intro && <p className="text-sm text-cmba-grey leading-relaxed">{survey.intro}</p>}

      {responded ? (
        <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/30 p-4">
          <CheckCircle2 size={18} className="text-green-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-cmba-grey-light">Thanks for your feedback. You have already answered this survey.</p>
        </div>
      ) : (
        <SurveyForm surveyId={String(survey.id)} questions={questions as FormQuestion[]} />
      )}

      {survey.showResults && aggregate && (
        <section>
          <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-cmba-red" aria-hidden="true" /> Results so far ({aggregate.total})
          </h2>
          <div className="space-y-5">
            {aggregate.questions.map((q) => (
              <div key={q.key} className="bg-cmba-black-card border border-white/12 p-4">
                <div className="font-display font-bold text-sm text-white mb-2">{q.prompt}</div>
                {q.type === 'rating' && (
                  <>
                    <div className="font-mono text-[11px] text-cmba-grey-mid mb-2">Average {q.average ?? 'n/a'} from {q.count} answers</div>
                    <Bars dist={q.distribution ?? {}} order={['1', '2', '3', '4', '5']} />
                  </>
                )}
                {q.type === 'choice' && <Bars dist={q.distribution ?? {}} order={Object.keys(q.distribution ?? {})} />}
                {q.type === 'text' && <div className="font-mono text-[11px] text-cmba-grey-mid">{q.count} written responses (kept private)</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Bars({ dist, order }: { dist: Record<string, number>; order: string[] }) {
  const max = Math.max(1, ...Object.values(dist))
  return (
    <div className="space-y-1.5">
      {order.map((k) => (
        <div key={k} className="flex items-center gap-2">
          <div className="w-24 shrink-0 text-[11px] text-cmba-grey-light truncate">{k}</div>
          <div className="flex-1 h-3 bg-cmba-grey-dark/20 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cmba-red to-cmba-red-dark" style={{ width: `${Math.round(((dist[k] ?? 0) / max) * 100)}%` }} />
          </div>
          <div className="w-8 shrink-0 text-right font-mono text-[11px] text-cmba-grey-mid">{dist[k] ?? 0}</div>
        </div>
      ))}
    </div>
  )
}
