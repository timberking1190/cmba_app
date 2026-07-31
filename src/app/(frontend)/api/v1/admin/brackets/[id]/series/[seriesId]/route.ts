import { NextResponse } from 'next/server'

import { canManageScheduling } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { loadBracketView, overrideSeriesWinner } from '@/lib/brackets/manage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/admin/brackets/:id/series/:seriesId - set or clear the winner of
 * one matchup by hand.
 *
 * This is the correction path for the cases the automatic advancement cannot
 * decide: a double forfeit, a no contest, a tie that has to be broken, or a
 * scoring mistake that already carried a team forward. A winner set here is
 * marked as set by an administrator and is never overwritten by the automatic
 * advancement afterwards.
 *
 * Body: { winnerTeamId: number | null, reason }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; seriesId: string }> }) {
  const { id, seriesId } = await params
  const bracketId = numericId(id)
  const seriesNum = numericId(seriesId)
  if (bracketId == null || seriesNum == null) return NextResponse.json({ error: 'That matchup could not be found. Reload the bracket and try again.' }, { status: 400 })

  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'You are signed out. Sign in again to manage brackets.' }, { status: 401 })
  if (!canManageScheduling(user)) return NextResponse.json({ error: 'Your account cannot manage brackets. Ask a league administrator for scheduling access.' }, { status: 403 })

  let body: { winnerTeamId?: number | string | null; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'That request could not be read. Please try again.' }, { status: 400 })
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!reason) return NextResponse.json({ error: 'A reason is required so the change is recorded in the audit log. Say briefly why you are setting this by hand.' }, { status: 400 })

  const res = await overrideSeriesWinner(payload, { id: user.id, email: user.email }, { seriesId: seriesNum, winnerTeamId: body.winnerTeamId ?? null, reason })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ ok: true, bracket: await loadBracketView(payload, bracketId) })
}
