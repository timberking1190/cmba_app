import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { mutationResponse } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { BASKETBALL_IQ_QUESTIONS, scoreIqAttempt, type IqQuestion } from '@/lib/basketballIqData'
import { XP_REWARDS } from '@/lib/gamification'
import { awardXp } from '@/lib/gamification/engine'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ledgerEnabled = () => process.env.FEATURE_GAMIFICATION_LEDGER === 'true'
const PASS_RATIO = 0.7

/* The quiz registry. Quizzes are code-defined content; the id maps to its bank. */
const QUIZZES: Record<string, IqQuestion[]> = { 'basketball-iq': BASKETBALL_IQ_QUESTIONS }

/*
 * POST /api/v1/quiz-attempts - score a Basketball IQ attempt. The body carries only
 * the chosen option indices; the score is computed SERVER-SIDE against the answer
 * key (the client can never submit its own score). On a pass the athlete earns
 * fun-only XP, once per quiz (dedupeKey quiz:<id>).
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: { quizId?: unknown; answers?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const quizId = typeof body.quizId === 'string' ? body.quizId : ''
  const questions = QUIZZES[quizId]
  if (!questions) return NextResponse.json({ error: 'Unknown quiz.' }, { status: 400 })
  if (!Array.isArray(body.answers)) return NextResponse.json({ error: 'Answers are required.' }, { status: 400 })
  const answers = (body.answers as unknown[]).map((a) => (typeof a === 'number' ? a : -1))

  const rl = await checkRateLimit(payload, { bucket: 'quiz', subject: String(user.id), limit: 30, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })

  return mutationResponse(payload, req, {
    scope: `quiz:${quizId}`,
    userId: String(user.id),
    method: 'POST',
    path: '/api/v1/quiz-attempts',
    logical: { quizId, answers },
    run: async () => {
      const { correct, total } = scoreIqAttempt(questions, answers)
      const passed = total > 0 && correct / total >= PASS_RATIO

      await payload.create({
        collection: 'quiz-attempts',
        overrideAccess: true,
        data: { user: user.id, quizId, score: correct, total, passed, takenAt: new Date().toISOString() } as never,
      })

      if (passed && ledgerEnabled()) {
        await awardXp(
          payload,
          { user: user.id, kind: 'quiz', amount: XP_REWARDS.completeQuiz, counts: 'fun_only', verified: false, source: { collection: 'quiz-attempts', docId: quizId }, dedupeKey: `quiz:${quizId}` },
        )
      }

      return { statusCode: 201, body: { ok: true, score: correct, total, passed } }
    },
  })
}
