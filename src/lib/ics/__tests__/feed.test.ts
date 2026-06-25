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
