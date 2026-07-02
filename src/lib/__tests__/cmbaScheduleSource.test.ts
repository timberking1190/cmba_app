import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * Proves the app serves its OWN schedule and standings, and only falls back to the
 * TeamLinkt read-only view when our data is empty. This is the P1.6 "own data is the
 * source of truth" guarantee at the data-layer level (the browser-level proof is the
 * Playwright own-data journey).
 */

// Declared via vi.hoisted so the hoisted vi.mock factories below can reference them.
const { find, loggerError, getDivisionStandings, getLeagueStandings, legacyGetEvents, legacyGetStandings } = vi.hoisted(() => ({
  find: vi.fn(),
  loggerError: vi.fn(),
  getDivisionStandings: vi.fn(),
  getLeagueStandings: vi.fn(),
  legacyGetEvents: vi.fn(),
  legacyGetStandings: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('../auth', () => ({
  getPayloadClient: async () => ({ find, logger: { error: loggerError } }),
}))
vi.mock('../standings', () => ({ getDivisionStandings, getLeagueStandings }))
vi.mock('../teamlinkt', () => ({
  getEvents: legacyGetEvents,
  getStandings: legacyGetStandings,
  getTeamLinktConfig: () => ({ appUrl: 'https://app.teamlinkt.com', leagueUrl: 'https://leagues.teamlinkt.com/x' }),
}))

import { getEventsWithSource, getStandingsWithSource } from '../cmbaSchedule'

const ownGameDoc = { id: 1, startAt: '2026-01-10T19:00:00.000Z', homeTeam: { name: 'Home' }, awayTeam: { name: 'Away' }, venue: { name: 'Gym' }, status: 'scheduled' }
const ownRow = { division: 'U12', team: 'Home', wins: 1, losses: 0 }
const legacyGame = { id: 'tl-1', date: '', time: '', start: null, homeTeam: 'H', awayTeam: 'A', location: '', homeScore: null, awayScore: null, status: 'scheduled', division: 'U12' }
const legacyRow = { division: 'U12', team: 'TL Team' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getEventsWithSource', () => {
  it('serves our own games when we have them, and never calls TeamLinkt', async () => {
    find.mockResolvedValue({ docs: [ownGameDoc] })
    const { games, source } = await getEventsWithSource()
    expect(source).toBe('own')
    expect(games).toHaveLength(1)
    expect(games[0].homeTeam).toBe('Home')
    expect(legacyGetEvents).not.toHaveBeenCalled()
  })

  it('falls back to the TeamLinkt view only when our data is empty', async () => {
    find.mockResolvedValue({ docs: [] })
    legacyGetEvents.mockResolvedValue([legacyGame])
    const { games, source } = await getEventsWithSource()
    expect(source).toBe('legacy')
    expect(games).toHaveLength(1)
    expect(legacyGetEvents).toHaveBeenCalledOnce()
  })

  it('reports empty when neither source has data', async () => {
    find.mockResolvedValue({ docs: [] })
    legacyGetEvents.mockResolvedValue([])
    const { games, source } = await getEventsWithSource()
    expect(source).toBe('empty')
    expect(games).toHaveLength(0)
  })
})

describe('getStandingsWithSource', () => {
  it('serves our own standings when we have them, and never calls TeamLinkt', async () => {
    getLeagueStandings.mockResolvedValue([ownRow])
    const { rows, source } = await getStandingsWithSource()
    expect(source).toBe('own')
    expect(rows).toEqual([ownRow])
    expect(legacyGetStandings).not.toHaveBeenCalled()
  })

  it('falls back to TeamLinkt standings only when ours are empty', async () => {
    getLeagueStandings.mockResolvedValue([])
    legacyGetStandings.mockResolvedValue([legacyRow])
    const { rows, source } = await getStandingsWithSource()
    expect(source).toBe('legacy')
    expect(rows).toEqual([legacyRow])
  })

  it('reports empty when neither source has standings', async () => {
    getLeagueStandings.mockResolvedValue([])
    legacyGetStandings.mockResolvedValue([])
    const { rows, source } = await getStandingsWithSource()
    expect(source).toBe('empty')
    expect(rows).toHaveLength(0)
  })
})
