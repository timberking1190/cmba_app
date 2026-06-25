import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { mutationResponse, numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/games/:id/dispute - a verified member of one of the teams raises a
 * review. Creating the dispute (gated by the Disputes beforeChange hook) sets the
 * game contested and sends the unsuppressable escalation to the scheduling admin.
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
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : ''
  if (!reason) return NextResponse.json({ error: 'A reason is required to request a review.' }, { status: 400 })

  const rl = await checkRateLimit(payload, { bucket: 'dispute', subject: String(user.id), limit: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })

  return mutationResponse(payload, req, {
    scope: `dispute:game:${gameId}`,
    userId: String(user.id),
    method: 'POST',
    path: `/api/v1/games/${gameId}/dispute`,
    logical: { reason },
    run: async () => {
      const created = await payload.create({
        collection: 'disputes',
        overrideAccess: false,
        user,
        data: { game: gameId, reason, status: 'open' } as never,
      })
      return { statusCode: 201, body: { ok: true, disputeId: created.id } }
    },
  })
}
