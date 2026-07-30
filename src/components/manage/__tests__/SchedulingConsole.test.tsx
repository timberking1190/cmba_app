// @vitest-environment jsdom
/*
 * REPRO tests for items 1 and 2, written before the fix and observed to fail.
 *
 * Item 1: "Forfeit does not submit and shows no label."
 *   The old console hardcoded every forfeit as home_forfeit with a null
 *   forfeiting team and sent whatever was in the reason box, which starts empty.
 *   The service correctly refuses that, so the button did nothing visible. There
 *   was also no forfeit label anywhere: the row printed the raw status text.
 *
 * Item 2: "No way to edit games after import."
 *   Manage was a ghost styled toggle that only opened a status panel. There was
 *   no way to change a date, time, venue, court, or the teams.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { leagueDayKey, leagueTime } from '@/lib/leagueTime'
import type { AdminGame } from '@/lib/manageGames'

import { SchedulingConsole } from '../SchedulingConsole'

const GAME: AdminGame = {
  id: 42,
  status: 'scheduled',
  publishState: 'draft',
  homeTeam: 'Excel U13 Boys Orange',
  awayTeam: 'CoMBA BU13-1',
  homeTeamId: 10,
  awayTeamId: 11,
  division: 'U13 Boys / A',
  divisionId: 1,
  startAt: '2026-01-11T01:00:00.000Z',
  date: 'Sat, Jan 10, 6:00 PM',
  dayLabel: 'Sat, Jan 10',
  timeLabel: '6:00 PM',
  dateInput: '2026-01-10',
  timeInput: '18:00',
  venue: 'Trico Centre',
  venueId: 20,
  court: 'Court 1',
  courtId: 30,
  homeScore: null,
  awayScore: null,
  officials: [],
}

const OPTIONS = {
  venues: [
    { id: 20, name: 'Trico Centre', courts: [{ id: 30, name: 'Court 1' }, { id: 31, name: 'Court 2' }] },
    { id: 21, name: 'Glenmore Christian Academy', courts: [{ id: 32, name: 'East Gym Court 1' }] },
  ],
  teamsByDivision: {
    '1': [
      { id: 10, name: 'Excel U13 Boys Orange' },
      { id: 11, name: 'CoMBA BU13-1' },
      { id: 12, name: 'Okotoks GU13-2' },
    ],
  },
}

let fetchMock: ReturnType<typeof vi.fn>

function stubFetch(handler: (url: string, init: RequestInit) => unknown, status = 200) {
  fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    const payload = handler(url, init)
    return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetchMock)
}

function bodyOf(call: number): Record<string, unknown> {
  return JSON.parse(String((fetchMock.mock.calls[call][1] as RequestInit).body))
}

/** Open the edit panel for the single game on screen. */
function openEditor() {
  fireEvent.click(screen.getByRole('button', { name: /^edit/i }))
}

beforeEach(() => {
  stubFetch(() => ({ ok: true, conflicts: [], game: { ...GAME, status: 'forfeit', forfeitOutcome: 'away_forfeit' } }))
})
afterEach(() => vi.unstubAllGlobals())

