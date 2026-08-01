// @vitest-environment happy-dom
/*
 * REPRO tests for items 6 and 7.
 *
 * Item 6: "Blocked official 7: Could not assign."
 *   The old console printed the official's database id and one catch-all
 *   sentence, so a scheduler could not tell who was blocked or what to do.
 *
 * Item 7: "Only one game can be assigned at a time."
 *   The old console was a single game dropdown. Staffing a weekend meant
 *   repeating the whole cycle once per game.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OfficialsBoard, type BoardGame, type BoardOfficial } from '../OfficialsBoard'

const OFFICIALS: BoardOfficial[] = [
  { id: 7, name: 'Casey Morgan', rampLevel: 'level2', maxGamesPerDay: 3, loadByDay: { '2026-01-10': 2 } },
  { id: 8, name: 'Riley Chen', rampLevel: 'level1', maxGamesPerDay: 4, loadByDay: {} },
]

const game = (id: number, hour: string, home: string, away: string): BoardGame => ({
  id,
  startAt: `2026-01-11T0${hour}:00:00.000Z`,
  dayLabel: 'Sat, Jan 10',
  timeLabel: '6:00 PM',
  homeTeam: home,
  awayTeam: away,
  division: 'U13 Boys / A',
  divisionId: 1,
  venue: 'Trico Centre',
  court: 'Court 1',
  venueId: 20,
  requiredRampLevel: 'none',
  assigned: [],
})

const GAMES = [game(101, '1', 'Excel U13', 'CoMBA BU13-1'), game(102, '3', 'Okotoks GU13-2', 'DMS U13'), game(103, '5', 'Bow Valley', 'Foothills')]

const FILTER = { day: '', division: '', venue: '', unstaffedOnly: false }

let fetchMock: ReturnType<typeof vi.fn>
function stubFetch(payload: unknown, status = 200) {
  fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
}

const board = () => render(<OfficialsBoard games={GAMES} officials={OFFICIALS} days={['2026-01-10']} divisions={[]} venues={[]} filter={FILTER} />)

/** Choose an official for a role on a game, the way a scheduler would. */
function pick(gameId: number, role: string, officialId: number) {
  const select = document.querySelector(`#pick-${gameId}\\|${role}`) as HTMLSelectElement
  if (!select) throw new Error(`no picker for game ${gameId} role ${role}`)
  fireEvent.change(select, { target: { value: String(officialId) } })
}

beforeEach(() => {
  stubFetch({ ok: true, results: [], totals: { assigned: 0, removed: 0, blocked: 0, warnings: 0 } })
})
afterEach(() => vi.unstubAllGlobals())

