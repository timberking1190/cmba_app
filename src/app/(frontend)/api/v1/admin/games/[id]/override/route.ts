import { NextResponse } from 'next/server'

import { clubIdOf, isAnyAdmin, isSuperAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { isFinalized } from '@/lib/gameStateMachine'
import { adminOverride, applyForfeit, setPublishState } from '@/lib/games/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

/*
 * POST /api/v1/admin/games/:id/override - the only path that edits a finalized game.
 * A finalized game is SUPER ADMIN only; a club admin is scoped to games involving
 * their own club and cannot touch a finalized game. A reason is always required and
 * every edit is audited. Body: { patch?, forfeit?, publishState?, reason }.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gameId = numericId(id)
  if (gameId == null) return NextResponse.json({ error: 'Invalid game id.' }, { status: 400 })

  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!isAnyAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { patch?: Record<string, unknown>; forfeit?: { outcome?: string; forfeitingTeam?: number | string | null }; publishState?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!reason) return NextResponse.json({ error: 'A reason is required for an admin change.' }, { status: 400 })

  const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 1, overrideAccess: true }).catch(() => null)) as
    | { status: string; homeTeam?: { club?: unknown }; awayTeam?: { club?: unknown } }
    | null
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const finalized = isFinalized(game.status as never)
  if (finalized && !isSuperAdmin(user)) {
    return NextResponse.json({ error: 'Only a super admin can edit a finalized game.' }, { status: 403 })
  }
  if (!isSuperAdmin(user)) {
    const club = clubIdOf(user)
    const homeClub = relId(game.homeTeam?.club)
    const awayClub = relId(game.awayTeam?.club)
    const onClub = club != null && (String(club) === String(homeClub) || String(club) === String(awayClub))
    if (!onClub) return NextResponse.json({ error: 'You can only manage games involving your own club.' }, { status: 403 })
  }

  const actor = { id: user.id, email: user.email }

  if (body.forfeit) {
    const outcome = body.forfeit.outcome
    const valid = ['home_forfeit', 'away_forfeit', 'double_forfeit', 'no_contest']
    if (!outcome || !valid.includes(outcome)) return NextResponse.json({ error: 'A valid forfeit outcome is required.' }, { status: 400 })
    const res = await applyForfeit(payload, gameId, actor, outcome as never, body.forfeit.forfeitingTeam ?? null, reason)
    if (!res.ok) return NextResponse.json({ error: res.error ?? 'Could not apply the forfeit.' }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (body.publishState === 'published' || body.publishState === 'draft') {
    await setPublishState(payload, gameId, actor, body.publishState)
  }

  if (body.patch && Object.keys(body.patch).length) {
    const allowed = ['status', 'homeScore', 'awayScore', 'startAt', 'venue', 'court']
    const patch: Record<string, unknown> = {}
    for (const k of allowed) if (k in body.patch) patch[k] = body.patch[k]
    if (Object.keys(patch).length) await adminOverride(payload, gameId, actor, patch, reason)
  }

  return NextResponse.json({ ok: true })
}
