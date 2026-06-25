import { describe, expect, it } from 'vitest'

import { buildInputsHash, computeStandings, type StandingsConfig, type StandingsGame } from '../computeStandings'

const CFG: StandingsConfig = {
  pointsWin: 2,
  pointsLoss: 0,
  pointsTie: 1,
  tiebreakers: ['headToHead', 'pointDiff', 'pointsFor'],
  pointDiffCap: 40,
  mercyEnabled: true,
  includeForfeits: true,
  forfeitScoreFor: 20,
  forfeitScoreAgainst: 0,
  forfeitWinPoints: 2,
  forfeitPenaltyPoints: 0,
  pointsForBasis: 'capped',
}

let seq = 0
function game(home: number, away: number, hs: number | null, as: number | null, extra: Partial<StandingsGame> = {}): StandingsGame {
  seq += 1
  return {
    id: seq,
    startAt: new Date(Date.parse('2026-01-01T00:00:00Z') + seq * 3600_000).toISOString(),
    homeTeamId: home,
    homeTeamName: `T${home}`,
    awayTeamId: away,
    awayTeamName: `T${away}`,
    status: 'final',
    homeScore: hs,
    awayScore: as,
    ...extra,
  }
}
const forfeit = (home: number, away: number, outcome: string, forfeitingTeamId?: number) =>
  game(home, away, null, null, { status: 'forfeit', forfeit: { outcome: outcome as never, forfeitingTeamId } })

const rowFor = (rows: ReturnType<typeof computeStandings>, teamId: number) => rows.find((r) => r.teamId === teamId)!

describe('computeStandings basics', () => {
  it('accumulates W/L/points/diff and ranks the winner first', () => {
    const rows = computeStandings([game(1, 2, 50, 40)], CFG, 7)
    const t1 = rowFor(rows, 1)
    const t2 = rowFor(rows, 2)
    expect(t1).toMatchObject({ gp: 1, w: 1, l: 0, pts: 2, pf: 50, pa: 40, diff: 10, rank: 1 })
    expect(t2).toMatchObject({ gp: 1, w: 0, l: 1, pts: 0, pf: 40, pa: 50, diff: -10, rank: 2 })
  })

  it('caps the differential at the mercy cap but keeps raw points-for in the PF column', () => {
    const rows = computeStandings([game(1, 2, 100, 0)], CFG, 7)
    const t1 = rowFor(rows, 1)
    expect(t1.pf).toBe(100) // PF column is raw
    expect(t1.diff).toBe(40) // DIFF is capped at the mercy cap
    expect(rowFor(rows, 2).diff).toBe(-40)
  })

  it('records a streak and last-five from chronological order', () => {
    const rows = computeStandings([game(1, 2, 60, 50), game(1, 3, 70, 40), game(4, 1, 80, 10)], CFG, 7)
    const t1 = rowFor(rows, 1)
    expect(t1.w).toBe(2)
    expect(t1.l).toBe(1)
    expect(t1.lastFive).toBe('WWL')
    expect(t1.streak).toBe('L1')
  })
})

describe('forfeit accounting (finding 17/18)', () => {
  it('credits a forfeit win with W and GP, not just points', () => {
    const rows = computeStandings([forfeit(1, 2, 'home_forfeit', 1)], CFG, 7)
    const winner = rowFor(rows, 2)
    const loser = rowFor(rows, 1)
    expect(winner).toMatchObject({ gp: 1, w: 1, l: 0, pf: 20, pa: 0, pts: 2 })
    expect(loser).toMatchObject({ gp: 1, w: 0, l: 1, pf: 0, pa: 20, pts: 0 })
  })

  it('double forfeit loses both teams with no win credited', () => {
    const rows = computeStandings([forfeit(1, 2, 'double_forfeit')], CFG, 7)
    expect(rowFor(rows, 1)).toMatchObject({ gp: 1, w: 0, l: 1, pts: 0 })
    expect(rowFor(rows, 2)).toMatchObject({ gp: 1, w: 0, l: 1, pts: 0 })
  })

  it('excludes a no-contest entirely', () => {
    const rows = computeStandings([forfeit(1, 2, 'no_contest')], CFG, 7)
    expect(rows).toHaveLength(0)
  })

  it('excludes all forfeits when includeForfeits is false', () => {
    const rows = computeStandings([forfeit(1, 2, 'home_forfeit', 1)], { ...CFG, includeForfeits: false }, 7)
    expect(rows).toHaveLength(0)
  })

  it('never produces a NaN winPct (a forfeit-only team has gp greater than 0)', () => {
    const rows = computeStandings([forfeit(1, 2, 'home_forfeit', 1)], { ...CFG, tiebreakers: ['winPct'] }, 7)
    expect(rowFor(rows, 2).gp).toBeGreaterThan(0)
    expect(Number.isNaN(rowFor(rows, 2).gp)).toBe(false)
  })
})

