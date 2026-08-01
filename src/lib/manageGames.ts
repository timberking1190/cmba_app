import { leagueDate, leagueDateTime, leagueDayKey, leagueHhMm, leagueTime } from './leagueTime'
import type { GameStatus } from './scheduleUtils'

/*
 * The shape the scheduling consoles render, and the mapper from a Payload game
 * doc (depth 1) to it. Client safe: no server imports, so the type can cross the
 * server to client boundary and the console can update a row from an API reply
 * without a page refresh.
 *
 * Everything a human reads is precomputed here in the league time zone, in 12
 * hour time. The raw ISO instant and the raw ids travel too, because the edit
 * panel needs them to prefill its form and to send a change back.
 */

export type AdminGameOfficial = { id: string | number; name: string; role: string }

export type AdminGame = {
  id: number | string
  status: GameStatus
  publishState: string

  homeTeam: string
  awayTeam: string
  homeTeamId: string | number | null
  awayTeamId: string | number | null

  division: string
  divisionId: string | number | null

  /** The stored instant, for the edit form and for sorting. */
  startAt: string | null
  /** "Sat, Jan 10, 6:00 PM" in the league time zone. */
  date: string
  /** "Sat, Jan 10" and "6:00 PM" split out, for table layouts. */
  dayLabel: string
  timeLabel: string
  /** YYYY-MM-DD and HH:MM league wall time, for prefilling the edit inputs. */
  dateInput: string
  timeInput: string

  venue: string
  venueId: string | number | null
  court: string
  courtId: string | number | null

  homeScore?: number | null
  awayScore?: number | null

  /** Set when the game is a forfeit, so the console can say who forfeited. */
  forfeitOutcome?: string | null
  forfeitingTeam?: string | null

  officials: AdminGameOfficial[]

  disputeReason?: string
  isBye?: boolean
}

const relId = (r: unknown): string | number | null => {
  if (r == null) return null
  if (typeof r === 'object') return (r as { id: string | number }).id ?? null
  return r as string | number
}
const rel = (r: unknown, ...f: string[]) =>
  r && typeof r === 'object' ? (f.map((k) => (r as Record<string, string>)[k]).find(Boolean) ?? '') : ''

const FORFEIT_LABEL: Record<string, string> = {
  home_forfeit: 'Home team forfeited',
  away_forfeit: 'Away team forfeited',
  double_forfeit: 'Both teams forfeited',
  no_contest: 'No contest, excluded from the standings',
}

/** Plain wording for a forfeit outcome, with the real team name filled in. */
export function forfeitSentence(g: Pick<AdminGame, 'forfeitOutcome' | 'homeTeam' | 'awayTeam'>): string | null {
  const o = g.forfeitOutcome
  if (!o) return null
  if (o === 'home_forfeit') return `${g.homeTeam || 'The home team'} forfeited, so ${g.awayTeam || 'the away team'} takes the win.`
  if (o === 'away_forfeit') return `${g.awayTeam || 'The away team'} forfeited, so ${g.homeTeam || 'the home team'} takes the win.`
  return FORFEIT_LABEL[o] ?? null
}

export function toAdminGame(g: Record<string, unknown>, assignments: Array<Record<string, unknown>> = []): AdminGame {
  const startAt = g.startAt ? String(g.startAt) : null
  const forfeit = (g.forfeit ?? {}) as { outcome?: string | null; forfeitingTeam?: unknown }
  const gameId = g.id as number | string

  const officials: AdminGameOfficial[] = assignments
    .filter((a) => String(relId(a.game) ?? '') === String(gameId))
    .map((a) => ({ id: relId(a.official) ?? '', name: rel(a.official, 'name') || 'An official', role: String(a.role ?? 'referee1') }))

  return {
    id: gameId,
    status: ((g.status as GameStatus) ?? 'scheduled') as GameStatus,
    publishState: (g.publishState as string) ?? 'draft',

    homeTeam: rel(g.homeTeam, 'name'),
    awayTeam: rel(g.awayTeam, 'name'),
    homeTeamId: relId(g.homeTeam),
    awayTeamId: relId(g.awayTeam),

    division: rel(g.division, 'displayLabel', 'fullPath'),
    divisionId: relId(g.division),

    startAt,
    date: leagueDateTime(startAt),
    dayLabel: leagueDate(startAt),
    timeLabel: startAt ? leagueTime(startAt) : 'Time to be confirmed',
    dateInput: startAt ? leagueDayKey(startAt) : '',
    timeInput: startAt ? leagueHhMm(startAt) : '',

    venue: rel(g.venue, 'name'),
    venueId: relId(g.venue),
    court: rel(g.court, 'name'),
    courtId: relId(g.court),

    homeScore: (g.homeScore as number | null) ?? null,
    awayScore: (g.awayScore as number | null) ?? null,

    forfeitOutcome: forfeit.outcome ?? null,
    forfeitingTeam: (() => {
      const t = relId(forfeit.forfeitingTeam)
      if (t == null) return null
      const home = relId(g.homeTeam)
      return String(t) === String(home) ? rel(g.homeTeam, 'name') : rel(g.awayTeam, 'name')
    })(),

    officials,
    isBye: Boolean(g.isBye),
  }
}
