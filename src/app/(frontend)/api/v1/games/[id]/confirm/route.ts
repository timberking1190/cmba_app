import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { mutationResponse, numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/games/:id/confirm - the opposing rep confirms or disputes a report.
 * The four-rule gate (not self, opposing side, not dual membership, photo
 * acknowledged) lives in the Confirmations beforeChange hook. Confirming finalizes
 * the game through the conditional version+status update; disputing opens a review.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gameId = numericId(id)
  if (gameId == null) return NextResponse.json({ error: 'Invalid game id.' }, { status: 400 })

  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (body.scoreReportId == null) return NextResponse.json({ error: 'scoreReportId is required.' }, { status: 400 })
  const decision = body.decision === 'disputed' ? 'disputed' : 'confirmed'

  const rl = await checkRateLimit(payload, { bucket: 'confirm', subject: String(user.id), limit: 30, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })

  const logical = { scoreReportId: body.scoreReportId, decision }

  return mutationResponse(payload, req, {
    scope: `confirm:game:${gameId}`,
    userId: String(user.id),
    method: 'POST',
    path: `/api/v1/games/${gameId}/confirm`,
    logical,
    run: async () => {
      const created = await payload.create({
        collection: 'confirmations',
        overrideAccess: false,
        user,
        data: {
          scoreReport: body.scoreReportId as number,
          decision,
          photoAcknowledged: Boolean(body.photoAcknowledged),
          notes: (body.notes as string) ?? undefined,
          idempotencyKey: req.headers.get('idempotency-key') ?? undefined,
        } as never,
      })
      const game = await payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true }).catch(() => null)
      return { statusCode: 201, body: { ok: true, confirmationId: created.id, gameStatus: (game as { status?: string } | null)?.status ?? null } }
    },
  })
}
