import { describe, expect, it } from 'vitest'

import { assignSlots, generateRoundRobin, type Slot } from '../generate'

describe('generateRoundRobin (even teams)', () => {
  it('produces N*(N-1)/2 games with no byes and each team N-1 games (single)', () => {
    const f = generateRoundRobin([1, 2, 3, 4])
    const real = f.filter((x) => !x.isBye)
    expect(f.some((x) => x.isBye)).toBe(false)
    expect(real).toHaveLength(6) // 4*3/2
    for (const team of [1, 2, 3, 4]) {
      const count = real.filter((x) => x.homeTeamId === team || x.awayTeamId === team).length
      expect(count).toBe(3)
    }
  })
})

describe('generateRoundRobin (odd teams, double)', () => {
  const teams = [1, 2, 3]
  const f = generateRoundRobin(teams, { double: true })
  const real = f.filter((x) => !x.isBye)
  const byes = f.filter((x) => x.isBye)

  it('never emits a fixture referencing the bye sentinel', () => {
    for (const x of real) {
      expect(x.homeTeamId).not.toBe('__BYE__')
      expect(x.awayTeamId).not.toBe('__BYE__')
      expect(x.homeTeamId).toBeDefined()
      expect(x.awayTeamId).toBeDefined()
    }
  })

  it('gives every team 2(N-1) real fixtures and exactly 2 byes; total real games N*(N-1)', () => {
    expect(real).toHaveLength(3 * 2) // N*(N-1) = 6
    for (const team of teams) {
      const playing = real.filter((x) => x.homeTeamId === team || x.awayTeamId === team).length
      const byeCount = byes.filter((x) => x.byeTeamId === team).length
      expect(playing).toBe(4) // 2(N-1)
      expect(byeCount).toBe(2)
    }
  })

  it('bye fixtures carry no court and never get scheduled', () => {
    const slots: Slot[] = real.map((_, i) => ({ start: `2026-01-${10 + i}T18:00:00Z`, venueId: 1, courtId: 1 }))
    const { scheduled } = assignSlots(f, slots)
    expect(scheduled).toHaveLength(real.length)
    expect(scheduled.every((s) => !s.fixture.isBye)).toBe(true)
  })
})

describe('assignSlots', () => {
  it('skips blackout dates and returns unplaceable fixtures as warnings', () => {
    const f = generateRoundRobin([1, 2, 3, 4]) // 6 real fixtures
    const slots: Slot[] = [
      { start: '2026-01-10T18:00:00Z', venueId: 1, courtId: 1 },
      { start: '2026-01-11T18:00:00Z', venueId: 1, courtId: 1 }, // blacked out
      { start: '2026-01-12T18:00:00Z', venueId: 1, courtId: 1 },
    ]
    const { scheduled, unplaceable } = assignSlots(f, slots, { blackoutDates: ['2026-01-11'] })
    expect(scheduled).toHaveLength(2) // only 2 usable slots
    expect(scheduled.every((s) => s.slot.start.slice(0, 10) !== '2026-01-11')).toBe(true)
    expect(unplaceable).toHaveLength(4) // 6 fixtures, 2 slots
  })
})
