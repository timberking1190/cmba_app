import { NextResponse } from 'next/server'

import { isAnyAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { detectOfficialWarnings } from '@/lib/conflicts/detect'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

const GAME_WINDOW_MS = (60 + 15) * 60_000 // default game length + buffer

/*
 * POST /api/v1/admin/games/:id/officials - assign or replace officials on a game
 * (admin). Runs the official double-booking check (blocking unless force) and the
 * over-max and ramp-below warnings. Creating a GameOfficials row audits it and
 * emails the official. Body: { assignments: [{ officialId, role }], force? }.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gameId = numericId(id)
  if (gameId == null) return NextResponse.json({ error: 'Invalid game id.' }, { status: 400 })

  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!isAnyAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { assignments?: Array<{ officialId: number | string; role?: string }>; force?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const assignments = Array.isArray(body.assignments) ? body.assignments : []
  if (!assignments.length) return NextResponse.json({ error: 'At least one assignment is required.' }, { status: 400 })

  const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 1, overrideAccess: true }).catch(() => null)) as
    | { startAt?: string; division?: { requiredRampLevel?: string } }
    | null
  if (!game || !game.startAt) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  const start = new Date(game.startAt).getTime()
  const requiredRamp = game.division?.requiredRampLevel ?? 'none'

  const created: Array<{ officialId: number | string }> = []
  const blocked: Array<{ officialId: number | string; reason: string }> = []
  const warnings: Array<{ officialId: number | string; kind: string; detail: string }> = []

  for (const a of assignments) {
    const officialId = a.officialId
    if (officialId == null) continue
    const official = (await payload.findByID({ collection: 'officials', id: officialId, depth: 0, overrideAccess: true }).catch(() => null)) as
      | { rampLevel?: string; maxGamesPerDay?: number }
      | null
    if (!official) {
      blocked.push({ officialId, reason: 'Official not found.' })
      continue
    }

    // Double-booking: the official's other assigned games on overlapping windows.
    const existing = await payload.find({ collection: 'game-officials', where: { official: { equals: officialId } }, depth: 1, limit: 200, overrideAccess: true })
    const sameDay: Array<{ gameId: string | number; startAt: string }> = []
    let doubleBooked = false
    for (const ga of existing.docs as Array<{ game?: { id?: number | string; startAt?: string } | number | string }>) {
      const g = ga.game
      const otherStart = g && typeof g === 'object' ? g.startAt : undefined
      const otherId = relId(g)
      if (!otherStart || String(otherId) === String(gameId)) continue
      const os = new Date(otherStart).getTime()
      sameDay.push({ gameId: otherId!, startAt: otherStart })
      if (Math.abs(os - start) < GAME_WINDOW_MS) doubleBooked = true
    }
    if (doubleBooked && !body.force) {
      blocked.push({ officialId, reason: 'This official is already assigned to an overlapping game.' })
      continue
    }

    // Warnings (over max per day, ramp below requirement) via the pure helper.
    const w = detectOfficialWarnings([
      ...sameDay.map((s) => ({ gameId: s.gameId, startAt: s.startAt, officialId, maxGamesPerDay: official.maxGamesPerDay })),
      { gameId, startAt: game.startAt, officialId, rampLevel: official.rampLevel, maxGamesPerDay: official.maxGamesPerDay, requiredRampLevel: requiredRamp },
    ])
    for (const x of w) warnings.push({ officialId, kind: x.kind, detail: x.detail })

    const role = ['referee1', 'referee2', 'scorekeeper', 'other'].includes(String(a.role)) ? a.role : 'referee1'
    const ga = await payload.create({ collection: 'game-officials', overrideAccess: false, user, data: { game: gameId, official: officialId, role } as never }).catch((err) => {
      blocked.push({ officialId, reason: (err as Error).message.includes('unique') ? 'Already assigned to this game.' : 'Could not assign.' })
      return null
    })
    if (ga) created.push({ officialId })
  }

  return NextResponse.json({ ok: true, created, blocked, warnings })
}
