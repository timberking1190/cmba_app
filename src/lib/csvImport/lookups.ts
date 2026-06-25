import type { Payload, Where } from 'payload'

import type { ConflictGame } from '../conflicts/detect'
import type { Lookups } from './validate'

/*
 * Build the injected lookup maps the pure CSV validators need, from the current
 * database state, plus the already-published games used for conflict detection.
 * Matching is case-insensitive and trimmed, mirroring the validators.
 */
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()
const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

const TZ = 'America/Edmonton'
const dDate = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ })
const dTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })

export type OfficialRef = { id: string | number; rampLevel?: string | null; maxGamesPerDay?: number | null; email?: string | null }

export type ImportLookups = Lookups & {
  divisionsRamp: Map<string, string> // normalized fullPath -> requiredRampLevel
  officialsFull: Map<string, OfficialRef> // normalized name -> official
  teamClub: Map<string, string | number | undefined> // teamId -> clubId
}

export async function buildLookups(payload: Payload, seasonId?: string | number): Promise<ImportLookups> {
  const divWhere: Where = seasonId != null ? { season: { equals: seasonId } } : {}
  const divisions = await payload.find({ collection: 'divisions', where: divWhere, limit: 1000, depth: 0, overrideAccess: true })
  const divisionsByPath = new Map<string, { id: string | number }>()
  const divisionsRamp = new Map<string, string>()
  const divIds: (string | number)[] = []
  for (const d of divisions.docs as Array<{ id: string | number; fullPath?: string; requiredRampLevel?: string }>) {
    divisionsByPath.set(norm(d.fullPath), { id: d.id })
    divisionsRamp.set(norm(d.fullPath), d.requiredRampLevel ?? 'none')
    divIds.push(d.id)
  }

  const teams = await payload.find({ collection: 'teams', where: divIds.length ? { division: { in: divIds } } : {}, limit: 5000, depth: 0, overrideAccess: true })
  const teamsByDivisionAndName = new Map<string, { id: string | number }>()
  const teamClub = new Map<string, string | number | undefined>()
  for (const t of teams.docs as Array<{ id: string | number; name?: string; division?: unknown; club?: unknown }>) {
    teamsByDivisionAndName.set(`${relId(t.division)}|${norm(t.name)}`, { id: t.id })
    teamClub.set(String(t.id), relId(t.club))
  }

  const venues = await payload.find({ collection: 'venues', limit: 2000, depth: 0, overrideAccess: true })
  const venuesByName = new Map<string, { id: string | number }>()
  for (const v of venues.docs as Array<{ id: string | number; name?: string }>) venuesByName.set(norm(v.name), { id: v.id })

  const courts = await payload.find({ collection: 'courts', limit: 5000, depth: 0, overrideAccess: true })
  const courtsByVenueAndName = new Map<string, { id: string | number }>()
  for (const c of courts.docs as Array<{ id: string | number; name?: string; venue?: unknown }>) courtsByVenueAndName.set(`${relId(c.venue)}|${norm(c.name)}`, { id: c.id })

  const officials = await payload.find({ collection: 'officials', limit: 2000, depth: 0, overrideAccess: true })
  const officialsByName = new Map<string, { id: string | number }>()
  const officialsFull = new Map<string, OfficialRef>()
  for (const o of officials.docs as Array<{ id: string | number; name?: string; rampLevel?: string; maxGamesPerDay?: number; email?: string }>) {
    officialsByName.set(norm(o.name), { id: o.id })
    officialsFull.set(norm(o.name), { id: o.id, rampLevel: o.rampLevel, maxGamesPerDay: o.maxGamesPerDay, email: o.email })
  }

  const clubs = await payload.find({ collection: 'clubs', limit: 2000, depth: 0, overrideAccess: true })
  const clubsByName = new Map<string, { id: string | number }>()
  for (const c of clubs.docs as Array<{ id: string | number; name?: string }>) clubsByName.set(norm(c.name), { id: c.id })

  // Existing published games for the duplicate-game warning, keyed div|home|away|date|time.
  const existingGameKeys = new Set<string>()
  if (divIds.length) {
    const games = await payload.find({ collection: 'games', where: { and: [{ division: { in: divIds } }, { isBye: { not_equals: true } }] }, limit: 5000, depth: 1, overrideAccess: true })
    for (const g of games.docs as Array<{ startAt?: string; division?: { fullPath?: string }; homeTeam?: { name?: string }; awayTeam?: { name?: string } }>) {
      if (!g.startAt) continue
      const dt = new Date(g.startAt)
      const dateStr = dDate.format(dt) // en-CA yields YYYY-MM-DD
      const time = dTime.format(dt) // en-GB 24h yields HH:MM
      existingGameKeys.add(`${norm(g.division?.fullPath)}|${norm(g.homeTeam?.name)}|${norm(g.awayTeam?.name)}|${dateStr}|${time}`)
    }
  }

  return { divisionsByPath, teamsByDivisionAndName, venuesByName, courtsByVenueAndName, officialsByName, clubsByName, existingGameKeys, divisionsRamp, officialsFull, teamClub }
}

/* Published games shaped for the conflict engine (with their assigned officials). */
export async function publishedConflictGames(payload: Payload, seasonId?: string | number): Promise<ConflictGame[]> {
  const where: Where = seasonId != null ? { and: [{ season: { equals: seasonId } }, { publishState: { equals: 'published' } }] } : { publishState: { equals: 'published' } }
  const games = await payload.find({ collection: 'games', where, limit: 5000, depth: 0, overrideAccess: true })
  const out: ConflictGame[] = []
  const gameIds: (string | number)[] = []
  const byId = new Map<string, ConflictGame>()
  for (const g of games.docs as Array<{ id: string | number; startAt?: string; venue?: unknown; court?: unknown; homeTeam?: unknown; awayTeam?: unknown; isBye?: boolean }>) {
    const cg: ConflictGame = { id: g.id, startAt: g.startAt ?? '', venueId: relId(g.venue), courtId: relId(g.court), homeTeamId: relId(g.homeTeam)!, awayTeamId: relId(g.awayTeam)!, officialIds: [], isBye: g.isBye }
    out.push(cg)
    gameIds.push(g.id)
    byId.set(String(g.id), cg)
  }
  if (gameIds.length) {
    const assigns = await payload.find({ collection: 'game-officials', where: { game: { in: gameIds } }, limit: 10000, depth: 0, overrideAccess: true })
    for (const a of assigns.docs as Array<{ game?: unknown; official?: unknown }>) {
      const cg = byId.get(String(relId(a.game)))
      if (cg) (cg.officialIds as (string | number)[]).push(relId(a.official)!)
    }
  }
  return out
}
