/*
 * Pure game status state machine and the security-critical actor checks for score
 * reporting and confirmation. No I/O, so every rule is unit-testable. The service
 * layer (src/lib/games/service.ts) and the collection hooks call these to decide
 * what is allowed; this module never trusts client-supplied authority.
 *
 * Status axis: scheduled, reported, contested, final, postponed, cancelled,
 * forfeit. The publish axis (draft, published) is orthogonal and lives on the
 * Games collection, not here.
 */
import type { GameStatus } from './scheduleUtils'

export type ForfeitOutcome = 'home_forfeit' | 'away_forfeit' | 'double_forfeit' | 'no_contest'

export const GAME_STATUSES: GameStatus[] = [
  'scheduled',
  'reported',
  'contested',
  'final',
  'postponed',
  'cancelled',
  'forfeit',
]

export function isFinalized(status: GameStatus): boolean {
  return status === 'final' || status === 'forfeit'
}

export type Actor = {
  isAdmin: boolean // club admin or super admin
  isSuperAdmin: boolean
  isVerifiedRepOfGame: boolean // a verified rep of either team on this game
}

type Capability = 'repOrAdmin' | 'admin' | 'superAdmin'

// Allowed transitions out of a NON-finalized state and the capability each needs.
// Transitions out of a finalized state are handled by the isFinalized short
// circuit below (super admin only), per build plan rule 8.
const TABLE: Partial<Record<GameStatus, Partial<Record<GameStatus, Capability>>>> = {
  scheduled: { reported: 'repOrAdmin', postponed: 'admin', cancelled: 'admin', forfeit: 'admin' },
  reported: { final: 'repOrAdmin', contested: 'repOrAdmin', postponed: 'admin', cancelled: 'admin', forfeit: 'admin' },
  contested: { final: 'admin', forfeit: 'admin', cancelled: 'admin', postponed: 'admin' },
  postponed: { scheduled: 'admin', cancelled: 'admin', forfeit: 'admin' },
  cancelled: { scheduled: 'admin' },
}

export function canTransition(from: GameStatus, to: GameStatus, actor: Actor): boolean {
  if (from === to) return false
  if (!GAME_STATUSES.includes(to)) return false
  // Any edit of a finalized game is super admin only.
  if (isFinalized(from)) return actor.isSuperAdmin
  const cap = TABLE[from]?.[to]
  if (!cap) return false
  if (cap === 'superAdmin') return actor.isSuperAdmin
  if (cap === 'admin') return actor.isAdmin
  return actor.isVerifiedRepOfGame || actor.isAdmin
}

/*
 * What a transition triggers. recompute is true whenever the game enters OR leaves
 * the final/forfeit set, so standings are corrected in BOTH directions (an admin
 * un-finalizing a game removes its contribution). escalateContested fires when a
 * game becomes contested (the unsuppressable email to the scheduling admin).
 */
export function effectsOf(from: GameStatus, to: GameStatus): { recompute: boolean; escalateContested: boolean } {
  return {
    recompute: isFinalized(from) !== isFinalized(to),
    escalateContested: to === 'contested',
  }
}

/*
 * Dual-entry resolution. Given the reports already on file and a newly submitted
 * report, decide the next status: if the OTHER side already reported and the
 * scores match it auto-finals; if they mismatch it goes contested; otherwise it
 * just sits as reported awaiting the opposing confirmation.
 */
export type ReportLike = { submittedForTeamId: string | number; homeScore: number; awayScore: number }

export function nextStatusForReport(existing: ReportLike[], incoming: ReportLike): GameStatus {
  const other = existing.find((r) => String(r.submittedForTeamId) !== String(incoming.submittedForTeamId))
  if (!other) return 'reported'
  const matches = other.homeScore === incoming.homeScore && other.awayScore === incoming.awayScore
  return matches ? 'final' : 'contested'
}

export type CheckResult = { ok: true } | { ok: false; message: string }

const eq = (a: string | number, b: string | number) => String(a) === String(b)

/*
 * May this actor REPORT for this game? The team being reported for must be the
 * home or away team derived from the GAME (never trusted from the request), and
 * the actor must hold a verified membership on that exact team.
 */
export function checkActorMayReport(args: {
  verifiedTeamIds: (string | number)[]
  homeTeamId: string | number
  awayTeamId: string | number
  submittedForTeamId: string | number
}): CheckResult {
  const { verifiedTeamIds, homeTeamId, awayTeamId, submittedForTeamId } = args
  const isTeamOnGame = eq(submittedForTeamId, homeTeamId) || eq(submittedForTeamId, awayTeamId)
  if (!isTeamOnGame) return { ok: false, message: 'You can only report for a team playing in this game.' }
  const reps = verifiedTeamIds.some((t) => eq(t, submittedForTeamId))
  if (!reps) return { ok: false, message: 'You are not a verified representative of that team.' }
  return { ok: true }
}

/*
 * May this actor CONFIRM the opposing report? Four rules, all derived from the
 * game and the report, never from the request body:
 *   (a) the confirmer is not the original reporter (no self-confirm),
 *   (b) the confirmer holds a verified membership on the team that is the OPPOSING
 *       side relative to the report's submittedForTeam,
 *   (c) the confirmer does NOT hold verified memberships on BOTH teams of this game
 *       (a dual-membership user cannot be the neutral opposing confirmer; route to
 *       an admin instead),
 *   (d) the confirmer holds at least one verified membership on the game (implied
 *       by b, asserted explicitly for clarity).
 */
export function checkActorMayConfirm(args: {
  verifiedTeamIds: (string | number)[]
  homeTeamId: string | number
  awayTeamId: string | number
  reportSubmittedForTeamId: string | number
  reportSubmittedById: string | number
  confirmingUserId: string | number
}): CheckResult {
  const { verifiedTeamIds, homeTeamId, awayTeamId, reportSubmittedForTeamId, reportSubmittedById, confirmingUserId } = args

  if (eq(confirmingUserId, reportSubmittedById)) {
    return { ok: false, message: 'You cannot confirm your own report. The opposing team must confirm.' }
  }
  const holdsHome = verifiedTeamIds.some((t) => eq(t, homeTeamId))
  const holdsAway = verifiedTeamIds.some((t) => eq(t, awayTeamId))
  if (holdsHome && holdsAway) {
    return { ok: false, message: 'You represent both teams in this game, so an admin must resolve it.' }
  }
  const opposingTeamId = eq(homeTeamId, reportSubmittedForTeamId) ? awayTeamId : homeTeamId
  const holdsOpposing = verifiedTeamIds.some((t) => eq(t, opposingTeamId))
  if (!holdsOpposing) {
    return { ok: false, message: 'Only a verified representative of the opposing team can confirm this result.' }
  }
  return { ok: true }
}
