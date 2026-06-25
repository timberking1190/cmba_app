import { createHash } from 'crypto'

import type { ForfeitOutcome } from '../gameStateMachine'
import type { StandingRow } from '../scheduleUtils'

/*
 * Pure standings engine. No I/O, deterministic, idempotent. Given the final and
 * forfeit games of a division plus the season standings config and the immutable
 * season seed, it produces a fully ordered StandingRow[] where every row carries a
 * server-assigned integer rank. The order is a TOTAL order: after the configured
 * tiebreakers and head to head, ties are always broken by the stable key
 * (seasonSeed, teamId), so the ranking can never loop and never depends on input
 * order. The client renders this rank and never re-sorts.
 */

export type Tiebreaker = 'headToHead' | 'winPct' | 'pointDiff' | 'pointsFor' | 'fewestPointsAgainst' | 'wins'

export type StandingsConfig = {
  pointsWin: number
  pointsLoss: number
  pointsTie: number
  tiebreakers: Tiebreaker[]
  pointDiffCap: number
  mercyEnabled: boolean
  includeForfeits: boolean
  forfeitScoreFor: number
  forfeitScoreAgainst: number
  forfeitWinPoints: number
  forfeitPenaltyPoints: number
  pointsForBasis: 'capped' | 'raw'
}

export type StandingsGame = {
  id: string | number
  startAt: string // ISO timestamp; used for ordering, streak, and last five
  homeTeamId: string | number
  homeTeamName: string
  awayTeamId: string | number
  awayTeamName: string
  status: 'final' | 'forfeit'
  homeScore?: number | null
  awayScore?: number | null
  forfeit?: { outcome?: ForfeitOutcome | null; forfeitingTeamId?: string | number | null } | null
  isBye?: boolean | null
}

type Outcome = 'W' | 'L' | 'T'

type Acc = {
  teamId: string | number
  name: string
  gp: number
  w: number
  l: number
  t: number
  pf: number // raw points for (PF column)
  pa: number // raw points against (PA column)
  diff: number // capped differential (DIFF column and the pointDiff tiebreaker)
  pfCapped: number // capped points for (the pointsFor tiebreaker when basis is capped)
  pts: number
  timeline: { at: string; id: string | number; result: Outcome }[]
}

const key = (id: string | number) => String(id)
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

function byStartThenId(a: StandingsGame, b: StandingsGame): number {
  const at = new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  if (at !== 0) return at
  return key(a.id) < key(b.id) ? -1 : key(a.id) > key(b.id) ? 1 : 0
}

/* A final or forfeit game that should count: not a bye, not a no-contest, and
 * forfeits only when the config includes them. */
function counts(g: StandingsGame, config: StandingsConfig): boolean {
  if (g.isBye) return false
  if (g.status === 'forfeit') {
    if (!config.includeForfeits) return false
    if (g.forfeit?.outcome === 'no_contest') return false
  }
  return true
}

export function computeStandings(
  games: StandingsGame[],
  config: StandingsConfig,
  seasonSeed: number,
): StandingRow[] {
  // Defensive canonical ordering so the result is independent of caller order.
  const ordered = [...games].filter((g) => counts(g, config)).sort(byStartThenId)

  const accs = new Map<string, Acc>()
  const get = (id: string | number, name: string): Acc => {
    const k = key(id)
    let a = accs.get(k)
    if (!a) {
      a = { teamId: id, name, gp: 0, w: 0, l: 0, t: 0, pf: 0, pa: 0, diff: 0, pfCapped: 0, pts: 0, timeline: [] }
      accs.set(k, a)
    }
    // keep the latest non-empty name we see
    if (name) a.name = name
    return a
  }

  const cap = config.pointDiffCap
  const cappedMargin = (margin: number) => (config.mercyEnabled ? clamp(margin, -cap, cap) : margin)
  const cappedFor = (ownScore: number, oppScore: number) =>
    config.mercyEnabled ? Math.min(ownScore, oppScore + cap) : ownScore

  const recordSide = (
    acc: Acc,
    g: StandingsGame,
    forScore: number,
    againstScore: number,
    outcome: Outcome,
    pts: number,
  ) => {
    acc.gp += 1
    acc.pf += forScore
    acc.pa += againstScore
    acc.diff += cappedMargin(forScore - againstScore)
    acc.pfCapped += cappedFor(forScore, againstScore)
    acc.pts += pts
    if (outcome === 'W') acc.w += 1
    else if (outcome === 'L') acc.l += 1
    else acc.t += 1
    acc.timeline.push({ at: g.startAt, id: g.id, result: outcome })
  }

  for (const g of ordered) {
    const home = get(g.homeTeamId, g.homeTeamName)
    const away = get(g.awayTeamId, g.awayTeamName)

    if (g.status === 'forfeit') {
      const outcome = g.forfeit?.outcome
      const fs = config.forfeitScoreFor
      const fa = config.forfeitScoreAgainst
      const winPts = config.forfeitWinPoints
      const losePts = config.pointsLoss - config.forfeitPenaltyPoints
      if (outcome === 'double_forfeit') {
        // Both teams take a loss; nobody is credited a win.
        recordSide(home, g, fa, fs, 'L', losePts)
        recordSide(away, g, fa, fs, 'L', losePts)
      } else {
        // home_forfeit: home forfeits, away wins. away_forfeit: the reverse.
        // Default to home_forfeit when the outcome is missing but the game is a forfeit.
        const homeForfeits = outcome !== 'away_forfeit'
        const winner = homeForfeits ? away : home
        const loser = homeForfeits ? home : away
        recordSide(winner, g, fs, fa, 'W', winPts)
        recordSide(loser, g, fa, fs, 'L', losePts)
      }
      continue
    }

    // Played final game.
    const hs = g.homeScore
    const as = g.awayScore
    if (hs == null || as == null) continue // a final game without scores is skipped defensively
    if (hs > as) {
      recordSide(home, g, hs, as, 'W', config.pointsWin)
      recordSide(away, g, as, hs, 'L', config.pointsLoss)
    } else if (hs < as) {
      recordSide(home, g, hs, as, 'L', config.pointsLoss)
      recordSide(away, g, as, hs, 'W', config.pointsWin)
    } else {
      recordSide(home, g, hs, as, 'T', config.pointsTie)
      recordSide(away, g, as, hs, 'T', config.pointsTie)
    }
  }

  const ranked = rankAccs([...accs.values()], config, ordered, seasonSeed)
  return ranked.map((a, i) => toRow(a, i + 1))
}