describe('item 1 repro: recording a forfeit', () => {
  it('asks which team forfeited instead of assuming the home team', async () => {
    render(<SchedulingConsole games={[GAME]} options={OPTIONS} />)
    openEditor()
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'forfeit' } })

    const picker = screen.getByLabelText(/who forfeited/i)
    expect(picker).toBeInTheDocument()
    // Every real outcome is offered, by team name where one exists.
    const options = within(picker as HTMLSelectElement).getAllByRole('option').map((o) => o.textContent)
    expect(options.join(' | ')).toContain('Excel U13 Boys Orange')
    expect(options.join(' | ')).toContain('CoMBA BU13-1')
    expect(options.join(' | ')).toMatch(/both teams/i)
    expect(options.join(' | ')).toMatch(/no contest/i)
  })

  it('sends the chosen outcome, not a hardcoded home forfeit', async () => {
    render(<SchedulingConsole games={[GAME]} options={OPTIONS} />)
    openEditor()
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'forfeit' } })
    fireEvent.change(screen.getByLabelText(/who forfeited/i), { target: { value: 'away_forfeit' } })
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'No show, confirmed by the coach' } })
    fireEvent.click(screen.getByRole('button', { name: /record the forfeit/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = bodyOf(0)
    expect((body.forfeit as Record<string, unknown>).outcome).toBe('away_forfeit')
    expect(body.reason).toBe('No show, confirmed by the coach')
  })

  it('will not submit without a reason, and says so where the scheduler is looking', async () => {
    render(<SchedulingConsole games={[GAME]} options={OPTIONS} />)
    openEditor()
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'forfeit' } })
    fireEvent.change(screen.getByLabelText(/who forfeited/i), { target: { value: 'away_forfeit' } })

    // The control says why it cannot be used rather than silently doing nothing.
    expect(screen.getByText(/reason/i, { selector: 'span' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /record the forfeit/i }))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the failure inside the open panel when the save is refused', async () => {
    stubFetch(() => ({ error: 'This game does not have both teams set, so a one sided forfeit cannot be recorded.' }), 400)
    render(<SchedulingConsole games={[GAME]} options={OPTIONS} />)
    openEditor()
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'forfeit' } })
    fireEvent.change(screen.getByLabelText(/who forfeited/i), { target: { value: 'away_forfeit' } })
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'No show' } })
    fireEvent.click(screen.getByRole('button', { name: /record the forfeit/i }))

    await waitFor(() => expect(screen.getByText(/one sided forfeit cannot be recorded/i)).toBeInTheDocument())
  })

  it('updates the row to a FORFEIT label straight away, with no page refresh', async () => {
    render(<SchedulingConsole games={[GAME]} options={OPTIONS} />)
    openEditor()
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'forfeit' } })
    fireEvent.change(screen.getByLabelText(/who forfeited/i), { target: { value: 'away_forfeit' } })
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'No show' } })
    fireEvent.click(screen.getByRole('button', { name: /record the forfeit/i }))

    await waitFor(() => expect(screen.getByText('Forfeit')).toBeInTheDocument())
  })

  it('renders a forfeit label on a game that is already a forfeit', () => {
    render(<SchedulingConsole games={[{ ...GAME, status: 'forfeit', forfeitOutcome: 'away_forfeit' }]} options={OPTIONS} />)
    expect(screen.getByText('Forfeit')).toBeInTheDocument()
    expect(screen.getByText(/CoMBA BU13-1 forfeited/)).toBeInTheDocument()
  })
})

describe('item 2 repro: games really are editable after import', () => {
  it('offers a visible Edit action, not a ghost toggle', () => {
    render(<SchedulingConsole games={[GAME]} options={OPTIONS} />)
    expect(screen.getByRole('button', { name: /^edit/i })).toBeInTheDocument()
  })

  it('lets a scheduler change the date, the time, the venue, the court, and the teams', () => {
    render(<SchedulingConsole games={[GAME]} options={OPTIONS} />)
    openEditor()
    expect(screen.getByLabelText(/^date$/i)).toHaveValue('2026-01-10')
    expect(screen.getByLabelText(/^time$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^venue$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^court$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/home team/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/away team/i)).toBeInTheDocument()
  })

  it('sends the new date and venue through the audited override endpoint', async () => {
    stubFetch(() => ({ ok: true, conflicts: [], game: { ...GAME, dateInput: '2026-01-17' } }))
    render(<SchedulingConsole games={[GAME]} options={OPTIONS} />)
    openEditor()
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: '2026-01-17' } })
    fireEvent.change(screen.getByLabelText(/^venue$/i), { target: { value: '21' } })
    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'Gym closed for repairs' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const call = fetchMock.mock.calls.at(-1)!
    expect(String(call[0])).toContain('/api/v1/admin/games/42/override')
    const body = JSON.parse(String((call[1] as RequestInit).body))
    expect((body.patch as Record<string, unknown>).venue).toBe(21)
    // 6:00 PM on Jan 17 in Calgary is 01:00 UTC on Jan 18. The instant sent must
    // round trip back to the wall time the scheduler typed.
    const sent = String((body.patch as Record<string, unknown>).startAt)
    expect(leagueDayKey(sent)).toBe('2026-01-17')
    expect(leagueTime(sent)).toBe('6:00 PM')
    expect(body.reason).toBe('Gym closed for repairs')
  })

  it('shows only the courts that belong to the chosen venue', () => {
    render(<SchedulingConsole games={[GAME]} options={OPTIONS} />)
    openEditor()
    fireEvent.change(screen.getByLabelText(/^venue$/i), { target: { value: '21' } })
    const courts = within(screen.getByLabelText(/^court$/i) as HTMLSelectElement)
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(courts.join(' | ')).toContain('East Gym Court 1')
    expect(courts.join(' | ')).not.toContain('Court 2')
  })

  it('surfaces a clash inline, naming the other game, at the moment of the change', async () => {
    stubFetch(() => ({
      ok: true,
      dryRun: true,
      conflicts: [{ kind: 'VENUE_COURT', otherGameId: 43, overridable: true, message: 'Trico Centre, Court 1 is already booked at that time by Okotoks GU13-2 vs DMS U13 on Sat, Jan 17, 6:00 PM.' }],
    }))
    render(<SchedulingConsole games={[GAME]} options={OPTIONS} />)
    openEditor()
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: '2026-01-17' } })

    await waitFor(() => expect(screen.getByText(/already booked at that time by Okotoks GU13-2 vs DMS U13/)).toBeInTheDocument())
  })
})
