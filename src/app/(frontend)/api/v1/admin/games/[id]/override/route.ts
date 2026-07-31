import { NextResponse } from 'next/server'

import { canManageScheduling, clubIdOf, isLeagueWideScheduler, isSuperAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { DEFAULT_BUFFER, DEFAULT_GAME_LENGTH } from '@/lib/csvImport/commit'
import { isFinalized } from '@/lib/gameStateMachine'
import { EDITABLE_GAME_FIELDS, planGameEdit, validateGameEdit } from '@/lib/games/editPlan'
import { loadNeighbourGames } from '@/lib/games/neighbours'
import { adminOverride, applyForfeit, setPublishState, writeAudit } from '@/lib/games/service'
import { readAdminGame } from '@/lib/manageGames.server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Payloadish = Awaited<ReturnType<typeof getPayloadClient>>

const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)
const relName = (r: unknown): string => (r && typeof r === 'object' ? ((r as { name?: string }).name ?? '') : '')

const WINDOW_MINUTES = DEFAULT_GAME_LENGTH + DEFAULT_BUFFER

type Body = {
  patch?: Record<string, unknown>
  forfeit?: { outcome?: string; forfeitingTeam?: number | string | null }
  publishState?: string
  reason?: string
  /** Check the change and report conflicts without writing anything. */
  dryRun?: boolean
  /** Proceed even though conflicts were reported. Recorded in the audit reason. */
  force?: boolean
}

