/*
 * Bulk operations on games: what a change would do, described before it happens.
 *
 * Pure, no I/O, so the preview a scheduler reads and the change the server makes
 * are computed by the same code. The rule from the brief is that a bulk action
 * shows a preview of who it affects before it runs, so nobody moves a hundred
 * games and then finds out which families they just disrupted.
 */

import { leagueDateTime, leagueWallTimeToUtcISO } from '../leagueTime'

export type BulkAction = 'publish' | 'unpublish' | 'cancel' | 'postpone' | 'move-date' | 'move-venue'

export type BulkTargetGame = {
  id: string | number
  startAt: string
  status: string
  publishState: string
  homeTeamName: string
  awayTeamName: string
  homeTeamId: string | number | null
  awayTeamId: string | number | null
  venueName: string
  venueId: string | number | null
  divisionName: string
}

export type BulkOptions = {
  /** For move-date: the new league wall date, YYYY-MM-DD. Times are kept. */
  newDate?: string
  /** For move-venue: the venue to move every selected game to. */
  newVenueId?: string | number
  newVenueName?: string
}

export type BulkChange = {
  gameId: string | number
  summary: string
  patch?: Record<string, unknown>
  publishState?: 'published' | 'draft'
  skipped?: string
}

export type BulkPlan = {
  action: BulkAction
  /** What will actually change. */
  changes: BulkChange[]
  /** Games in the selection that this action cannot touch, and why. */
  skipped: BulkChange[]
  /** Team names that will be affected, so notifications and impact are visible. */
  affectedTeams: string[]
  /** One sentence a volunteer can check before pressing the button. */
  headline: string
  /** True when this action cannot be taken back with the undo control. */
  irreversible: boolean
  error?: string
}

const ACTION_LABEL: Record<BulkAction, string> = {
  publish: 'put on the public site',
  unpublish: 'taken off the public site',
  cancel: 'cancelled',
  postpone: 'postponed',
  'move-date': 'moved to a new date',
  'move-venue': 'moved to a new venue',
}

/*
 * A finalized game keeps its result. Moving, cancelling, or postponing one after
 * the fact would silently rewrite the standings, so those are skipped with a
 * sentence rather than applied.
 */
const FINALIZED = new Set(['final', 'forfeit'])

export function planBulk(action: BulkAction, games: BulkTargetGame[], opts: BulkOptions = {}): BulkPlan {
  const changes: BulkChange[] = []
  const skipped: BulkChange[] = []
  const teams = new Set<string>()

  const base: BulkPlan = { action, changes, skipped, affectedTeams: [], headline: '', irreversible: false }

  if (!games.length) {
    return { ...base, error: 'Nothing was selected. Tick the games you want to change first.' }
  }
  if (action === 'move-date' && !opts.newDate) {
    return { ...base, error: 'Choose the new date first.' }
  }
  if (action === 'move-venue' && opts.newVenueId == null) {
    return { ...base, error: 'Choose the venue to move these games to first.' }
  }

  for (const g of games) {
    const label = `${g.homeTeamName} vs ${g.awayTeamName} on ${leagueDateTime(g.startAt)}`

    if (FINALIZED.has(g.status) && action !== 'publish' && action !== 'unpublish') {
      skipped.push({ gameId: g.id, summary: label, skipped: 'This game already has a final result, so it was left alone. Correct it one game at a time instead.' })
      continue
    }

    switch (action) {
      case 'publish': {
        if (g.publishState === 'published') {
          skipped.push({ gameId: g.id, summary: label, skipped: 'Already on the public site.' })
          continue
        }
        changes.push({ gameId: g.id, summary: label, publishState: 'published' })
        break
      }
      case 'unpublish': {
        if (g.publishState === 'draft') {
          skipped.push({ gameId: g.id, summary: label, skipped: 'Already off the public site.' })
          continue
        }
        changes.push({ gameId: g.id, summary: label, publishState: 'draft' })
        break
      }
      case 'cancel': {
        if (g.status === 'cancelled') {
          skipped.push({ gameId: g.id, summary: label, skipped: 'Already cancelled.' })
          continue
        }
        changes.push({ gameId: g.id, summary: label, patch: { status: 'cancelled' } })
        break
      }
      case 'postpone': {
        if (g.status === 'postponed') {
          skipped.push({ gameId: g.id, summary: label, skipped: 'Already postponed.' })
          continue
        }
        changes.push({ gameId: g.id, summary: label, patch: { status: 'postponed' } })
        break
      }
      case 'move-date': {
        // Keep the time of day, change the date. A 6:00 PM game stays at 6:00 PM.
        const time = hhmmOf(g.startAt)
        const newStart = leagueWallTimeToUtcISO(opts.newDate!, time)
        if (!newStart) {
          skipped.push({ gameId: g.id, summary: label, skipped: 'That date could not be read.' })
          continue
        }
        if (newStart === g.startAt) {
          skipped.push({ gameId: g.id, summary: label, skipped: 'Already on that date and time.' })
          continue
        }
        changes.push({ gameId: g.id, summary: `${label} moves to ${leagueDateTime(newStart)}`, patch: { startAt: newStart } })
        break
      }
      case 'move-venue': {
        if (String(g.venueId ?? '') === String(opts.newVenueId)) {
          skipped.push({ gameId: g.id, summary: label, skipped: 'Already at that venue.' })
          continue
        }
        changes.push({
          gameId: g.id,
          summary: `${label} moves from ${g.venueName || 'no venue'} to ${opts.newVenueName ?? 'the new venue'}`,
          // The court belongs to the old venue, so it is cleared rather than left
          // pointing at a court in a different building.
          patch: { venue: opts.newVenueId, court: null },
        })
        break
      }
    }
    teams.add(g.homeTeamName)
    teams.add(g.awayTeamName)
  }

  const affectedTeams = Array.from(teams).filter(Boolean).sort()
  const n = changes.length

  const headline =
    n === 0
      ? `Nothing would change. All ${games.length} selected game${games.length === 1 ? '' : 's'} are already as you are asking for.`
      : `${n} game${n === 1 ? '' : 's'} will be ${ACTION_LABEL[action]}, affecting ${affectedTeams.length} team${affectedTeams.length === 1 ? '' : 's'}.${
          skipped.length ? ` ${skipped.length} selected game${skipped.length === 1 ? ' was' : 's were'} left alone.` : ''
        }`

  return {
    action,
    changes,
    skipped,
    affectedTeams,
    headline,
    // Cancelling clears a game off the public schedule for families who may have
    // already planned around it. It is undoable within the window, but it is the
    // one people regret, so it is marked.
    irreversible: action === 'cancel',
  }
}

/** The 24 hour wall time of an instant in the league zone, as HH:MM. */
function hhmmOf(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '00:00'
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Edmonton', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return parts.replace('24:', '00:')
}

/** The inverse of a change, so a bulk edit can be taken back within the window. */
export function invertChange(before: BulkTargetGame, change: BulkChange): BulkChange {
  if (change.publishState) {
    return { gameId: before.id, summary: change.summary, publishState: before.publishState === 'published' ? 'published' : 'draft' }
  }
  const patch: Record<string, unknown> = {}
  if (change.patch && 'status' in change.patch) patch.status = before.status
  if (change.patch && 'startAt' in change.patch) patch.startAt = before.startAt
  if (change.patch && 'venue' in change.patch) {
    patch.venue = before.venueId
    patch.court = null
  }
  return { gameId: before.id, summary: change.summary, patch }
}
