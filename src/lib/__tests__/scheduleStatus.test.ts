import { describe, expect, it } from 'vitest'

import { filterResults, filterUpcoming, type Game, type GameStatus } from '../scheduleUtils'

const NOW = new Date('2026-06-25T12:00:00Z').getTime()
const FUTURE = new Date('2026-07-01T18:00:00Z')

const ALL_STATUSES: GameStatus[] = [
  'scheduled',
  'reported',
  'contested',
  'final',
  'postponed',
  'cancelled',
  'forfeit',
]

function gameFor(status: GameStatus): Game {
  return { id: status, date: 'Wed Jul 1, 2026', time: '6:00 PM', start: FUTURE, status }
}

describe('schedule status partition (upcoming vs results vs neither)', () => {
  const games = ALL_STATUSES.map(gameFor)
  const upcoming = new Set(filterUpcoming(games, NOW).map((g) => g.status))
  const results = new Set(filterResults(games).map((g) => g.status))

  it('puts scheduled, reported, contested, and postponed under upcoming', () => {
    expect(upcoming).toEqual(new Set(['scheduled', 'reported', 'contested', 'postponed']))
  })

  it('puts final and forfeit under results', () => {
    expect(results).toEqual(new Set(['final', 'forfeit']))
  })

  it('lands every status in exactly one of upcoming, results, or neither (cancelled is neither)', () => {
    for (const s of ALL_STATUSES) {
      const inUpcoming = upcoming.has(s)
      const inResults = results.has(s)
      expect(Number(inUpcoming) + Number(inResults)).toBeLessThanOrEqual(1)
    }
    expect(upcoming.has('cancelled')).toBe(false)
    expect(results.has('cancelled')).toBe(false)
  })
})
