import 'server-only'
import type { Payload } from 'payload'

import { DEFAULT_BUFFER, DEFAULT_GAME_LENGTH } from '../csvImport/commit'
import { leagueDateTime } from '../leagueTime'
import { evaluateAssignment, saveFailedOutcome, type AssignmentOutcome, type OtherGame } from './assignmentCheck'

/*
 * Applying official assignments to a game. Shared by the single game route and
 * the bulk assignment board so the two can never disagree about what is a hard
 * block, what is a warning, and how a failure is worded.
 *
 * The rules themselves live in assignmentCheck.ts, which is pure and tested. This
 * module is only the reads, the writes, and the wording of what came back.
 */

export const WINDOW_MINUTES = DEFAULT_GAME_LENGTH + DEFAULT_BUFFER

const relName = (r: unknown, fallback: string): string => (r && typeof r === 'object' ? ((r as { name?: string }).name ?? fallback) : fallback)

export const gameLabel = (g: Record<string, unknown> | null | undefined): string => {
  if (!g) return 'another game'
  return `${relName(g.homeTeam, 'Home team')} vs ${relName(g.awayTeam, 'Away team')} on ${leagueDateTime(g.startAt as string)}`
}

export type ChangeRequest = {
  assignments?: Array<{ officialId: number | string; role?: string }>
  remove?: Array<number | string>
  force?: boolean
  dryRun?: boolean
}

export type ChangeResult = {
  gameId: string | number
  gameLabel: string
  created: AssignmentOutcome[]
  blocked: AssignmentOutcome[]
  warnings: AssignmentOutcome[]
  removed: AssignmentOutcome[]
  error?: string
}

const emptyResult = (gameId: string | number, label: string): ChangeResult => ({
  gameId,
  gameLabel: label,
  created: [],
  blocked: [],
  warnings: [],
  removed: [],
})

/**
 * Every game each official already holds, labelled so a clash can name it.
 *
 * Built ONCE for a whole batch. Doing this per official per game meant a bulk
 * submit of forty games fired forty depth-2 queries over five hundred rows each,
 * which did not finish inside a minute against a real season. Two queries now
 * serve the whole batch: the assignments, then the games they point at.
 */
export type ExistingIndex = Map<string, OtherGame[]>

export async function buildExistingIndex(payload: Payload, officialIds: Array<string | number>): Promise<ExistingIndex> {
  const index: ExistingIndex = new Map()
  const ids = Array.from(new Set(officialIds.map(String))).filter(Boolean)
  if (!ids.length) return index

  const rows = await payload.find({
    collection: 'game-officials',
    where: { official: { in: ids } },
    depth: 0,
    limit: 5000,
    overrideAccess: true,
  })
  const pairs = (rows.docs as unknown as Array<Record<string, unknown>>).map((r) => ({
    officialId: String(relId(r.official) ?? ''),
    gameId: String(relId(r.game) ?? ''),
  }))
  const gameIds = Array.from(new Set(pairs.map((x) => x.gameId).filter(Boolean)))
  if (!gameIds.length) return index

  const games = await payload.find({ collection: 'games', where: { id: { in: gameIds } }, depth: 1, limit: 5000, overrideAccess: true })
  const byId = new Map<string, Record<string, unknown>>()
  for (const g of games.docs as unknown as Array<Record<string, unknown>>) byId.set(String(g.id), g)

  for (const { officialId, gameId } of pairs) {
    const g = byId.get(gameId)
    if (!officialId || !g?.startAt) continue
    const list = index.get(officialId) ?? []
    list.push({ gameId, label: gameLabel(g), startAt: String(g.startAt), isSameGame: false })
    index.set(officialId, list)
  }
  return index
}

const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

/** This official's other games, marking the one being staffed. */
function existingFrom(index: ExistingIndex, officialId: string | number, thisGameId: string | number, thisLabel: string): OtherGame[] {
  return (index.get(String(officialId)) ?? []).map((e) => {
    const same = String(e.gameId) === String(thisGameId)
    return same ? { ...e, isSameGame: true, label: thisLabel } : e
  })
}