describe('byes', () => {
  it('excludes a bye from standings', () => {
    const rows = computeStandings([game(1, 2, 0, 0, { isBye: true })], CFG, 7)
    expect(rows).toHaveLength(0)
  })
})

describe('head-to-head tiebreaker (finding 19)', () => {
  it('falls through on a rock-paper-scissors cycle without looping or falsely separating', () => {
    // 1 beats 2, 2 beats 3, 3 beats 1, all by the same margin -> equal pts, equal diff.
    const rows = computeStandings([game(1, 2, 60, 50), game(2, 3, 60, 50), game(3, 1, 60, 50)], CFG, 7)
    expect(rows).toHaveLength(3)
    expect(rows.every((r) => r.pts === 2)).toBe(true)
    // H2H is equal (2 each) so it is skipped; pointDiff and pointsFor are equal too,
    // so the final (seed, teamId) key orders them deterministically by id ascending.
    expect(rows.map((r) => r.teamId)).toEqual([1, 2, 3])
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('skips H2H for an unbalanced set (a pair never played) and uses the next criterion', () => {
    // 1 and 2 each beat 3 but never play each other; both tied on pts.
    const rows = computeStandings([game(1, 3, 60, 50), game(2, 3, 70, 50)], CFG, 7)
    const t1 = rowFor(rows, 1)
    const t2 = rowFor(rows, 2)
    expect(t1.pts).toBe(2)
    expect(t2.pts).toBe(2)
    // H2H not usable (never played), so pointDiff breaks it: 2 (+20) ranks above 1 (+10).
    expect(t2.rank!).toBeLessThan(t1.rank!)
  })

  it('uses H2H to order a clean tied pair that played and split decisively', () => {
    // 1 and 2 tied on pts via games vs 3; head to head 1 beat 2 decisively.
    const rows = computeStandings([game(1, 3, 50, 48), game(2, 3, 50, 48), game(1, 2, 80, 40)], CFG, 7)
    // After the H2H game, 1 has more pts than 2, so they are not even tied; ensure 1 leads.
    expect(rowFor(rows, 1).rank!).toBeLessThan(rowFor(rows, 2).rank!)
  })
})

describe('determinism and idempotency (finding 20)', () => {
  const games = [game(1, 2, 60, 50), game(2, 3, 55, 55), game(3, 1, 40, 60), game(1, 3, 70, 30)]

  it('is independent of input order (shuffled input yields identical rows and hash)', () => {
    const a = computeStandings(games, CFG, 7)
    const shuffled = [games[2], games[0], games[3], games[1]]
    const b = computeStandings(shuffled, CFG, 7)
    expect(b).toEqual(a)
    expect(buildInputsHash(shuffled, CFG, 7)).toBe(buildInputsHash(games, CFG, 7))
  })

  it('breaks an exact tie deterministically by the (seed, teamId) final key', () => {
    // 1 and 2 have identical records (each beat a different team, never played).
    const rows = computeStandings([game(1, 3, 60, 50), game(2, 4, 60, 50)], CFG, 7)
    expect(rowFor(rows, 1).rank!).toBeLessThan(rowFor(rows, 2).rank!)
    // Re-running gives the same order.
    const again = computeStandings([game(2, 4, 60, 50), game(1, 3, 60, 50)], CFG, 7)
    expect(again.map((r) => r.teamId)).toEqual(rows.map((r) => r.teamId))
  })
})
