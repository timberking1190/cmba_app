import { describe, expect, it } from 'vitest'

import { orderStandingsForDisplay, type StandingRow } from '../scheduleUtils'

const row = (over: Partial<StandingRow>): StandingRow => ({
  team: 'T',
  gp: 0,
  w: 0,
  l: 0,
  t: 0,
  pts: 0,
  pf: 0,
  pa: 0,
  diff: 0,
  ...over,
})

describe('orderStandingsForDisplay', () => {
  it('renders the server rank order even when pts/diff/w would reorder it', () => {
    // The server resolved a head-to-head or seed tiebreaker: A is rank 1 despite a
    // lower diff than B. The client must NOT re-sort by pts/diff/w.
    const rows = [
      row({ team: 'B', rank: 2, pts: 4, diff: 30, w: 2, division: 'U13' }),
      row({ team: 'A', rank: 1, pts: 4, diff: 10, w: 2, division: 'U13' }),
    ]
    const out = orderStandingsForDisplay(rows, 'U13')
    expect(out.map((r) => r.team)).toEqual(['A', 'B'])
  })

  it('falls back to pts/diff/w only for legacy rows that have no rank', () => {
    const rows = [
      row({ team: 'Low', pts: 2, diff: 0 }),
      row({ team: 'High', pts: 6, diff: 20 }),
    ]
    const out = orderStandingsForDisplay(rows, 'all')
    expect(out.map((r) => r.team)).toEqual(['High', 'Low'])
  })

  it('groups by division then rank in the all-divisions view', () => {
    const rows = [
      row({ team: 'B1', rank: 1, division: 'U15' }),
      row({ team: 'A2', rank: 2, division: 'U13' }),
      row({ team: 'A1', rank: 1, division: 'U13' }),
    ]
    const out = orderStandingsForDisplay(rows, 'all')
    expect(out.map((r) => r.team)).toEqual(['A1', 'A2', 'B1'])
  })
})
