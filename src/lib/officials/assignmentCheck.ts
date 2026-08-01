/*
 * Why an official can or cannot take a game, decided in one pure place so the
 * route, the assignment board, and the tests all agree.
 *
 * This replaces a catch-all that turned every failure into "Could not assign."
 * and printed the official's database id. The lead scheduler's report was exactly
 * "Blocked official 7: Could not assign." with no way to know which person that
 * was or what to do about it.
 *
 * Two ideas kept deliberately separate:
 *   blocked  - a hard stop. The assignment does not happen.
 *   warning  - allowed, but the admin should know. The assignment happens.
 * Every outcome names the official and, where one exists, the other game.
 */

import { leagueDayKey } from '../leagueTime'

export type AssignmentReason =
  | 'TIME_CONFLICT'
  | 'ALREADY_ASSIGNED'
  | 'OVER_MAX_PER_DAY'
  | 'RAMP_BELOW_DIVISION'
  | 'OFFICIAL_NOT_FOUND'
  | 'OFFICIAL_INACTIVE'
  | 'SAVE_FAILED'

export type Severity = 'blocked' | 'warning' | 'ok'

export type AssignmentOutcome = {
  officialId: string | number
  officialName: string
  severity: Severity
  reason?: AssignmentReason
  /** One sentence: what happened, why, and what to do next. */
  message: string
  /** True when an admin may proceed anyway by choosing to override. */
  overridable?: boolean
}

export type OtherGame = {
  gameId: string | number
  /** Human label, for example "Sat Jan 10, 6:00 PM, Excel U13 vs CoMBA BU13-1". */
  label: string
  startAt: string
  /** True when this row is the official already being on THIS game. */
  isSameGame?: boolean
}

export type AssignmentInput = {
  officialId: string | number
  officialName: string
  active?: boolean | null
  rampLevel?: string | null
  maxGamesPerDay?: number | null
  /** The game being staffed. */
  game: { id: string | number; label: string; startAt: string; requiredRampLevel?: string | null }
  /** Every game this official already holds, with a human label. */
  existing: OtherGame[]
  /** Minutes a game occupies including the buffer between games. */
  windowMinutes: number
  /** The admin ticked "assign anyway". Only downgrades an overridable block. */
  force?: boolean
}

const RAMP_RANK: Record<string, number> = { none: 0, level1: 1, level2: 2, level3: 3 }
const RAMP_LABEL: Record<string, string> = { none: 'no level', level1: 'level 1', level2: 'level 2', level3: 'level 3' }
const rampLabel = (v?: string | null) => RAMP_LABEL[v ?? 'none'] ?? String(v)

// The league day, not the UTC day. A 6:00 PM Calgary game is 01:00 UTC the next
// day, so grouping on the UTC date would not count it as the same Saturday.
const dayOf = (iso: string) => leagueDayKey(iso)

/**
 * Decide one official against one game. Returns the FIRST hard block if there is
 * one, otherwise the most useful warning, otherwise ok. Never returns a message
 * that identifies a person by database id.
 */
export function evaluateAssignment(input: AssignmentInput): AssignmentOutcome {
  const { officialId, officialName, game } = input
  const base = { officialId, officialName }

  if (input.active === false) {
    return {
      ...base,
      severity: 'blocked',
      reason: 'OFFICIAL_INACTIVE',
      message: `${officialName} is marked inactive, so they cannot be assigned. Set them active on the officials list first.`,
    }
  }

  // Already on this game. Not a failure worth alarming anyone about, but it is
  // not a new assignment either.
  if (input.existing.some((e) => e.isSameGame || String(e.gameId) === String(game.id))) {
    return {
      ...base,
      severity: 'blocked',
      reason: 'ALREADY_ASSIGNED',
      message: `${officialName} is already assigned to this game. Remove the existing assignment first if you want to change their role.`,
    }
  }

  // A real time conflict, naming the other game so the admin can go look at it.
  const start = new Date(game.startAt).getTime()
  const windowMs = input.windowMinutes * 60_000
  const clash = input.existing.find((e) => Math.abs(new Date(e.startAt).getTime() - start) < windowMs)
  if (clash) {
    if (!input.force) {
      return {
        ...base,
        severity: 'blocked',
        reason: 'TIME_CONFLICT',
        overridable: true,
        message: `${officialName} is already on ${clash.label}, which overlaps this game. Choose someone else, or tick assign anyway if they really can do both.`,
      }
    }
    // Forced through: still tell the admin what they just accepted.
    return {
      ...base,
      severity: 'warning',
      reason: 'TIME_CONFLICT',
      message: `${officialName} was assigned even though they are also on ${clash.label}, which overlaps this game.`,
    }
  }

  // Over the max games they agreed to work in a day.
  const max = input.maxGamesPerDay
  if (max != null) {
    const sameDay = input.existing.filter((e) => dayOf(e.startAt) === dayOf(game.startAt)).length
    if (sameDay + 1 > max) {
      return {
        ...base,
        severity: 'warning',
        reason: 'OVER_MAX_PER_DAY',
        message: `${officialName} would be working ${sameDay + 1} games that day, over their maximum of ${max}. They were still assigned.`,
      }
    }
  }

  // Certification below what the division asks for.
  const required = game.requiredRampLevel ?? 'none'
  if (required !== 'none') {
    const have = RAMP_RANK[input.rampLevel ?? 'none'] ?? 0
    if (have < (RAMP_RANK[required] ?? 0)) {
      return {
        ...base,
        severity: 'warning',
        reason: 'RAMP_BELOW_DIVISION',
        message: `${officialName} is ${rampLabel(input.rampLevel)}, and this division asks for ${rampLabel(required)}. They were still assigned.`,
      }
    }
  }

  return { ...base, severity: 'ok', message: `${officialName} was assigned.` }
}

/** The message shown when the save itself failed, rather than a rule. */
export function saveFailedOutcome(officialId: string | number, officialName: string): AssignmentOutcome {
  return {
    officialId,
    officialName,
    severity: 'blocked',
    reason: 'SAVE_FAILED',
    message: `${officialName} could not be saved because of a problem on our side. Nothing was changed for them. Try again, and if it keeps happening tell the league administrator.`,
  }
}
