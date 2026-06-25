import type { Payload } from 'payload'

import type { ForfeitOutcome } from '../gameStateMachine'
import type { StandingRow } from '../scheduleUtils'
import { buildInputsHash, computeStandings, type StandingsConfig, type StandingsGame, type Tiebreaker } from './computeStandings'

/*
 * Server orchestrator for standings. computeStandings is pure; this is the only
 * piece that touches the database. recomputeDivision reads the PUBLISHED final and
 * forfeit games for a division (pinned sort so the result is deterministic), runs
 * the pure engine, and upserts the StandingsCache only when the inputs changed.
 * Standings are computed, not stored as the source of truth.
 */

type Rel = string | number | { id: string | number; name?: string | null } | null | undefined
const relId = (r: Rel): string | number | undefined => (r == null ? undefined : typeof r === 'object' ? r.id : r)
const relName = (r: Rel): string => (r && typeof r === 'object' ? r.name ?? '' : '')

const DEFAULT_TIEBREAKERS: Tiebreaker[] = ['headToHead', 'pointDiff', 'pointsFor']

type SeasonDoc = {
  seasonSeed?: number | null
  status?: string | null
  standingsConfig?: (Omit<Partial<StandingsConfig>, 'tiebreakers'> & { tiebreakers?: Array<{ criterion?: Tiebreaker }>; legend?: string }) | null
}

function configFromSeason(season: SeasonDoc | null): { config: StandingsConfig; legend: string } {
  const c = season?.standingsConfig ?? {}
  const tb = (c.tiebreakers ?? []).map((t) => t.criterion).filter(Boolean) as Tiebreaker[]
  const config: StandingsConfig = {
    pointsWin: c.pointsWin ?? 2,
    pointsLoss: c.pointsLoss ?? 0,
    pointsTie: c.pointsTie ?? 1,
    tiebreakers: tb.length ? tb : DEFAULT_TIEBREAKERS,
    pointDiffCap: c.pointDiffCap ?? 40,
    mercyEnabled: c.mercyEnabled ?? true,
    includeForfeits: c.includeForfeits ?? true,
    forfeitScoreFor: c.forfeitScoreFor ?? 20,
    forfeitScoreAgainst: c.forfeitScoreAgainst ?? 0,
    forfeitWinPoints: c.forfeitWinPoints ?? 2,
    forfeitPenaltyPoints: c.forfeitPenaltyPoints ?? 0,
    pointsForBasis: c.pointsForBasis ?? 'capped',
  }
  return { config, legend: c.legend ?? '' }
}

type GameDoc = {
  id: string | number
  startAt: string
  homeTeam: Rel
  awayTeam: Rel
  status: 'final' | 'forfeit'
  homeScore?: number | null
  awayScore?: number | null
  forfeit?: { outcome?: string | null; forfeitingTeam?: Rel } | null
  isBye?: boolean | null
}

function toInput(g: GameDoc): StandingsGame {
  return {
    id: g.id,
    startAt: g.startAt,
    homeTeamId: relId(g.homeTeam)!,
    homeTeamName: relName(g.homeTeam),
    awayTeamId: relId(g.awayTeam)!,
    awayTeamName: relName(g.awayTeam),
    status: g.status,
    homeScore: g.homeScore,
    awayScore: g.awayScore,
    forfeit: g.forfeit
      ? { outcome: (g.forfeit.outcome ?? null) as ForfeitOutcome | null, forfeitingTeamId: relId(g.forfeit.forfeitingTeam) ?? null }
      : null,
    isBye: g.isBye,
  }
}

export async function recomputeDivision(payload: Payload, divisionId: string | number): Promise<void> {
  const division = await payload.findByID({ collection: 'divisions', id: divisionId, depth: 1, overrideAccess: true }).catch(() => null)
  if (!division) return

  const season = (typeof division.season === 'object' ? division.season : null) as SeasonDoc | null
  const { config, legend } = configFromSeason(season)
  const seasonSeed = season?.seasonSeed ?? 0
  const seasonStatus = season?.status ?? ''
  const displayLabel = (division as { displayLabel?: string; fullPath?: string }).displayLabel || (division as { fullPath?: string }).fullPath || ''

  const res = await payload.find({
    collection: 'games',
    where: { and: [{ division: { equals: divisionId } }, { status: { in: ['final', 'forfeit'] } }, { publishState: { equals: 'published' } }] },
    sort: ['startAt', 'id'],
    depth: 1,
    limit: 1000,
    overrideAccess: true,
  })
  const games = (res.docs as unknown as GameDoc[]).map(toInput)
  const hash = buildInputsHash(games, config, seasonSeed)

  const existing = await payload.find({ collection: 'standings-cache', where: { division: { equals: divisionId } }, limit: 1, overrideAccess: true })
  const cur = existing.docs[0] as { id: string | number; inputsHash?: string; seasonStatus?: string } | undefined
  if (cur && cur.inputsHash === hash && cur.seasonStatus === seasonStatus) return // nothing relevant changed

  const rows = computeStandings(games, config, seasonSeed).map((r) => ({ ...r, division: displayLabel }))
  const data = { division: divisionId, rows, inputsHash: hash, computedAt: new Date().toISOString(), legend, seasonStatus } as never
  if (cur) await payload.update({ collection: 'standings-cache', id: cur.id, data, overrideAccess: true })
  else await payload.create({ collection: 'standings-cache', data, overrideAccess: true })
}

export async function getDivisionStandings(payload: Payload, divisionId: string | number): Promise<StandingRow[]> {
  const res = await payload.find({ collection: 'standings-cache', where: { division: { equals: divisionId } }, limit: 1, depth: 0, overrideAccess: true })
  const doc = res.docs[0] as { rows?: StandingRow[] } | undefined
  return doc?.rows ?? []
}

export async function getLeagueStandings(payload: Payload): Promise<StandingRow[]> {
  const res = await payload.find({
    collection: 'standings-cache',
    where: { seasonStatus: { in: ['active', 'playoffs', 'complete'] } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  const out: StandingRow[] = []
  for (const doc of res.docs as Array<{ rows?: StandingRow[] }>) {
    out.push(...(doc.rows ?? []))
  }
  return out
}