describe('item 7 repro: staffing many games in one session', () => {
  it('shows every game on the board at once, not one dropdown', () => {
    board()
    // Each game name also appears in the screen reader labels on its pickers,
    // so assert presence rather than uniqueness.
    expect(screen.getAllByText(/Excel U13/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Okotoks GU13-2/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Bow Valley/).length).toBeGreaterThan(0)
  })

  it('sends every choice across several games in ONE request', async () => {
    board()
    pick(101, 'referee1', 7)
    pick(102, 'referee1', 8)
    pick(103, 'scorekeeper', 8)

    fireEvent.click(screen.getByRole('button', { name: /assign 3 officials/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/admin/officials/bulk-assign')
    expect(body.changes).toHaveLength(3)
    const ids = (body.changes as Array<{ gameId: string }>).map((c) => String(c.gameId)).sort()
    expect(ids).toEqual(['101', '102', '103'])
  })

  it('offers a check that changes nothing, so a weekend can be reviewed before committing', async () => {
    board()
    pick(101, 'referee1', 7)
    fireEvent.click(screen.getByRole('button', { name: /check first/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)).dryRun).toBe(true)
  })

  it('says why the assign button cannot be used before anything is chosen', () => {
    board()
    // Both the check and the assign button say why they cannot be used yet.
    expect(screen.getAllByText(/Choose an official for at least one game first/i)).toHaveLength(2)
  })

  it('shows each official current load for the day while choosing', () => {
    board()
    const select = document.querySelector('#pick-101\\|referee1') as HTMLSelectElement
    const text = Array.from(select.options).map((o) => o.textContent).join(' | ')
    // Casey already has 2 of a maximum of 3 that day; the board says so up front.
    expect(text).toContain('Casey Morgan')
    expect(text).toContain('2 of 3 that day')
    expect(text).toContain('Riley Chen')
  })

  it('warns as soon as a pick would push someone over their maximum for the day', () => {
    board()
    pick(101, 'referee1', 7)
    pick(102, 'referee1', 7)
    // 2 already + 2 picked = 4, over Casey's maximum of 3.
    expect(screen.getAllByText(/Over their maximum for that day/i).length).toBeGreaterThan(0)
  })
})

describe('item 6 repro: failures name the person and the reason', () => {
  it('shows the official name and a specific reason, never "official 7"', async () => {
    stubFetch({
      ok: true,
      results: [
        {
          gameId: 101,
          gameLabel: 'Excel U13 vs CoMBA BU13-1 on Sat, Jan 10, 6:00 PM',
          created: [],
          removed: [],
          warnings: [],
          blocked: [
            {
              officialId: 7,
              officialName: 'Casey Morgan',
              severity: 'blocked',
              reason: 'TIME_CONFLICT',
              message: 'Casey Morgan is already on Okotoks GU13-2 vs DMS U13 on Sat, Jan 10, 6:30 PM, which overlaps this game. Choose someone else, or tick assign anyway if they really can do both.',
            },
          ],
        },
      ],
      totals: { assigned: 0, removed: 0, blocked: 1, warnings: 0 },
    })
    board()
    pick(101, 'referee1', 7)
    fireEvent.click(screen.getByRole('button', { name: /assign 1 official/i }))

    await waitFor(() => expect(screen.getByText(/Casey Morgan is already on Okotoks GU13-2 vs DMS U13/)).toBeInTheDocument())
    expect(screen.queryByText(/official 7/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Could not assign\.$/)).not.toBeInTheDocument()
  })

  it('separates what was blocked from what went through with a note', async () => {
    stubFetch({
      ok: true,
      results: [
        {
          gameId: 101,
          gameLabel: 'Excel U13 vs CoMBA BU13-1',
          created: [{ officialId: 8, officialName: 'Riley Chen', severity: 'ok', message: 'Riley Chen was assigned.' }],
          removed: [],
          warnings: [{ officialId: 8, officialName: 'Riley Chen', severity: 'warning', reason: 'RAMP_BELOW_DIVISION', message: 'Riley Chen is level 1, and this division asks for level 3. They were still assigned.' }],
          blocked: [{ officialId: 7, officialName: 'Casey Morgan', severity: 'blocked', reason: 'ALREADY_ASSIGNED', message: 'Casey Morgan is already assigned to this game. Remove the existing assignment first if you want to change their role.' }],
        },
      ],
      totals: { assigned: 1, removed: 0, blocked: 1, warnings: 1 },
    })
    board()
    pick(101, 'referee1', 8)
    fireEvent.click(screen.getByRole('button', { name: /assign 1 official/i }))

    await waitFor(() => expect(screen.getByText(/Riley Chen is level 1/)).toBeInTheDocument())
    expect(screen.getByText(/Casey Morgan is already assigned to this game/)).toBeInTheDocument()
    // The two are labelled differently, so an admin knows which ones actually happened.
    expect(screen.getByText('Not assigned')).toBeInTheDocument()
    expect(screen.getByText('Assigned, note')).toBeInTheDocument()
  })

  it('offers the override for a clash, described in plain words', () => {
    board()
    expect(screen.getByText(/Assign anyway when an official is already on an overlapping game/i)).toBeInTheDocument()
  })
})
