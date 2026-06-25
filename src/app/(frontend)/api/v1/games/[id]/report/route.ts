import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { mutationResponse, numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/games/:id/report - a verified rep submits a score. The verified-rep
 * gate lives in the ScoreReports beforeChange hook (we create the report in the
 * user's auth context with overrideAccess:false so the hook runs). Idempotency-Key
 * is required so a retry from a weak gym connection cannot double count.
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

  const rl = await checkRateLimit(payload, { bucket: 'report', subject: String(user.id), limit: 30, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })

  const logical = { submittedForTeam: body.submittedForTeam, homeScore: body.homeScore, awayScore: body.awayScore }

  return mutationResponse(payload, req, {
    scope: `report:game:${gameId}`,
    userId: String(user.id),
    method: 'POST',
    path: `/api/v1/games/${gameId}/report`,
    logical,
    run: async () => {
      const created = await payload.create({
        collection: 'score-reports',
        overrideAccess: false,
        user,
        data: {
          game: gameId,
          submittedForTeam: body.submittedForTeam as number,
          homeScore: Number(body.homeScore),
          awayScore: Number(body.awayScore),
          periodScores: body.periodScores as never,
          scoresheetPhoto: (body.scoresheetFileId as number) ?? undefined,
          notes: (body.notes as string) ?? undefined,
          source: body.source === 'mobile' ? 'mobile' : 'web',
          idempotencyKey: req.headers.get('idempotency-key') ?? undefined,
        } as never,
      })
      const game = await payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true }).catch(() => null)
      return { statusCode: 201, body: { ok: true, scoreReportId: created.id, gameStatus: (game as { status?: string } | null)?.status ?? null } }
    },
  })
}
