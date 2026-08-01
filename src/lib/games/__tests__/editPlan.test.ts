/*
 * Item 2 support: moving a game surfaces its conflicts inline, in words, naming
 * the other game rather than showing a database id.
 */
import { describe, expect, it } from 'vitest'

import { planGameEdit, validateGameEdit, type EditPlanOptions, type NeighbourGame } from '../editPlan'

const OPTS: EditPlanOptions = {
  gameLengthMinutes: 60,
  bufferMinutes: 15,
  names: { homeTeamName: 'Excel U13 Boys Orange', awayTeamName: 'CoMBA BU13-1', venueName: 'Trico Centre', courtName: 'Court 1' },
}

// 6:00 PM Calgary on Sat 2026-01-10.
const AT_6PM = '2026-01-11T01:00:00.000Z'
const AT_630PM = '2026-01-11T01:30:00.000Z'
const AT_9PM = '2026-01-11T04:00:00.000Z'

const proposed = (over: Partial<Parameters<typeof planGameEdit>[0]> = {}) => ({
  id: 1,
  startAt: AT_6PM,
  venueId: 20,
  courtId: 30,
  homeTeamId: 10,
  awayTeamId: 11,
  officialIds: [] as (string | number)[],
  ...over,
})

const neighbour = (over: Partial<NeighbourGame> = {}): NeighbourGame => ({
  id: 2,
  startAt: AT_630PM,
  venueId: 21,
  courtId: 31,
  homeTeamId: 12,
  awayTeamId: 13,
  homeTeamName: 'Okotoks GU13-2',
  awayTeamName: 'DMS U13',
  venueName: 'Glenmore Christian Academy',
  courtName: 'East Gym Court 1',
  ...over,
})

describe('planGameEdit', () => {
  it('finds nothing when the move is clear', () => {
    expect(planGameEdit(proposed(), [neighbour({ startAt: AT_9PM })], OPTS)).toEqual([])
  })

  it('names the venue, the court, and the other game on a court double booking', () => {
    const c = planGameEdit(proposed(), [neighbour({ venueId: 20, courtId: 30 })], OPTS)
    expect(c).toHaveLength(1)
    expect(c[0].kind).toBe('VENUE_COURT')
    expect(c[0].message).toContain('Glenmore Christian Academy, East Gym Court 1')
    expect(c[0].message).toContain('Okotoks GU13-2 vs DMS U13')
    expect(c[0].message).toContain('Jan 10')
  })

  it('names the team that would be in two places at once', () => {
    const c = planGameEdit(proposed(), [neighbour({ homeTeamId: 10 })], OPTS)
    expect(c[0].kind).toBe('TEAM')
    expect(c[0].message).toContain('Excel U13 Boys Orange')
    expect(c[0].message).toContain('cannot be in two places at once')
  })

  it('matches the away team as well as the home team', () => {
    const c = planGameEdit(proposed(), [neighbour({ awayTeamId: 11 })], OPTS)
    expect(c[0].kind).toBe('TEAM')
    expect(c[0].message).toContain('CoMBA BU13-1')
  })

  it('names the official who would be double booked', () => {
    const c = planGameEdit(proposed({ officialIds: [7] }), [neighbour({ officialIds: [7], officialNames: { '7': 'Casey Morgan' } })], OPTS)
    expect(c[0].kind).toBe('OFFICIAL')
    expect(c[0].message).toContain('Casey Morgan')
  })

  it('never refers to a record by its database id', () => {
    // The shape of the reported bug was "Blocked official 7". Court names such as
    // "East Gym Court 1" are real names and are fine; "official 7" is not.
    const all = planGameEdit(proposed({ officialIds: [7] }), [neighbour({ venueId: 20, courtId: 30, homeTeamId: 10, officialIds: [7], officialNames: { '7': 'Casey Morgan' } })], OPTS)
    expect(all.length).toBeGreaterThanOrEqual(3)
    for (const c of all) {
      expect(c.message).not.toMatch(/\b(game|official|team)\s+\d+\b/i)
      expect(c.message).toMatch(/[A-Z]/) // always carries at least one real name
    }
  })

  it('ignores the game being edited when it appears in the neighbour list', () => {
    expect(planGameEdit(proposed(), [neighbour({ id: 1, venueId: 20, courtId: 30 })], OPTS)).toEqual([])
  })

  it('ignores byes on either side', () => {
    expect(planGameEdit(proposed({ isBye: true }), [neighbour({ venueId: 20, courtId: 30 })], OPTS)).toEqual([])
    expect(planGameEdit(proposed(), [neighbour({ venueId: 20, courtId: 30, isBye: true })], OPTS)).toEqual([])
  })

  it('counts the buffer between games, so back to back on one court still clashes', () => {
    // 60 minute game plus a 15 minute buffer: a game starting 70 minutes later
    // still overlaps the window.
    const seventyLater = new Date(new Date(AT_6PM).getTime() + 70 * 60_000).toISOString()
    const c = planGameEdit(proposed(), [neighbour({ startAt: seventyLater, venueId: 20, courtId: 30 })], OPTS)
    expect(c).toHaveLength(1)
  })

  it('does not clash once the buffer has passed', () => {
    const eightyLater = new Date(new Date(AT_6PM).getTime() + 80 * 60_000).toISOString()
    expect(planGameEdit(proposed(), [neighbour({ startAt: eightyLater, venueId: 20, courtId: 30 })], OPTS)).toEqual([])
  })

  it('is order stable so the same edit always shows the same list', () => {
    const ns = [neighbour({ id: 3, venueId: 20, courtId: 30 }), neighbour({ id: 2, homeTeamId: 10 })]
    const a = planGameEdit(proposed(), ns, OPTS).map((c) => c.message)
    const b = planGameEdit(proposed(), [...ns].reverse(), OPTS).map((c) => c.message)
    expect(a).toEqual(b)
  })
})

describe('validateGameEdit', () => {
  it('refuses the same team on both sides', () => {
    expect(validateGameEdit({ homeTeam: 10, awayTeam: 10 })).toContain('cannot be the same team')
  })
  it('accepts different teams', () => {
    expect(validateGameEdit({ homeTeam: 10, awayTeam: 11 })).toBeNull()
  })
  it('refuses an unreadable date and says what to check', () => {
    expect(validateGameEdit({ startAt: 'nonsense' })).toContain('could not be read')
  })
  it('refuses a negative or fractional score', () => {
    expect(validateGameEdit({ homeScore: -1 })).toContain('whole numbers')
    expect(validateGameEdit({ awayScore: 1.5 })).toContain('whole numbers')
  })
  it('allows clearing a score', () => {
    expect(validateGameEdit({ homeScore: null })).toBeNull()
  })
})
