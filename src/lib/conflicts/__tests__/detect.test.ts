import { describe, expect, it } from 'vitest'

import { detectConflicts, detectOfficialWarnings, type ConflictGame } from '../detect'

const OPTS = { gameLengthMinutes: 60, bufferMinutes: 15 } // 75 minute window

let n = 0
function cg(startAt: string, o: Partial<ConflictGame> = {}): ConflictGame {
  n += 1
  return { id: n, startAt, homeTeamId: o.homeTeamId ?? 100 + n, awayTeamId: o.awayTeamId ?? 200 + n, ...o }
}

describe('detectConflicts', () => {
  it('flags a venue and court double booking for overlapping games', () => {
    const a = cg('2026-01-10T18:00:00Z', { venueId: 1, courtId: 1 })
    const b = cg('2026-01-10T18:30:00Z', { venueId: 1, courtId: 1 })
    const c = detectConflicts([a, b], [], OPTS)
    expect(c.some((x) => x.kind === 'VENUE_COURT_DOUBLE_BOOK')).toBe(true)
  })

  it('does not flag the same venue on a DIFFERENT court', () => {
    const a = cg('2026-01-10T18:00:00Z', { venueId: 1, courtId: 1 })
    const b = cg('2026-01-10T18:30:00Z', { venueId: 1, courtId: 2 })
    expect(detectConflicts([a, b], [], OPTS).some((x) => x.kind === 'VENUE_COURT_DOUBLE_BOOK')).toBe(false)
  })

  it('does not flag non-overlapping games (outside the window)', () => {
    const a = cg('2026-01-10T18:00:00Z', { venueId: 1, courtId: 1 })
    const b = cg('2026-01-10T20:00:00Z', { venueId: 1, courtId: 1 }) // 120 min later > 75 window
    expect(detectConflicts([a, b], [], OPTS)).toHaveLength(0)
  })

  it('flags a team booked in two overlapping games', () => {
    const a = cg('2026-01-10T18:00:00Z', { homeTeamId: 5, awayTeamId: 6, venueId: 1, courtId: 1 })
    const b = cg('2026-01-10T18:30:00Z', { homeTeamId: 5, awayTeamId: 9, venueId: 2, courtId: 1 })
    expect(detectConflicts([a, b], [], OPTS).some((x) => x.kind === 'TEAM_DOUBLE_BOOK' && x.sharedKey === '5')).toBe(true)
  })

  it('flags an official assigned to two overlapping games', () => {
    const a = cg('2026-01-10T18:00:00Z', { venueId: 1, courtId: 1, officialIds: [77] })
    const b = cg('2026-01-10T18:30:00Z', { venueId: 2, courtId: 1, officialIds: [77] })
    expect(detectConflicts([a, b], [], OPTS).some((x) => x.kind === 'OFFICIAL_DOUBLE_BOOK')).toBe(true)
  })

  it('excludes byes and compares candidates against already-published games', () => {
    const bye = cg('2026-01-10T18:00:00Z', { isBye: true, venueId: 1, courtId: 1 })
    const cand = cg('2026-01-10T18:10:00Z', { venueId: 1, courtId: 1 })
    const published = cg('2026-01-10T18:20:00Z', { venueId: 1, courtId: 1 })
    const conflicts = detectConflicts([bye, cand], [published], OPTS)
    expect(conflicts.some((x) => x.gameA === bye.id || x.gameB === bye.id)).toBe(false)
    expect(conflicts.some((x) => x.kind === 'VENUE_COURT_DOUBLE_BOOK')).toBe(true)
  })
})

describe('detectOfficialWarnings', () => {
  it('warns when an official exceeds max games in a day', () => {
    const w = detectOfficialWarnings([
      { gameId: 1, startAt: '2026-01-10T18:00:00Z', officialId: 5, maxGamesPerDay: 1 },
      { gameId: 2, startAt: '2026-01-10T20:00:00Z', officialId: 5, maxGamesPerDay: 1 },
    ])
    expect(w.some((x) => x.kind === 'OFFICIAL_OVER_MAX')).toBe(true)
  })

  it('warns when an official ramp level is below the division requirement', () => {
    const w = detectOfficialWarnings([
      { gameId: 1, startAt: '2026-01-10T18:00:00Z', officialId: 5, rampLevel: 'level1', requiredRampLevel: 'level3' },
    ])
    expect(w.some((x) => x.kind === 'OFFICIAL_RAMP_BELOW')).toBe(true)
  })

  it('does not warn when ramp meets the requirement', () => {
    const w = detectOfficialWarnings([
      { gameId: 1, startAt: '2026-01-10T18:00:00Z', officialId: 5, rampLevel: 'level3', requiredRampLevel: 'level2' },
    ])
    expect(w).toHaveLength(0)
  })
})
