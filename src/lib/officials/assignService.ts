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

/** Every game this official already holds, labelled so a clash can name it. */
async function existingFor(payload: Payload, officialId: string | number, thisGameId: string | number, thisLabel: string): Promise<OtherGame[]> {
  const rows = await payload.find({
    collection: 'game-officials',
    where: { official: { equals: officialId } },
    depth: 2,
    limit: 500,
    overrideAccess: true,
  })
  const out: OtherGame[] = []
  for (const row of rows.docs as unknown as Array<Record<string, unknown>>) {
    const g = row.game
    if (!g || typeof g !== 'object') continue
    const other = g as Record<string, unknown>
    if (!other.startAt) continue
    const same = String(other.id) === String(thisGameId)
    out.push({ gameId: (other.id as string | number) ?? '', label: same ? thisLabel : gameLabel(other), startAt: String(other.startAt), isSameGame: same })
  }
  return out
}

export async function applyOfficialChanges(
  payload: Payload,
  user: { id: string | number } & Record<string, unknown>,
  gameId: string | number,
  req: ChangeRequest,
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
      existing: await existingFor(payload, officialId, gameId, label),
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
