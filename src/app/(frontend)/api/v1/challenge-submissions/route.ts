import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { mutationResponse } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/challenge-submissions - an athlete logs a challenge attempt. Created
 * in the user's auth context (overrideAccess:false) so the ChallengeSubmissions
 * beforeChange hook pins the owner and forces verified=false; the afterChange hook
 * grants fun-only participation XP (gated). Idempotency-Key dedupes a retry.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const challenge = Number(body.challenge)
  if (!Number.isFinite(challenge)) return NextResponse.json({ error: 'A challenge is required.' }, { status: 400 })

  const rl = await checkRateLimit(payload, { bucket: 'challenge-submit', subject: String(user.id), limit: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })

  return mutationResponse(payload, req, {
    scope: `challenge-submit:${challenge}`,
    userId: String(user.id),
    method: 'POST',
    path: '/api/v1/challenge-submissions',
    logical: { challenge, team: body.team, result: body.result },
    run: async () => {
      const created = await payload.create({
        collection: 'challenge-submissions',
        overrideAccess: false,
        user,
        data: {
          challenge,
          team: body.team ? Number(body.team) : undefined,
          result: typeof body.result === 'string' ? body.result : undefined,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
        } as never,
      })
      return { statusCode: 201, body: { ok: true, submissionId: created.id } }
    },
  })
}
