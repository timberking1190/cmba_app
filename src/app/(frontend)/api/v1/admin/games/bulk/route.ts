import { NextResponse } from 'next/server'

import { isAnyAdmin, isSuperAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { adminOverride, setPublishState, writeAudit } from '@/lib/games/service'
import { planBulk, type BulkAction, type BulkTargetGame } from '@/lib/manage/bulkOps'
import { notifyGameChanged } from '@/lib/manage/notify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_GAMES = 300
const UNDO_WINDOW_MINUTES = 60

const relId = (r: unknown): string | number | null =>
  r == null ? null : typeof r === 'object' ? ((r as { id: string | number }).id ?? null) : (r as string | number)
const relName = (r: unknown, ...keys: string[]): string =>
  r && typeof r === 'object' ? (keys.map((k) => (r as Record<string, string>)[k]).find(Boolean) ?? '') : ''

/*
 * POST /api/v1/admin/games/bulk - change many games in one action.
 *
 * dryRun: true returns the plan and writes nothing, so the console can show which
 * games change, which are left alone and why, and which teams are affected,
 * BEFORE anyone commits to it.
 *
 * A real run records an undo manifest holding each game's previous values, so the
 * whole batch can be taken back for an hour, the same window the CSV importer
 * uses. Every batch writes one audit row for the batch plus the per game audit
 * rows the games service already writes.
 *
 * Body: { action, gameIds, reason, newDate?, newVenueId?, dryRun? }
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'You are signed out. Sign in again to make this change.' }, { status: 401 })
  if (!isAnyAdmin(user)) return NextResponse.json({ error: 'Your account cannot change games. Ask a league administrator for scheduling access.' }, { status: 403 })

  let body: { action?: BulkAction; gameIds?: Array<string | number>; reason?: string; newDate?: string; newVenueId?: string | number; dryRun?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'That request could not be read. Please try again.' }, { status: 400 })
  }

  const gameIds = Array.isArray(body.gameIds) ? body.gameIds : []
  if (!gameIds.length) return NextResponse.json({ error: 'Nothing was selected. Tick the games you want to change first.' }, { status: 400 })
  if (gameIds.length > MAX_GAMES) {
    return NextResponse.json(
      { error: `This would change ${gameIds.length} games at once, over the limit of ${MAX_GAMES}. Narrow the list with the filters and do it in a few passes.` },
      { status: 400 },
    )
  }
  const action = body.action
  if (!action) return NextResponse.json({ error: 'Choose what to do with the selected games first.' }, { status: 400 })

  const res = await payload.find({ collection: 'games', where: { id: { in: gameIds } } as never, depth: 1, limit: MAX_GAMES, overrideAccess: true })
  const docs = res.docs as unknown as Array<Record<string, unknown>>

  const targets: BulkTargetGame[] = docs.map((g) => ({
    id: g.id as string | number,
    startAt: String(g.startAt ?? ''),
    status: String(g.status ?? 'scheduled'),
    publishState: String(g.publishState ?? 'draft'),
    homeTeamName: relName(g.homeTeam, 'name') || 'Home team',
    awayTeamName: relName(g.awayTeam, 'name') || 'Away team',
    homeTeamId: relId(g.homeTeam),
    awayTeamId: relId(g.awayTeam),
    venueName: relName(g.venue, 'name'),
    venueId: relId(g.venue),
    divisionName: relName(g.division, 'displayLabel', 'fullPath'),
  }))

  // A club admin may only touch games involving their own club; a super admin may
  // touch anything. Anything else is dropped from the plan with a reason.
  const outOfScope: Array<{ gameId: string | number; summary: string; skipped: string }> = []
  let scoped = targets
  if (!isSuperAdmin(user)) {
    const clubOf = (t: Record<string, unknown> | undefined) => relId((t as { club?: unknown } | undefined)?.club)
    const myClub = (user as { club?: unknown }).club
    const myClubId = relId(myClub)
    const allowed = new Set<string>()
    for (const g of docs) {
      const home = clubOf(g.homeTeam as Record<string, unknown>)
      const away = clubOf(g.awayTeam as Record<string, unknown>)
      if (myClubId != null && (String(home) === String(myClubId) || String(away) === String(myClubId))) allowed.add(String(g.id))
    }
    scoped = targets.filter((t) => allowed.has(String(t.id)))
    for (const t of targets.filter((t) => !allowed.has(String(t.id)))) {
      outOfScope.push({ gameId: t.id, summary: `${t.homeTeamName} vs ${t.awayTeamName}`, skipped: 'This game does not involve your club, so it was left alone.' })
    }
  }

  const newVenueName = body.newVenueId != null ? relName(await payload.findByID({ collection: 'venues', id: body.newVenueId, depth: 0, overrideAccess: true }).catch(() => null), 'name') : undefined
  const plan = planBulk(action, scoped, { newDate: body.newDate, newVenueId: body.newVenueId, newVenueName })
  plan.skipped.push(...outOfScope)

  if (plan.error) return NextResponse.json({ error: plan.error }, { status: 400 })
  if (body.dryRun) return NextResponse.json({ ok: true, dryRun: true, plan })

  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!reason) return NextResponse.json({ error: 'A reason is required so the change is recorded in the audit log. Say briefly why you are making it.' }, { status: 400 })

  const actor = { id: user.id, email: user.email }
  const byId = new Map(scoped.map((t) => [String(t.id), t]))

  // The undo manifest: each game's values BEFORE this batch touched it.
  const undoManifest: Array<{ gameId: string | number; status: string; publishState: string; startAt: string; venueId: string | number | null; courtId: string | number | null }> = []
  const applied: string[] = []
  const failed: Array<{ gameId: string | number; summary: string; skipped: string }> = []

  for (const change of plan.changes) {
    const before = byId.get(String(change.gameId))
    if (!before) continue
    const doc = docs.find((d) => String(d.id) === String(change.gameId))
    try {
      undoManifest.push({
        gameId: change.gameId,
        status: before.status,
        publishState: before.publishState,
        startAt: before.startAt,
        venueId: before.venueId,
        courtId: relId(doc?.court),
      })
      if (change.publishState) {
        await setPublishState(payload, change.gameId, actor, change.publishState)
      } else if (change.patch) {
        await adminOverride(payload, change.gameId, actor, change.patch, reason)
      }
      applied.push(change.summary)
      // Notifications queue rather than fail the action if email is not wired up.
      await notifyGameChanged(payload, { gameId: change.gameId, summary: change.summary, action, actorEmail: user.email ?? null })
    } catch {
      undoManifest.pop()
      failed.push({ gameId: change.gameId, summary: change.summary, skipped: 'This one could not be saved and was left as it was. Try it on its own.' })
    }
  }

  const batch = await payload
    .create({
      collection: 'import-batches',
      overrideAccess: true,
      data: {
        kind: 'games',
        status: 'committed',
        committedBy: actor.id,
        committedAt: new Date().toISOString(),
        undoWindowMinutes: UNDO_WINDOW_MINUTES,
        undoExpiresAt: new Date(Date.now() + UNDO_WINDOW_MINUTES * 60_000).toISOString(),
        counts: { ready: applied.length, warnings: plan.skipped.length, errors: failed.length, imported: applied.length },
        bulkAction: action,
        bulkUndo: undoManifest,
      } as never,
    })
    .catch(() => null)

  await writeAudit(payload, {
    actor,
    action: `game.bulk.${action}`,
    entity: 'games',
    entityId: batch?.id ?? 'batch',
    after: { changed: applied.length, skipped: plan.skipped.length, failed: failed.length, teams: plan.affectedTeams },
    reason,
  })

  return NextResponse.json({
    ok: true,
    batchId: batch?.id ?? null,
    changed: applied.length,
    skipped: [...plan.skipped, ...failed],
    affectedTeams: plan.affectedTeams,
    undoExpiresAt: new Date(Date.now() + UNDO_WINDOW_MINUTES * 60_000).toISOString(),
    message: `${applied.length} game${applied.length === 1 ? '' : 's'} changed. You can undo this for the next hour.${
      failed.length ? ` ${failed.length} could not be saved and were left as they were.` : ''
    }`,
  })
}

