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

export async function getEvents(): Promise<Game[]> {
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
    if (games.length) return games
  } catch (err) {
    payload.logger.error(`cmbaSchedule.getEvents failed: ${String(err)}`)
  }
  if (LEGACY) {
    try {
      const legacy = await import('./teamlinkt')
      return legacy.getEvents()
    } catch {
      return []
    }
  }
  return []
}

export async function getStandings(divisionId?: string | number): Promise<StandingRow[]> {
  const payload = await getPayloadClient()
  try {
    const rows = divisionId != null ? await getDivisionStandings(payload, divisionId) : await getLeagueStandings(payload)
    if (rows.length) return rows
  } catch (err) {
    payload.logger.error(`cmbaSchedule.getStandings failed: ${String(err)}`)
  }
  if (LEGACY) {
    try {
      const legacy = await import('./teamlinkt')
      return legacy.getStandings()
    } catch {
      return []
    }
  }
  return []
}
