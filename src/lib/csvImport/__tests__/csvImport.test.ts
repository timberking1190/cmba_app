import { describe, expect, it } from 'vitest'

import { detectKind, parseCsv } from '../parse'
import { validateCsv, type Lookups } from '../validate'

const NOW = new Date('2026-06-25T12:00:00Z')

const LK: Lookups = {
  divisionsByPath: new Map([
    ['weekend rec league / u13 boys / a', { id: 1 }],
    ['weekend rec league / u13 girls / b', { id: 2 }],
  ]),
  teamsByDivisionAndName: new Map([
    ['1|excel u13 boys orange', { id: 10 }],
    ['1|comba bu13-1', { id: 11 }],
    ['2|okotoks gu13-2', { id: 12 }],
    ['2|dms u13', { id: 13 }],
  ]),
  venuesByName: new Map([
    ['glenmore christian academy', { id: 20 }],
    ['trico centre', { id: 21 }],
  ]),
  courtsByVenueAndName: new Map([
    ['20|east gym court 1', { id: 30 }],
    ['21|court 1', { id: 31 }],
  ]),
  officialsByName: new Map([['casey morgan', { id: 40 }]]),
  clubsByName: new Map([['excel', { id: 50 }]]),
  existingGameKeys: new Set(['weekend rec league / u13 boys / a|excel u13 boys orange|comba bu13-1|2026-12-01|18:00']),
}

describe('parseCsv', () => {
  it('handles quoted commas, a BOM, blank rows, and 1-based file row numbers', () => {
    const csv = '﻿a,b,c\n1,"x,y",3\n\n4,5,6\n'
    const p = parseCsv(csv)
    expect(p.header).toEqual(['a', 'b', 'c'])
    expect(p.rows).toHaveLength(2)
    expect(p.rows[0].data).toEqual({ a: '1', b: 'x,y', c: '3' })
    expect(p.rows[0].row).toBe(2)
    expect(p.rows[1].row).toBe(4) // the blank line was row 3
  })

  it('detects the kind from the header', () => {
    expect(detectKind(['date', 'time', 'division', 'home_team', 'away_team', 'venue'])).toBe('games')
    expect(detectKind(['team_name', 'division'])).toBe('teams')
    expect(detectKind(['venue_name', 'court_name'])).toBe('venues')
    expect(detectKind(['official_name', 'email'])).toBe('officials')
    expect(detectKind(['nonsense'])).toBe(null)
  })
})

const gameRow = (over: Record<string, string>, row = 2) => ({
  row,
  data: {
    date: '2026-12-10',
    time: '18:00',
    division: 'Weekend Rec League / U13 Boys / A',
    home_team: 'Excel U13 Boys Orange',
    away_team: 'CoMBA BU13-1',
    venue: 'Glenmore Christian Academy',
    court: 'East Gym Court 1',
    referee_1: 'Casey Morgan',
    ...over,
  },
})

describe('validateCsv games', () => {
  const messages = (over: Record<string, string>) =>
    validateCsv('games', [gameRow(over)], LK, NOW).rows[0].issues.map((i) => i.message)

  it('passes a clean future game', () => {
    const res = validateCsv('games', [gameRow({})], LK, NOW)
    expect(res.rows[0].status).toBe('ready')
    expect(res.summary.ready).toBe(1)
  })

  it('errors on home equals away', () => {
    expect(messages({ away_team: 'Excel U13 Boys Orange' })).toContain('Home team and away team cannot be the same.')
  })
  it('errors on a time that is not a real clock time, and says which formats work', () => {
    // 12 hour and 24 hour spellings both import now, so the error is about the
    // hour being impossible, not about the format. See repro-phase0.test.ts.
    expect(messages({ time: '25:00' })).toContain('Hours must be 00 to 23 without am or pm. Use a 12 hour time like 8:00 AM or a 24 hour time like 20:00.')
  })
  it('errors on a division that does not exist', () => {
    expect(messages({ division: 'No Such Division' })).toContain('Division not found.')
  })
  it('errors when a team is not in the stated division', () => {
    // DMS U13 belongs to division 2, not the stated division 1
    expect(messages({ away_team: 'DMS U13' })).toContain('Away team not found in this division.')
  })
  it('errors when the court is not at the venue', () => {
    expect(messages({ court: 'Court 99' })).toContain('Court not found at this venue.')
  })
  it('errors when a referee is not in the roster', () => {
    expect(messages({ referee_1: 'Unknown Ref' })).toContain('Referee not found in the officials roster.')
  })
  it('warns on a past date', () => {
    const r = validateCsv('games', [gameRow({ date: '2026-01-10' })], LK, NOW).rows[0]
    expect(r.status).toBe('warning')
    expect(r.issues.map((i) => i.message)).toContain('This game is in the past.')
  })
  it('warns on an identical existing game', () => {
    const r = validateCsv('games', [gameRow({ date: '2026-12-01' })], LK, NOW).rows[0]
    expect(r.issues.map((i) => i.message)).toContain('An identical game already exists.')
  })
})

describe('validateCsv teams', () => {
  it('errors on a duplicate team in the same division within the file', () => {
    const rows = [
      { row: 2, data: { team_name: 'New Team', division: 'Weekend Rec League / U13 Boys / A' } },
      { row: 3, data: { team_name: 'New Team', division: 'Weekend Rec League / U13 Boys / A' } },
    ]
    const res = validateCsv('teams', rows, LK, NOW)
    expect(res.rows[1].issues.some((i) => i.message.includes('appears twice'))).toBe(true)
  })

  it('warns on an existing team, an unknown club, and a bad email', () => {
    const rows = [
      { row: 2, data: { team_name: 'Excel U13 Boys Orange', division: 'Weekend Rec League / U13 Boys / A', club: 'Mystery Club', contact_email: 'nope' } },
    ]
    const msgs = validateCsv('teams', rows, LK, NOW).rows[0].issues.map((i) => i.message)
    expect(msgs).toContain('A team with this name already exists in this division.')
    expect(msgs.some((m) => m.includes('Club not found'))).toBe(true)
    expect(msgs).toContain('Contact email does not look valid.')
  })
})
