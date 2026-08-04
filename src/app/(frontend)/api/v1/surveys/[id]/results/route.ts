import { NextResponse } from 'next/server'

import { isAnyAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { aggregateResponses, type ResponseLike, type SurveyQuestion } from '@/lib/survey/results'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * GET /api/v1/surveys/[id]/results - aggregate, PII-free survey results. Visible to
 * members only when the survey has showResults on; admins can always read. Text
 * answers are never returned, only counts (see src/lib/survey/results.ts).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const survey = (await payload.findByID({ collection: 'season-surveys', id, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { title?: string; showResults?: boolean; questions?: SurveyQuestion[] }
    | null
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  if (!survey.showResults && !isAnyAdmin(user)) return NextResponse.json({ error: 'Results are not published.' }, { status: 403 })

  const res = await payload.find({ collection: 'survey-responses', where: { survey: { equals: id } }, limit: 5000, depth: 0, overrideAccess: true })
  const agg = aggregateResponses(survey.questions ?? [], res.docs as ResponseLike[])
  return NextResponse.json({ title: survey.title, ...agg }, { headers: { 'Cache-Control': 'no-store' } })
}
