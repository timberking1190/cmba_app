import 'server-only'

import { getPayloadClient } from './auth'
import { getDivisionStandings, getLeagueStandings } from './standings'
import { type Game, type GameStatus, type StandingRow } from './scheduleUtils'

/*
 * Server-only data layer for schedule and standings, backed by our own Payload
 * data (this app is now the source of truth). Replaces the TeamLinkt scrape in
 * teamlinkt.ts. While FEATURE_LEGACY_TEAMLINKT is on (the default until a season is
 * seeded and the B4 non-blank gate passes), an empty or failed read falls back to
 * the legacy TeamLinkt layer so the public pages never go blank during the
 * transition. Dates never cross the server to client boundary as Date objects; the
 * page serializes them and passes a server now.
 */
export * from './scheduleUtils'
export { getTeamLinktConfig } from './teamlinkt'

const LEGACY = process.env.FEATURE_LEGACY_TEAMLINKT !== 'false'
const TZ = 'America/Edmonton'

const dateFmt = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ })
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })

type Rel = string | number | { id?: string | number; name?: string | null; displayLabel?: string | null; fullPath?: string | null } | null | undefined
function label(rel: Rel, ...fields: Array<'name' | 'displayLabel' | 'fullPath'>): string {
  if (rel && typeof rel === 'object') {
    for (const f of fields) {
      const v = rel[f]
      if (v) return v
    }
  }
  return ''
}

type GameDoc = {
  id: string | number
  startAt?: string | null
  homeTeam?: Rel
  awayTeam?: Rel
  venue?: Rel
  division?: Rel
  homeScore?: number | null
  awayScore?: number | null
  status?: string | null
}

function toGame(g: GameDoc): Game {
  const start = g.startAt ? new Date(g.startAt) : null
  return {
    id: String(g.id),
    date: start ? dateFmt.format(start) : '',
    time: start ? timeFmt.format(start) : '',
    start,
    homeTeam: label(g.homeTeam, 'name'),
    awayTeam: label(g.awayTeam, 'name'),
    location: label(g.venue, 'name'),
    homeScore: g.homeScore ?? null,
    awayScore: g.awayScore ?? null,
    status: (g.status ?? 'scheduled') as GameStatus,
    division: label(g.division, 'displayLabel', 'fullPath'),
  }
}

/*
 * Where the data on the page came from, so the UI can label it honestly:
 *   'own'    -> served from our own Payload data (this app is the source of truth)
 *   'legacy' -> our data was empty, so we fell back to the TeamLinkt read-only view
 *   'empty'  -> neither returned anything (fresh season, or both unavailable)
 */
export type ScheduleSource = 'own' | 'legacy' | 'empty'

export async function getEventsWithSource(): Promise<{ games: Game[]; source: ScheduleSource }> {
  const payload = await getPayloadClient()
  try {
    const res = await payload.find({
      collection: 'games',
      where: { and: [{ publishState: { equals: 'published' } }, { isBye: { not_equals: true } }] },
      sort: ['startAt', 'id'],
      depth: 1,
      limit: 1000,
      overrideAccess: true,
    })
    const games = (res.docs as unknown as GameDoc[]).map(toGame)
    if (games.length) return { games, source: 'own' }
  } catch (err) {
    payload.logger.error(`cmbaSchedule.getEvents failed: ${String(err)}`)
  }
  if (LEGACY) {
    try {
      const legacy = await import('./teamlinkt')
      const games = await legacy.getEvents()
      if (games.length) return { games, source: 'legacy' }
    } catch {
      /* fall through to empty */
    }
  }
  return { games: [], source: 'empty' }
}

export async function getStandingsWithSource(
  divisionId?: string | number,
): Promise<{ rows: StandingRow[]; source: ScheduleSource }> {
  const payload = await getPayloadClient()
  try {
    const rows = divisionId != null ? await getDivisionStandings(payload, divisionId) : await getLeagueStandings(payload)
    if (rows.length) return { rows, source: 'own' }
  } catch (err) {
    payload.logger.error(`cmbaSchedule.getStandings failed: ${String(err)}`)
  }
  if (LEGACY) {
    try {
      const legacy = await import('./teamlinkt')
      const rows = await legacy.getStandings()
      if (rows.length) return { rows, source: 'legacy' }
    } catch {
      /* fall through to empty */
    }
  }
  return { rows: [], source: 'empty' }
}

// Backward-compatible wrappers (the page code uses the *WithSource variants now).
export async function getEvents(): Promise<Game[]> {
  return (await getEventsWithSource()).games
}

export async function getStandings(divisionId?: string | number): Promise<StandingRow[]> {
  return (await getStandingsWithSource(divisionId)).rows
}
