import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const rel = (r: unknown, ...f: string[]) => (r && typeof r === 'object' ? f.map((k) => (r as Record<string, string>)[k]).find(Boolean) ?? '' : '')

/*
 * GET /api/v1/games/:id - a single game with officials. Returns 404 (not 403) for a
 * non-participant draft, so the existence of a draft game is not leaked. The Games
 * read access scopes visibility (published, or my own team's draft).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gameId = numericId(id)
  if (gameId == null) return NextResponse.json({ error: 'Invalid game id.' }, { status: 400 })

  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)

  const found = await payload.find({ collection: 'games', where: { id: { equals: gameId } }, depth: 1, limit: 1, overrideAccess: false, user: user ?? undefined })
  const g = found.docs[0] as unknown as Record<string, unknown> | undefined
  if (!g) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const officials = await payload.find({ collection: 'game-officials', where: { game: { equals: gameId } }, depth: 1, limit: 10, overrideAccess: true })

  return NextResponse.json({
    id: g.id,
    startAt: g.startAt,
    division: rel(g.division, 'displayLabel', 'fullPath'),
    homeTeam: rel(g.homeTeam, 'name'),
    awayTeam: rel(g.awayTeam, 'name'),
    venue: rel(g.venue, 'name'),
    court: rel(g.court, 'name'),
    status: g.status,
    publishState: g.publishState,
    homeScore: g.homeScore ?? null,
    awayScore: g.awayScore ?? null,
    officials: officials.docs.map((o) => ({ name: rel((o as unknown as Record<string, unknown>).official, 'name'), role: (o as { role?: string }).role })),
  })
}
