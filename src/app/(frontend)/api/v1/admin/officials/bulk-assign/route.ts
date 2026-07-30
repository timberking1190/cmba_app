import { NextResponse } from 'next/server'

import { isAnyAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { applyOfficialChanges, type ChangeResult } from '@/lib/officials/assignService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_GAMES_PER_CALL = 100

/*
 * POST /api/v1/admin/officials/bulk-assign - staff many games in one action.
 *
 * The assignment board sends the whole slate a scheduler has built up, so a
 * weekend of a hundred games can be staffed in one sitting instead of one game
 * at a time with a page reload between each. Each game is decided on its own
 * merits and reported on its own, so one blocked official never silently drops
 * the rest of the slate.
 *
 * Body: { changes: [{ gameId, assignments?, remove? }], force?, dryRun? }
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'You are signed out. Sign in again to assign officials.' }, { status: 401 })
  if (!isAnyAdmin(user)) {
    return NextResponse.json({ error: 'Your account cannot assign officials. Ask a league administrator for scheduling access.' }, { status: 403 })
  }

  let body: {
    changes?: Array<{ gameId: string | number; assignments?: Array<{ officialId: string | number; role?: string }>; remove?: Array<string | number> }>
    force?: boolean
    dryRun?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'That request could not be read. Please try again.' }, { status: 400 })
  }

  const changes = Array.isArray(body.changes) ? body.changes : []
  if (!changes.length) return NextResponse.json({ error: 'Nothing was selected. Choose an official for at least one game first.' }, { status: 400 })
  if (changes.length > MAX_GAMES_PER_CALL) {
    return NextResponse.json(
      { error: `This would change ${changes.length} games at once, over the limit of ${MAX_GAMES_PER_CALL}. Narrow the board with the filters and do it in a few passes.` },
      { status: 400 },
    )
  }

  const results: ChangeResult[] = []
  for (const c of changes) {
    if (c?.gameId == null) continue
    results.push(await applyOfficialChanges(payload, user as never, c.gameId, { assignments: c.assignments, remove: c.remove, force: body.force, dryRun: body.dryRun }))
  }

  const totals = results.reduce(
    (acc, r) => ({
      assigned: acc.assigned + r.created.length,
      removed: acc.removed + r.removed.length,
      blocked: acc.blocked + r.blocked.length,
      warnings: acc.warnings + r.warnings.length,
    }),
    { assigned: 0, removed: 0, blocked: 0, warnings: 0 },
  )

  return NextResponse.json({ ok: true, dryRun: Boolean(body.dryRun), results, totals })
}
