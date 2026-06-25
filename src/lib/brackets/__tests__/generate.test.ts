import { describe, expect, it } from 'vitest'

import { generateSingleElim } from '../generate'

describe('generateSingleElim', () => {
  it('builds a 4-team bracket: two round-1 games feeding one final', () => {
    const s = generateSingleElim([10, 20, 30, 40]) // seeds 1..4
    const r1 = s.filter((x) => x.round === 1)
    const r2 = s.filter((x) => x.round === 2)
    expect(r1).toHaveLength(2)
    expect(r2).toHaveLength(1)
    // Seed 1 (team 10) plays seed 4 (team 40); seed 2 plays seed 3.
    expect(r1[0]).toMatchObject({ homeSeed: 1, awaySeed: 4, homeTeamId: 10, awayTeamId: 40 })
    expect(r1[1]).toMatchObject({ homeSeed: 2, awaySeed: 3, homeTeamId: 20, awayTeamId: 30 })
    // Both round-1 games feed the final.
    expect(r1[0].feedsIntoSlot).toBe('home')
    expect(r1[1].feedsIntoSlot).toBe('away')
  })

  it('gives the top seeds byes for a 6-team field (padded to 8)', () => {
    const s = generateSingleElim([1, 2, 3, 4, 5, 6]) // team ids equal seeds for clarity
    const r1 = s.filter((x) => x.round === 1)
    expect(r1).toHaveLength(4)
    // Seed 1 vs seed 8 (bye) -> seed 1 advances; seed 2 vs seed 7 (bye) -> seed 2 advances.
    const byes = r1.filter((g) => g.homeTeamId == null || g.awayTeamId == null)
    expect(byes.length).toBe(2)
    // The top two seeds appear in round 2 already (advanced on a bye).
    const r2Teams = s.filter((x) => x.round === 2).flatMap((g) => [g.homeTeamId, g.awayTeamId])
    expect(r2Teams).toContain(1)
    expect(r2Teams).toContain(2)
  })

  it('produces a complete tree for 8 teams (7 series across 3 rounds)', () => {
    const s = generateSingleElim([1, 2, 3, 4, 5, 6, 7, 8])
    expect(s).toHaveLength(7)
    expect(s.filter((x) => x.round === 1)).toHaveLength(4)
    expect(s.filter((x) => x.round === 3)).toHaveLength(1)
    expect(s.every((x) => x.round === 3 || x.feedsInto != null)).toBe(true)
  })
})