const winPct = (a: Acc) => (a.gp === 0 ? 0 : a.w / a.gp)

function valueOf(a: Acc, crit: Tiebreaker, config: StandingsConfig): { value: number; asc: boolean } {
  switch (crit) {
    case 'winPct':
      return { value: winPct(a), asc: false }
    case 'pointDiff':
      return { value: a.diff, asc: false }
    case 'pointsFor':
      return { value: config.pointsForBasis === 'capped' ? a.pfCapped : a.pf, asc: false }
    case 'fewestPointsAgainst':
      return { value: a.pa, asc: true } // lower is better
    case 'wins':
      return { value: a.w, asc: false }
    default:
      return { value: 0, asc: false }
  }
}

/*
 * Head to head among the EXACT tied set. Returns usable=true only when every pair
 * in the set has played at least once AND the resulting head-to-head points are
 * strictly distinct across the set. Otherwise it is skipped entirely (never
 * applied partially), so a rock paper scissors cycle or an unbalanced schedule
 * falls through to the next criterion on the whole still-tied set.
 */
function headToHead(group: Acc[], games: StandingsGame[], config: StandingsConfig): { usable: boolean; points: Map<string, number> } {
  const ids = new Set(group.map((a) => key(a.teamId)))
  const points = new Map<string, number>()
  for (const a of group) points.set(key(a.teamId), 0)

  const played = new Set<string>() // unordered "a|b" pairs that have played
  const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`)

  for (const g of games) {
    const h = key(g.homeTeamId)
    const v = key(g.awayTeamId)
    if (!ids.has(h) || !ids.has(v)) continue
    played.add(pairKey(h, v))
    if (g.status === 'forfeit') {
      const outcome = g.forfeit?.outcome
      if (outcome === 'no_contest' || !config.includeForfeits) continue
      if (outcome === 'double_forfeit') {
        points.set(h, (points.get(h) ?? 0) + (config.pointsLoss - config.forfeitPenaltyPoints))
        points.set(v, (points.get(v) ?? 0) + (config.pointsLoss - config.forfeitPenaltyPoints))
      } else {
        const homeForfeits = outcome !== 'away_forfeit'
        const winner = homeForfeits ? v : h
        const loser = homeForfeits ? h : v
        points.set(winner, (points.get(winner) ?? 0) + config.forfeitWinPoints)
        points.set(loser, (points.get(loser) ?? 0) + (config.pointsLoss - config.forfeitPenaltyPoints))
      }
      continue
    }
    if (g.homeScore == null || g.awayScore == null) continue
    if (g.homeScore > g.awayScore) {
      points.set(h, (points.get(h) ?? 0) + config.pointsWin)
      points.set(v, (points.get(v) ?? 0) + config.pointsLoss)
    } else if (g.homeScore < g.awayScore) {
      points.set(h, (points.get(h) ?? 0) + config.pointsLoss)
      points.set(v, (points.get(v) ?? 0) + config.pointsWin)
    } else {
      points.set(h, (points.get(h) ?? 0) + config.pointsTie)
      points.set(v, (points.get(v) ?? 0) + config.pointsTie)
    }
  }

  // Every pair must have played.
  const groupIds = group.map((a) => key(a.teamId))
  for (let i = 0; i < groupIds.length; i++) {
    for (let j = i + 1; j < groupIds.length; j++) {
      if (!played.has(pairKey(groupIds[i], groupIds[j]))) return { usable: false, points }
    }
  }
  // Points must be strictly distinct across the set.
  const vals = groupIds.map((id) => points.get(id) ?? 0)
  if (new Set(vals).size !== vals.length) return { usable: false, points }
  return { usable: true, points }
}

function finalKey(a: Acc, seasonSeed: number): [number, number] {
  // seasonSeed is constant within a season, so this reduces to teamId ordering,
  // but keeping the seed first lets the key vary across seasons. Numeric team ids
  // sort numerically; non-numeric fall back to a stable string compare via charCode.
  const idNum = Number(a.teamId)
  return [seasonSeed, Number.isFinite(idNum) ? idNum : hashStr(String(a.teamId))]
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

function applyTiebreakers(
  group: Acc[],
  config: StandingsConfig,
  idx: number,
  games: StandingsGame[],
  seasonSeed: number,
): Acc[] {
  if (group.length <= 1) return group
  if (idx >= config.tiebreakers.length) {
    // Absolute final deterministic tiebreaker: (seasonSeed, teamId) ascending.
    return [...group].sort((a, b) => {
      const [s1, i1] = finalKey(a, seasonSeed)
      const [s2, i2] = finalKey(b, seasonSeed)
      return s1 - s2 || i1 - i2
    })
  }

  const crit = config.tiebreakers[idx]

  if (crit === 'headToHead') {
    const h2h = headToHead(group, games, config)
    if (!h2h.usable) return applyTiebreakers(group, config, idx + 1, games, seasonSeed)
    // Strictly distinct points fully order the group.
    return [...group].sort((a, b) => (h2h.points.get(key(b.teamId)) ?? 0) - (h2h.points.get(key(a.teamId)) ?? 0))
  }

  // Numeric criterion: sort, then sub-group equal values and recurse with idx+1.
  const valued = group.map((a) => ({ a, ...valueOf(a, crit, config) }))
  valued.sort((x, y) => (x.asc ? x.value - y.value : y.value - x.value))

  const out: Acc[] = []
  let i = 0
  while (i < valued.length) {
    let j = i + 1
    while (j < valued.length && valued[j].value === valued[i].value) j++
    const sub = valued.slice(i, j).map((v) => v.a)
    out.push(...(sub.length > 1 ? applyTiebreakers(sub, config, idx + 1, games, seasonSeed) : sub))
    i = j
  }
  return out
}

function rankAccs(accs: Acc[], config: StandingsConfig, games: StandingsGame[], seasonSeed: number): Acc[] {
  // Primary: points descending, grouped, then tiebreakers within each tied group.
  const byPts = [...accs].sort((a, b) => b.pts - a.pts)
  const out: Acc[] = []
  let i = 0
  while (i < byPts.length) {
    let j = i + 1
    while (j < byPts.length && byPts[j].pts === byPts[i].pts) j++
    const group = byPts.slice(i, j)
    out.push(...(group.length > 1 ? applyTiebreakers(group, config, 0, games, seasonSeed) : group))
    i = j
  }
  return out
}

function streakOf(timeline: Acc['timeline']): string {
  if (timeline.length === 0) return ''
  const last = timeline[timeline.length - 1].result
  let n = 0
  for (let i = timeline.length - 1; i >= 0 && timeline[i].result === last; i--) n++
  return `${last}${n}`
}

function lastFiveOf(timeline: Acc['timeline']): string {
  return timeline.slice(-5).map((r) => r.result).join('')
}

function toRow(a: Acc, rank: number): StandingRow {
  return {
    team: a.name,
    teamId: a.teamId,
    gp: a.gp,
    w: a.w,
    l: a.l,
    t: a.t,
    pts: a.pts,
    pf: a.pf,
    pa: a.pa,
    diff: a.diff,
    rank,
    streak: streakOf(a.timeline),
    lastFive: lastFiveOf(a.timeline),
  }
}

/*
 * A stable hash of the canonical-ordered final games plus the config plus the seed.
 * recomputeDivision uses it to skip the cache upsert when nothing relevant changed.
 */
export function buildInputsHash(games: StandingsGame[], config: StandingsConfig, seasonSeed: number): string {
  const ordered = [...games].filter((g) => counts(g, config)).sort(byStartThenId)
  const tuples = ordered.map((g) => [
    key(g.id),
    g.status,
    key(g.homeTeamId),
    key(g.awayTeamId),
    g.homeScore ?? null,
    g.awayScore ?? null,
    g.forfeit?.outcome ?? null,
    g.forfeit?.forfeitingTeamId != null ? key(g.forfeit.forfeitingTeamId) : null,
  ])
  return createHash('sha256').update(JSON.stringify({ tuples, config, seasonSeed })).digest('hex')
}
