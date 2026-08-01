/*
 * League time zone helpers. The important case is the evening game: 6:00 PM in
 * Calgary is 01:00 UTC the NEXT day, so anything that groups by day has to use
 * the league day or it silently splits a Saturday slate in two.
 */
import { describe, expect, it } from 'vitest'

import { leagueDate, leagueDateTime, leagueDayKey, leagueHhMm, leagueTime, leagueWallTimeToUtcISO } from '../leagueTime'

describe('leagueDayKey', () => {
  it('keeps a Saturday evening game on Saturday even though it is Sunday in UTC', () => {
    // 2026-01-10 18:00 in Calgary (MST) is 2026-01-11T01:00Z.
    expect(leagueDayKey('2026-01-11T01:00:00.000Z')).toBe('2026-01-10')
  })

  it('groups a morning and an evening game on the same league day', () => {
    const morning = leagueDayKey('2026-01-10T16:00:00.000Z') // 9:00 AM MST
    const evening = leagueDayKey('2026-01-11T01:00:00.000Z') // 6:00 PM MST
    expect(morning).toBe(evening)
  })

  it('handles daylight time in the summer', () => {
    // 2026-07-10 18:00 in Calgary (MDT) is 2026-07-11T00:00Z.
    expect(leagueDayKey('2026-07-11T00:00:00.000Z')).toBe('2026-07-10')
  })
})

describe('display formats are 12 hour for people', () => {
  it('formats an evening time as 12 hour with PM', () => {
    expect(leagueTime('2026-01-11T01:00:00.000Z')).toBe('6:00 PM')
  })

  it('formats a morning time as 12 hour with AM', () => {
    expect(leagueTime('2026-01-10T15:00:00.000Z')).toBe('8:00 AM')
  })

  it('formats a full date and time', () => {
    expect(leagueDateTime('2026-01-11T01:00:00.000Z')).toContain('6:00 PM')
    expect(leagueDateTime('2026-01-11T01:00:00.000Z')).toContain('Jan 10')
  })

  it('says so plainly when there is no date rather than showing a broken value', () => {
    expect(leagueDateTime(null)).toBe('Date to be confirmed')
    expect(leagueDate(undefined)).toBe('Date to be confirmed')
    expect(leagueDateTime('not a date')).toBe('Date to be confirmed')
  })
})

describe('form round trip', () => {
  it('gives back the 24 hour wall time for prefilling an input', () => {
    expect(leagueHhMm('2026-01-11T01:00:00.000Z')).toBe('18:00')
    expect(leagueHhMm('2026-01-10T15:00:00.000Z')).toBe('08:00')
  })

  it('converts an edited wall time back to the same instant', () => {
    const iso = '2026-01-11T01:00:00.000Z'
    const day = leagueDayKey(iso)
    const hhmm = leagueHhMm(iso)
    expect(leagueWallTimeToUtcISO(day, hhmm)).toBe(iso)
  })

  it('round trips across the daylight saving boundary', () => {
    const iso = '2026-07-11T00:00:00.000Z' // 6:00 PM MDT
    expect(leagueWallTimeToUtcISO(leagueDayKey(iso), leagueHhMm(iso))).toBe(iso)
  })
})
