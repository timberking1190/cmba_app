/*
 * REPRO tests for the lead scheduler's reported failures (Phase 0).
 *
 * Every test in this file was written BEFORE its fix and observed to FAIL against
 * the code as reported. They are kept as regressions: if a fix is reverted, the
 * matching test here goes red again and names the reported symptom.
 *
 * Item 4: "CSV times only accept 24 hour and spreadsheets mangle 08:00."
 */
import { describe, expect, it } from 'vitest'

import { validateCsv, type Lookups } from '../validate'

const LK: Lookups = {
  divisionsByPath: new Map([['u13 boys / a', { id: 1 }]]),
  teamsByDivisionAndName: new Map([
    ['1|home team', { id: 10 }],
    ['1|away team', { id: 11 }],
  ]),
  venuesByName: new Map([['main gym', { id: 20 }]]),
  courtsByVenueAndName: new Map(),
  officialsByName: new Map(),
  clubsByName: new Map(),
}

const rowWithTime = (time: string) => ({
  row: 2,
  data: {
    date: '2026-12-10',
    time,
    division: 'U13 Boys / A',
    home_team: 'Home Team',
    away_team: 'Away Team',
    venue: 'Main Gym',
  },
})

const validateTime = (time: string) => validateCsv('games', [rowWithTime(time)], LK, new Date('2026-06-25T12:00:00Z')).rows[0]

/*
 * The reported symptom: a scheduler fills in 08:00, Excel writes it back as
 * "8:00 AM" (or strips the leading zero to "8:00"), and the importer refuses the
 * whole row with "Time is not valid 24 hour time." Before the fix, every case
 * below except the strict 24 hour ones produced a blocking error.
 */
describe('item 4 repro: spreadsheet time formats must import', () => {
  const accepted: Array<[string, string]> = [
    ['08:00', '08:00'],
    ['8:00', '08:00'],
    ['8:00 AM', '08:00'],
    ['8:00AM', '08:00'],
    ['8:00 am', '08:00'],
    ['8:00 PM', '20:00'],
    ['8:00PM', '20:00'],
    ['20:00', '20:00'],
    ['12:00 AM', '00:00'],
    ['12:00 PM', '12:00'],
    ['12:30 AM', '00:30'],
    ['08:00:00', '08:00'],
    ['8:00:00 PM', '20:00'],
    ['8:00 a.m.', '08:00'],
    ['6:45 p.m.', '18:45'],
    ['0800', '08:00'],
    ['2015', '20:15'],
  ]

  for (const [input, expected] of accepted) {
    it(`accepts ${JSON.stringify(input)} and normalizes it to ${expected}`, () => {
      const r = validateTime(input)
      expect(r.issues.filter((i) => i.severity === 'error')).toEqual([])
      expect(r.data.time).toBe(expected)
    })
  }

  it('accepts an Excel time serial (a General-formatted time cell exports as a fraction of a day)', () => {
    const r = validateTime('0.3333333333333333')
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([])
    expect(r.data.time).toBe('08:00')
  })

  it('accepts an Excel date-time serial and keeps only the time of day', () => {
    const r = validateTime('46001.75')
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([])
    expect(r.data.time).toBe('18:00')
  })

  it('trims stray whitespace, a byte order mark, and a narrow no-break space before AM/PM', () => {
    const r = validateTime('﻿  8:00 PM  ')
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([])
    expect(r.data.time).toBe('20:00')
  })

  it('warns rather than blocks when an hour has no minutes, and says what it read', () => {
    const r = validateTime('8')
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([])
    expect(r.data.time).toBe('08:00')
    const warn = r.issues.find((i) => i.severity === 'warning')
    expect(warn?.message).toContain('8:00 AM')
  })

  it('still blocks a time that is not a real clock time, and says what to do', () => {
    for (const bad of ['25:00', '8:75', 'noon', 'tbd', '13:00 PM']) {
      const r = validateTime(bad)
      const err = r.issues.find((i) => i.severity === 'error')
      expect(err, `${bad} should be an error`).toBeTruthy()
      expect(err!.message).toMatch(/12 hour|24 hour/)
    }
  })

  it('still blocks a blank time', () => {
    const r = validateTime('')
    expect(r.issues.some((i) => i.severity === 'error' && /required/i.test(i.message))).toBe(true)
  })
})

/*
 * Dates hit the same spreadsheet mangling. YYYY-MM-DD survives, but Excel also
 * writes date serials and month-name forms. Slash dates stay a hard error on
 * purpose: 04/11/2026 is April 11 to one scheduler and November 4 to another, and
 * guessing silently would move a real game.
 */
describe('item 4 repro: spreadsheet date formats', () => {
  const validateDate = (date: string) =>
    validateCsv('games', [{ ...rowWithTime('18:00'), data: { ...rowWithTime('18:00').data, date } }], LK, new Date('2026-06-25T12:00:00Z')).rows[0]

  it('accepts YYYY-MM-DD unchanged', () => {
    const r = validateDate('2026-12-10')
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([])
    expect(r.data.date).toBe('2026-12-10')
  })

  it('accepts an Excel date serial', () => {
    const r = validateDate('46001')
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([])
    expect(r.data.date).toBe('2025-12-10')
  })

  it('accepts an unambiguous month-name date', () => {
    for (const input of ['10 Dec 2026', 'Dec 10, 2026', '10-Dec-2026']) {
      const r = validateDate(input)
      expect(r.issues.filter((i) => i.severity === 'error'), input).toEqual([])
      expect(r.data.date).toBe('2026-12-10')
    }
  })

  it('refuses an ambiguous slash date and names the format to use', () => {
    const r = validateDate('04/11/2026')
    const err = r.issues.find((i) => i.severity === 'error')
    expect(err?.message).toContain('YYYY-MM-DD')
  })
})