export async function applyOfficialChanges(
  payload: Payload,
  user: { id: string | number } & Record<string, unknown>,
  gameId: string | number,
  req: ChangeRequest,
  existingIndex?: ExistingIndex,
): Promise<ChangeResult> {
  const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 1, overrideAccess: true }).catch(() => null)) as Record<string, unknown> | null
  if (!game || !game.startAt) {
    return { ...emptyResult(gameId, 'That game'), error: 'That game could not be found, or it has no date and time yet. Set its date first.' }
  }
  const label = gameLabel(game)
  const result = emptyResult(gameId, label)
  const requiredRamp = (game.division as { requiredRampLevel?: string } | undefined)?.requiredRampLevel ?? 'none'

  for (const officialId of req.remove ?? []) {
    const official = (await payload.findByID({ collection: 'officials', id: officialId, depth: 0, overrideAccess: true }).catch(() => null)) as
      | { name?: string }
      | null
    const name = official?.name ?? 'That official'
    const rows = await payload.find({
      collection: 'game-officials',
      where: { and: [{ game: { equals: gameId } }, { official: { equals: officialId } }] },
      depth: 0,
      limit: 5,
      overrideAccess: true,
    })
    if (!rows.docs.length) {
      result.blocked.push({ officialId, officialName: name, severity: 'blocked', message: `${name} was not assigned to this game, so there was nothing to remove.` })
      continue
    }
    if (req.dryRun) {
      result.removed.push({ officialId, officialName: name, severity: 'ok', message: `${name} would be taken off this game.` })
      continue
    }
    let ok = true
    for (const doc of rows.docs) {
      await payload.delete({ collection: 'game-officials', id: doc.id, overrideAccess: false, user: user as never }).catch(() => {
        ok = false
      })
    }
    result.removed.push(ok ? { officialId, officialName: name, severity: 'ok', message: `${name} was taken off this game.` } : saveFailedOutcome(officialId, name))
  }

  for (const a of req.assignments ?? []) {
    const officialId = a.officialId
    if (officialId == null) continue

    const official = (await payload.findByID({ collection: 'officials', id: officialId, depth: 0, overrideAccess: true }).catch(() => null)) as
      | { name?: string; rampLevel?: string; maxGamesPerDay?: number; active?: boolean }
      | null
    if (!official) {
      result.blocked.push({
        officialId,
        officialName: 'That official',
        severity: 'blocked',
        reason: 'OFFICIAL_NOT_FOUND',
        message: 'That official is no longer on the officials list, so they cannot be assigned. Refresh the page to see the current list.',
      })
      continue
    }
    const name = official.name ?? 'That official'

    const verdict = evaluateAssignment({
      officialId,
      officialName: name,
      active: official.active,
      rampLevel: official.rampLevel,
      maxGamesPerDay: official.maxGamesPerDay,
      game: { id: gameId, label, startAt: String(game.startAt), requiredRampLevel: requiredRamp },
      existing: existingFrom(existingIndex ?? (await buildExistingIndex(payload, [officialId])), officialId, gameId, label),
      windowMinutes: WINDOW_MINUTES,
      force: req.force,
    })

    if (verdict.severity === 'blocked') {
      result.blocked.push(verdict)
      continue
    }
    if (req.dryRun) {
      if (verdict.severity === 'warning') result.warnings.push(verdict)
      result.created.push({ ...verdict, message: `${name} would be assigned to ${label}.` })
      continue
    }

    const role = ['referee1', 'referee2', 'scorekeeper', 'other'].includes(String(a.role)) ? a.role : 'referee1'
    const saved = await payload
      .create({ collection: 'game-officials', overrideAccess: false, user: user as never, data: { game: gameId, official: officialId, role } as never })
      .catch(() => null)

    if (!saved) {
      result.blocked.push(saveFailedOutcome(officialId, name))
      continue
    }
    if (verdict.severity === 'warning') result.warnings.push(verdict)
    result.created.push({ ...verdict, severity: 'ok', message: `${name} was assigned.` })
  }

  return result
}
