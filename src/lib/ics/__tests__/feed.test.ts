import { describe, expect, it } from 'vitest'

import { buildIcs, makeIcsToken, verifyIcsToken } from '../feed'

describe('ICS feed', () => {
  it('emits a calendar with a VTIMEZONE and one VEVENT per game with DTSTAMP', () => {
    const ics = buildIcs(
      [{ id: 7, startAt: '2026-01-10T18:00:00.000Z', homeTeam: 'Excel', awayTeam: 'CoMBA', venue: 'Glenmore' }],
      { name: 'U13 Boys A', now: new Date('2026-06-25T00:00:00Z') },
    )
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VTIMEZONE')
    expect(ics).toContain('TZID:America/Edmonton')
    expect(ics).toContain('UID:game-7@cmbaplatform')
    expect(ics).toContain('DTSTAMP:')
    expect(ics).toContain('SUMMARY:Excel vs CoMBA')
    expect(ics).toContain('DTSTART;TZID=America/Edmonton:')
  })

  it('round-trips a capability token and rejects a tampered one', () => {
    const secret = 'test-secret'
    const token = makeIcsToken('division', 42, secret)
    expect(verifyIcsToken('division', token, secret)).toBe('42')
    expect(verifyIcsToken('division', `${token}.ics`, secret)).toBe('42') // tolerant of the .ics suffix
    expect(verifyIcsToken('division', '42.deadbeef', secret)).toBe(null)
    expect(verifyIcsToken('league', token, secret)).toBe(null) // wrong scope
  })
})

/*
 * Phase 2: what a parent subscribed to the calendar sees. A forfeit or a
 * postponement used to look exactly like a normal game, so a family could drive
 * to a gym for a game that was not happening.
 */
describe('a parent reading the calendar can tell what happened', () => {
  const game = (status: string, note?: string) => ({
    id: 1,
    startAt: '2026-01-11T01:00:00.000Z',
    homeTeam: 'Excel U13 Boys Orange',
    awayTeam: 'CoMBA BU13-1',
    venue: 'Trico Centre',
    status,
    note,
  })

  it('says Cancelled in the title, not only in a field no app shows', () => {
    const ics = buildIcs([game('cancelled')], { name: 'Feed', now: new Date('2026-01-01T00:00:00Z') })
    expect(ics).toContain('SUMMARY:Cancelled: Excel U13 Boys Orange vs CoMBA BU13-1')
    expect(ics).toContain('STATUS:CANCELLED')
  })

  it('says Postponed in the title and marks the entry tentative', () => {
    const ics = buildIcs([game('postponed')], { name: 'Feed', now: new Date('2026-01-01T00:00:00Z') })
    expect(ics).toContain('SUMMARY:Postponed: Excel U13 Boys Orange vs CoMBA BU13-1')
    expect(ics).toContain('STATUS:TENTATIVE')
  })

  it('says Forfeit in the title and carries who forfeited in the description', () => {
    const ics = buildIcs([game('forfeit', 'CoMBA BU13-1 forfeited, so Excel U13 Boys Orange takes the win.')], {
      name: 'Feed',
      now: new Date('2026-01-01T00:00:00Z'),
    })
    expect(ics).toContain('SUMMARY:Forfeit: Excel U13 Boys Orange vs CoMBA BU13-1')
    expect(ics).toContain('DESCRIPTION:CoMBA BU13-1 forfeited')
  })

  it('leaves a normal game unchanged', () => {
    const ics = buildIcs([game('scheduled')], { name: 'Feed', now: new Date('2026-01-01T00:00:00Z') })
    expect(ics).toContain('SUMMARY:Excel U13 Boys Orange vs CoMBA BU13-1')
    expect(ics).toContain('STATUS:CONFIRMED')
  })
})
