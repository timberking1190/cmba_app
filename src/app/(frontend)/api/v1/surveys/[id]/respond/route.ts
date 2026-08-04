import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import type { SurveyQuestion } from '@/lib/survey/results'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/surveys/[id]/respond - a signed-in member answers an open survey once.
 * Validates answers against the survey questions, dedupes one response per member,
 * and writes via overrideAccess (survey-responses denies direct writes).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const survey = (await payload.findByID({ collection: 'season-surveys', id, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { status?: string; questions?: SurveyQuestion[] }
    | null
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  if (survey.status !== 'open') return NextResponse.json({ error: 'This survey is not open.' }, { status: 400 })

  let body: { answers?: Array<{ key?: string; value?: string }> }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const questions = survey.questions ?? []
  const byKey = new Map(questions.map((q) => [q.key, q]))
  const answers: Array<{ key: string; value: string }> = []
  for (const a of body.answers ?? []) {
    const q = a?.key ? byKey.get(a.key) : undefined
    if (!q || a.value == null) continue
    const value = String(a.value).slice(0, 1000).trim()
    if (!value) continue
    if (q.type === 'rating') {
      const n = Number(value)
      if (!Number.isInteger(n) || n < 1 || n > 5) continue
    } else if (q.type === 'choice') {
      const labels = (q.options ?? []).map((o) => o.label)
      if (!labels.includes(value)) continue
    }
    answers.push({ key: q.key, value })
  }
  if (answers.length === 0) return NextResponse.json({ error: 'Please answer at least one question.' }, { status: 400 })

  // One response per member per survey.
  const existing = await payload.find({
    collection: 'survey-responses',
    where: { and: [{ survey: { equals: id } }, { respondent: { equals: user.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.docs.length) return NextResponse.json({ error: 'You have already answered this survey.' }, { status: 409 })

  await payload.create({
    collection: 'survey-responses',
    overrideAccess: true,
    data: { survey: id, respondent: user.id, answers, submittedAt: new Date().toISOString() } as never,
  })
  return NextResponse.json({ ok: true })
}
