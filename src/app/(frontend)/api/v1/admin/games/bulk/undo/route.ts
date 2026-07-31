import { NextResponse } from 'next/server'

import { canManageScheduling } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { adminOverride, setPublishState, writeAudit } from '@/lib/games/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type UndoRow = { gameId: string | number; status: string; publishState: string; startAt: string; venueId: string | number | null; courtId: string | number | null }

/*
 * POST /api/v1/admin/games/bulk/undo - put a bulk edit back the way it was.
 *
 * Uses the same bounded window as the CSV importer. An import's undo deletes the
 * rows it created; a bulk edit's undo restores each game's previous values, so
 * nothing is ever deleted here. Every restore runs through the audited games
 * service, so the undo itself is in the audit log too.
 *
 * Body: { batchId }
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'You are signed out. Sign in again to undo this.' }, { status: 401 })
  if (!canManageScheduling(user)) return NextResponse.json({ error: 'Your account cannot change games. Ask a league administrator for scheduling access.' }, { status: 403 })

  let body: { batchId?: string | number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'That request could not be read. Please try again.' }, { status: 400 })
  }
  if (body.batchId == null) return NextResponse.json({ error: 'There is nothing to undo.' }, { status: 400 })

  const batch = (await payload.findByID({ collection: 'import-batches', id: body.batchId, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { status?: string; bulkAction?: string; bulkUndo?: UndoRow[]; undoExpiresAt?: string }
    | null
  if (!batch) return NextResponse.json({ error: 'That change could not be found, so there is nothing to undo.' }, { status: 404 })
  if (!batch.bulkAction || !Array.isArray(batch.bulkUndo)) {
    return NextResponse.json({ error: 'That was a file import, not a bulk edit. Undo it from the import screen instead.' }, { status: 400 })
  }
  if (batch.status === 'undone') return NextResponse.json({ error: 'That change has already been undone.' }, { status: 400 })
  if (batch.undoExpiresAt && new Date(batch.undoExpiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: 'The undo window for this change has passed. Change the games back on the schedule screen instead.' }, { status: 400 })
  }

  const actor = { id: user.id, email: user.email }
  const reason = `Undo of the bulk ${batch.bulkAction}`
  let restored = 0
  let failed = 0

  for (const row of batch.bulkUndo) {
    try {
      await setPublishState(payload, row.gameId, actor, row.publishState === 'published' ? 'published' : 'draft')
      await adminOverride(payload, row.gameId, actor, { status: row.status, startAt: row.startAt, venue: row.venueId, court: row.courtId }, reason)
      restored++
    } catch {
      failed++
    }
  }

  await payload
    .update({ collection: 'import-batches', id: body.batchId, overrideAccess: true, data: { status: 'undone', undoneBy: actor.id, undoneAt: new Date().toISOString() } as never })
    .catch(() => null)
  await writeAudit(payload, { actor, action: `game.bulk.undo`, entity: 'import-batches', entityId: String(body.batchId), after: { restored, failed }, reason })

  return NextResponse.json({
    ok: true,
    restored,
    failed,
    message: `${restored} game${restored === 1 ? '' : 's'} put back the way they were.${failed ? ` ${failed} could not be restored, so check those on the schedule screen.` : ''}`,
  })
}
