import { NextResponse } from 'next/server'

import { isAnyAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { detectConflicts, type ConflictGame } from '@/lib/conflicts/detect'
import { DEFAULT_BUFFER, DEFAULT_GAME_LENGTH } from '@/lib/csvImport/commit'
import { publishedConflictGames } from '@/lib/csvImport/lookups'
import { assignSlots, generateRoundRobin, type Slot } from '@/lib/roundRobin/generate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

/*
 * POST /api/v1/admin/schedule/generate - generate a round robin for a division and
 * run the same conflict preview as the importer. Body:
 * { divisionId, double?, slots: [{start, venueId, courtId}], blackoutDates?,
 *   commit?, acknowledged?, publishMode? }. With commit, creates the games (and the
 * byes) in one transaction after the conflict gate.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!isAnyAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { divisionId?: number | string; double?: boolean; slots?: Slot[]; blackoutDates?: string[]; commit?: boolean; acknowledged?: boolean; publishMode?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (body.divisionId == null) return NextResponse.json({ error: 'A divisionId is required.' }, { status: 400 })

  const division = (await payload.findByID({ collection: 'divisions', id: body.divisionId, depth: 0, overrideAccess: true }).catch(() => null)) as { season?: unknown } | null
  if (!division) return NextResponse.json({ error: 'Division not found' }, { status: 404 })
  const seasonId = relId(division.season)

  const teamsRes = await payload.find({ collection: 'teams', where: { and: [{ division: { equals: body.divisionId } }, { active: { not_equals: false } }] }, limit: 1000, depth: 0, overrideAccess: true })
  const teamIds = teamsRes.docs.map((t) => t.id)
  if (teamIds.length < 2) return NextResponse.json({ error: 'A division needs at least two teams to generate a schedule.' }, { status: 400 })

  const fixtures = generateRoundRobin(teamIds, { double: Boolean(body.double) })
  const { scheduled, unplaceable } = assignSlots(fixtures, body.slots ?? [], { blackoutDates: body.blackoutDates })

  const candidates: ConflictGame[] = scheduled.map((s, i) => ({ id: `gen-${i}`, startAt: s.slot.start, venueId: s.slot.venueId, courtId: s.slot.courtId, homeTeamId: s.fixture.homeTeamId!, awayTeamId: s.fixture.awayTeamId! }))
  const published = await publishedConflictGames(payload, seasonId)
  const conflicts = detectConflicts(candidates, published, { gameLengthMinutes: DEFAULT_GAME_LENGTH, bufferMinutes: DEFAULT_BUFFER })

  const preview = { proposed: scheduled.length, byes: fixtures.filter((f) => f.isBye).length, unplaceable: unplaceable.length, conflicts }

  if (!body.commit) return NextResponse.json({ ok: true, ...preview })

  if (conflicts.length && !body.acknowledged) {
    return NextResponse.json({ ok: false, error: 'There are conflicts that must be acknowledged before creating the schedule.', ...preview }, { status: 400 })
  }

  const publishMode = body.publishMode === 'published' ? 'published' : 'draft'
  const batch = await payload.create({ collection: 'import-batches', overrideAccess: true, data: { kind: 'games', status: 'pending', publishMode, committedBy: user.id } as never })
  const created: Array<{ collection: string; id: string | number }> = []
  const transactionID = await payload.db.beginTransaction?.()
  const txReq = (transactionID != null ? { transactionID } : undefined) as never

  try {
    for (const s of scheduled) {
      const g = await payload.create({ collection: 'games', overrideAccess: true, req: txReq, data: { season: seasonId, division: body.divisionId, homeTeam: s.fixture.homeTeamId, awayTeam: s.fixture.awayTeamId, venue: s.slot.venueId, court: s.slot.courtId, startAt: s.slot.start, status: 'scheduled', publishState: publishMode, importBatch: batch.id } as never })
      created.push({ collection: 'games', id: g.id })
    }
    for (const f of fixtures.filter((x) => x.isBye)) {
      const g = await payload.create({ collection: 'games', overrideAccess: true, req: txReq, data: { season: seasonId, division: body.divisionId, homeTeam: f.byeTeamId, awayTeam: f.byeTeamId, isBye: true, startAt: new Date().toISOString(), status: 'scheduled', publishState: publishMode, importBatch: batch.id } as never })
      created.push({ collection: 'games', id: g.id })
    }
    if (transactionID != null) await payload.db.commitTransaction?.(transactionID)
  } catch (err) {
    if (transactionID != null) await payload.db.rollbackTransaction?.(transactionID)
    payload.logger.error(`[generate] failed (batch ${batch.id} pending): ${String(err)}`)
    return NextResponse.json({ error: 'Schedule creation failed and was rolled back.' }, { status: 500 })
  }

  await payload.update({ collection: 'import-batches', id: batch.id, overrideAccess: true, data: { status: 'committed', createdRecords: created, committedAt: new Date().toISOString(), undoExpiresAt: new Date(Date.now() + 60 * 60_000).toISOString(), undoWindowMinutes: 60, counts: { imported: created.length } } as never })
  await payload.create({ collection: 'audit-log', overrideAccess: true, data: { actor: user.id, action: 'schedule.generate', entity: 'import-batches', entityId: String(batch.id), after: { division: body.divisionId, games: created.length, publishMode }, at: new Date().toISOString() } as never })

  return NextResponse.json({ ok: true, ...preview, committed: true, batchId: batch.id, created: created.length })
}