/*
 * POST /api/v1/admin/games/:id/override - the audited path for every admin edit
 * of a game: date and time, venue, court, teams, status, scores, forfeit, and
 * publish state.
 *
 * A finalized game is SUPER ADMIN only; a club admin is scoped to games involving
 * their own club and cannot touch a finalized game. A reason is always required
 * and every edit is audited.
 *
 * Two behaviours the scheduling console depends on:
 *  - dryRun: true returns the conflicts a change would cause, in sentences that
 *    name the other game, so the console shows them inline before saving.
 *  - a real save returns the updated game, so the row on screen updates at once
 *    instead of leaving the scheduler wondering whether anything happened.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gameId = numericId(id)
  if (gameId == null) return NextResponse.json({ error: 'That game could not be found. Go back to the schedule and open it again.' }, { status: 400 })

  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'You are signed out. Sign in again to make this change.' }, { status: 401 })
  if (!canManageScheduling(user)) return NextResponse.json({ error: 'Your account cannot change games. Ask a league administrator for scheduling access.' }, { status: 403 })

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'That change could not be read. Please try again.' }, { status: 400 })
  }

  const dryRun = body.dryRun === true
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  // A dry run writes nothing, so it does not need the reason yet. Everything else does.
  if (!dryRun && !reason) {
    return NextResponse.json({ error: 'A reason is required so the change is recorded in the audit log. Say briefly why you are making it.' }, { status: 400 })
  }

  const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 1, overrideAccess: true }).catch(() => null)) as
    | (Record<string, unknown> & { status: string; startAt?: string; homeTeam?: { club?: unknown }; awayTeam?: { club?: unknown } })
    | null
  if (!game) return NextResponse.json({ error: 'That game could not be found. It may have been removed.' }, { status: 404 })

  const finalized = isFinalized(game.status as never)
  if (finalized && !isSuperAdmin(user)) {
    return NextResponse.json({ error: 'This game already has a final result, so only a super admin can change it. Ask a league administrator.' }, { status: 403 })
  }
  // A club admin is scoped to their own club's games. A super admin and a
  // scheduler run the whole league, so they are not.
  if (!isLeagueWideScheduler(user)) {
    const club = clubIdOf(user)
    const homeClub = relId(game.homeTeam?.club)
    const awayClub = relId(game.awayTeam?.club)
    const onClub = club != null && (String(club) === String(homeClub) || String(club) === String(awayClub))
    if (!onClub) return NextResponse.json({ error: 'You can only manage games involving your own club.' }, { status: 403 })
  }

  const actor = { id: user.id, email: user.email }

  /* ----------------------------------------------------------- forfeit */
  if (body.forfeit) {
    const outcome = body.forfeit.outcome
    const valid = ['home_forfeit', 'away_forfeit', 'double_forfeit', 'no_contest']
    if (!outcome || !valid.includes(outcome)) {
      return NextResponse.json({ error: 'Choose which team forfeited, or choose double forfeit or no contest.' }, { status: 400 })
    }
    /*
     * Derive the forfeiting team from the outcome rather than trusting a separate
     * field. The old console always sent home_forfeit with a null team, which the
     * service correctly refused, which is why the button appeared to do nothing.
     */
    let forfeitingTeam: string | number | null = null
    if (outcome === 'home_forfeit') forfeitingTeam = relId(game.homeTeam) ?? null
    if (outcome === 'away_forfeit') forfeitingTeam = relId(game.awayTeam) ?? null
    if ((outcome === 'home_forfeit' || outcome === 'away_forfeit') && forfeitingTeam == null) {
      return NextResponse.json({ error: 'This game does not have both teams set, so a one sided forfeit cannot be recorded. Set the teams first.' }, { status: 400 })
    }

    if (dryRun) return NextResponse.json({ ok: true, dryRun: true, conflicts: [] })

    const res = await applyForfeit(payload, gameId, actor, outcome as never, forfeitingTeam, reason)
    if (!res.ok) return NextResponse.json({ error: res.error ?? 'The forfeit could not be recorded and nothing was changed. Please try again.' }, { status: 400 })
    return NextResponse.json({ ok: true, game: await readAdminGame(payload, gameId) })
  }

  /* ----------------------------------------------------- publish state */
  if (body.publishState === 'published' || body.publishState === 'draft') {
    if (dryRun) return NextResponse.json({ ok: true, dryRun: true, conflicts: [] })
    await setPublishState(payload, gameId, actor, body.publishState)
    if (!body.patch || !Object.keys(body.patch).length) {
      return NextResponse.json({ ok: true, game: await readAdminGame(payload, gameId) })
    }
  }

  /* -------------------------------------------------------------- edit */
  if (body.patch && Object.keys(body.patch).length) {
    const patch: Record<string, unknown> = {}
    for (const k of EDITABLE_GAME_FIELDS) if (k in body.patch) patch[k] = body.patch[k]
    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: 'Nothing in that change can be edited here.' }, { status: 400 })
    }

    const invalid = validateGameEdit(patch)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    // Conflict check against everything already on the calendar at that time.
    const proposedStart = typeof patch.startAt === 'string' ? patch.startAt : String(game.startAt ?? '')
    const officialIds = await currentOfficialIds(payload, gameId)
    const neighbours = await loadNeighbourGames(payload, { startAt: proposedStart, windowMinutes: WINDOW_MINUTES, excludeGameId: gameId })
    const homeId = 'homeTeam' in patch ? patch.homeTeam : relId(game.homeTeam)
    const awayId = 'awayTeam' in patch ? patch.awayTeam : relId(game.awayTeam)
    const conflicts = planGameEdit(
      {
        id: gameId,
        startAt: proposedStart,
        venueId: ('venue' in patch ? patch.venue : relId(game.venue)) as string | number | null,
        courtId: ('court' in patch ? patch.court : relId(game.court)) as string | number | null,
        homeTeamId: (homeId ?? '') as string | number,
        awayTeamId: (awayId ?? '') as string | number,
        officialIds,
        isBye: Boolean(game.isBye),
      },
      neighbours,
      {
        gameLengthMinutes: DEFAULT_GAME_LENGTH,
        bufferMinutes: DEFAULT_BUFFER,
        names: {
          homeTeamName: (await teamName(payload, homeId)) || relName(game.homeTeam) || 'The home team',
          awayTeamName: (await teamName(payload, awayId)) || relName(game.awayTeam) || 'The away team',
        },
      },
    )

    if (dryRun) return NextResponse.json({ ok: true, dryRun: true, conflicts })

    if (conflicts.length && !body.force) {
      return NextResponse.json(
        {
          error: 'This change clashes with another game. Read the clashes listed, then change the time, the court, or the teams, or choose to save anyway.',
          conflicts,
          needsForce: true,
        },
        { status: 409 },
      )
    }

    const auditReason =
      conflicts.length && body.force ? `${reason} (saved over ${conflicts.length} known clash${conflicts.length === 1 ? '' : 'es'})` : reason
    await adminOverride(payload, gameId, actor, patch, auditReason)
    if (conflicts.length && body.force) {
      await writeAudit(payload, {
        actor,
        action: 'game.override.forced',
        entity: 'games',
        entityId: gameId,
        after: { conflicts: conflicts.map((c) => c.message) },
        reason: auditReason,
      })
    }
    return NextResponse.json({ ok: true, conflicts, game: await readAdminGame(payload, gameId) })
  }

  return NextResponse.json({ ok: true, game: await readAdminGame(payload, gameId) })
}

async function currentOfficialIds(payload: Payloadish, gameId: string | number): Promise<(string | number)[]> {
  const res = await payload.find({ collection: 'game-officials', where: { game: { equals: gameId } }, depth: 0, limit: 20, overrideAccess: true })
  return (res.docs as Array<{ official?: unknown }>).map((d) => relId(d.official)).filter((v): v is string | number => v != null)
}

async function teamName(payload: Payloadish, teamId: unknown): Promise<string> {
  const idv = relId(teamId)
  if (idv == null) return ''
  const t = await payload.findByID({ collection: 'teams', id: idv, depth: 0, overrideAccess: true }).catch(() => null)
  return (t as { name?: string } | null)?.name ?? ''
}
