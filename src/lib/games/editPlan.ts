/*
 * What would happen if a scheduler moved this game. Pure, no I/O, so the edit
 * panel, the bulk move, and the tests all describe a change the same way.
 *
 * The rule from the overhaul brief: conflicts are surfaced INLINE at the moment
 * of the change, in words, naming the other game. Never an id where a name
 * exists. A venue, team, or official double booking is a hard block that an admin
 * may deliberately override; everything else is advice.
 */

import { leagueDateTime } from '../leagueTime'

export type EditableGame = {
  id: string | number
  startAt: string
  venueId?: string | number | null
  courtId?: string | number | null
  homeTeamId: string | number
  awayTeamId: string | number
  officialIds?: (string | number)[] | null
  isBye?: boolean | null
}

/** A game already on the calendar, with the names needed to describe it. */
export type NeighbourGame = EditableGame & {
  homeTeamName: string
  awayTeamName: string
  venueName?: string | null
  courtName?: string | null
  officialNames?: Record<string, string>
}

export type EditConflictKind = 'VENUE_COURT' | 'TEAM' | 'OFFICIAL'

export type EditConflict = {
  kind: EditConflictKind
  /** One sentence naming the clash and the other game. */
  message: string
  otherGameId: string | number
  /** True when an admin may proceed anyway. All of these are overridable. */
  overridable: true
}

export type EditPlanOptions = {
  gameLengthMinutes: number
  bufferMinutes: number
  /** Names for the game being edited, so messages can talk about it too. */
  names: { homeTeamName: string; awayTeamName: string; venueName?: string | null; courtName?: string | null; officialNames?: Record<string, string> }
}

const key = (id: string | number | null | undefined) => (id == null ? '' : String(id))

const describe = (g: NeighbourGame) => `${g.homeTeamName} vs ${g.awayTeamName} on ${leagueDateTime(g.startAt)}`

/**
 * Compare a proposed game against everything else already scheduled and return
 * the conflicts as sentences. `neighbours` must exclude the game being edited.
 */
export function planGameEdit(proposed: EditableGame, neighbours: NeighbourGame[], opts: EditPlanOptions): EditConflict[] {
  const out: EditConflict[] = []
  if (proposed.isBye) return out

  const totalMs = (opts.gameLengthMinutes + opts.bufferMinutes) * 60_000
  const start = new Date(proposed.startAt).getTime()
  if (Number.isNaN(start)) return out

  const proposedOfficials = new Set((proposed.officialIds ?? []).map(key).filter(Boolean))

  for (const other of neighbours) {
    if (other.isBye) continue
    if (key(other.id) === key(proposed.id)) continue
    const otherStart = new Date(other.startAt).getTime()
    if (Number.isNaN(otherStart)) continue
    if (!(start < otherStart + totalMs && otherStart < start + totalMs)) continue

    if (proposed.venueId != null && proposed.courtId != null && key(proposed.venueId) === key(other.venueId) && key(proposed.courtId) === key(other.courtId)) {
      const where = [other.venueName, other.courtName].filter(Boolean).join(', ') || 'that court'
      out.push({
        kind: 'VENUE_COURT',
        otherGameId: other.id,
        overridable: true,
        message: `${where} is already booked at that time by ${describe(other)}. Pick another time or another court.`,
      })
    }

    const sharedTeam =
      key(proposed.homeTeamId) === key(other.homeTeamId) || key(proposed.homeTeamId) === key(other.awayTeamId)
        ? { id: proposed.homeTeamId, name: opts.names.homeTeamName }
        : key(proposed.awayTeamId) === key(other.homeTeamId) || key(proposed.awayTeamId) === key(other.awayTeamId)
          ? { id: proposed.awayTeamId, name: opts.names.awayTeamName }
          : null
    if (sharedTeam) {
      out.push({
        kind: 'TEAM',
        otherGameId: other.id,
        overridable: true,
        message: `${sharedTeam.name} is already playing at that time in ${describe(other)}. A team cannot be in two places at once.`,
      })
    }

    if (proposedOfficials.size) {
      for (const oid of other.officialIds ?? []) {
        if (!proposedOfficials.has(key(oid))) continue
        const name = other.officialNames?.[key(oid)] ?? opts.names.officialNames?.[key(oid)] ?? 'That official'
        out.push({
          kind: 'OFFICIAL',
          otherGameId: other.id,
          overridable: true,
          message: `${name} is already officiating ${describe(other)} at that time. Assign someone else to one of the two games.`,
        })
      }
    }
  }

  // Stable order so the same edit always shows the same list.
  out.sort((a, b) => a.kind.localeCompare(b.kind) || key(a.otherGameId).localeCompare(key(b.otherGameId)) || a.message.localeCompare(b.message))
  return out
}

/*
 * The fields a scheduler may change on a game through the audited override path.
 * Anything not on this list is refused by the route rather than silently dropped.
 */
export const EDITABLE_GAME_FIELDS = ['startAt', 'venue', 'court', 'homeTeam', 'awayTeam', 'status', 'homeScore', 'awayScore', 'notes'] as const
export type EditableGameField = (typeof EDITABLE_GAME_FIELDS)[number]

/** Plain labels for the change log and for the confirmation shown to the admin. */
export const FIELD_LABEL: Record<EditableGameField, string> = {
  startAt: 'date and time',
  venue: 'venue',
  court: 'court',
  homeTeam: 'home team',
  awayTeam: 'away team',
  status: 'status',
  homeScore: 'home score',
  awayScore: 'away score',
  notes: 'notes',
}

/** Reject a change that cannot make sense, before it reaches the database. */
export function validateGameEdit(patch: Record<string, unknown>): string | null {
  if ('homeTeam' in patch && 'awayTeam' in patch && key(patch.homeTeam as never) === key(patch.awayTeam as never)) {
    return 'The home team and the away team cannot be the same team.'
  }
  if ('startAt' in patch) {
    const v = patch.startAt
    if (typeof v !== 'string' || Number.isNaN(new Date(v).getTime())) {
      return 'That date and time could not be read. Check the date and the time and try again.'
    }
  }
  for (const f of ['homeScore', 'awayScore'] as const) {
    if (f in patch && patch[f] != null) {
      const n = Number(patch[f])
      if (!Number.isInteger(n) || n < 0) return 'Scores must be whole numbers of zero or more.'
    }
  }
  return null
}
