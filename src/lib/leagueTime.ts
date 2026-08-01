/*
 * League time zone helpers. Pure, no I/O, safe on the client and the server.
 *
 * Everything in this app stores instants in UTC, but a scheduler thinks in
 * Calgary wall time. Two bugs come from mixing those up, and both are fixed by
 * always going through here:
 *
 *  - "Same day" computed from the UTC date splits a Saturday evening game onto
 *    Sunday, because 6:00 PM in Calgary is 01:00 UTC the next day. That silently
 *    broke the officials max-games-per-day check.
 *  - Times shown to people should read 8:00 PM, not 20:00. Only the CSV templates
 *    and machine formats use 24 hour.
 */

export const LEAGUE_TZ = 'America/Edmonton'

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: LEAGUE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('en-CA', { timeZone: LEAGUE_TZ, hour: 'numeric', minute: '2-digit', hour12: true })
const dateOnlyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: LEAGUE_TZ, weekday: 'short', month: 'short', day: 'numeric' })
const hm24Fmt = new Intl.DateTimeFormat('en-CA', { timeZone: LEAGUE_TZ, hour: '2-digit', minute: '2-digit', hour12: false })

/** The calendar day in the league time zone, as YYYY-MM-DD. Use for grouping. */
export function leagueDayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return ''
  return dayFmt.format(d) // en-CA gives YYYY-MM-DD
}

/** "8:00 PM" in the league time zone. */
export function leagueTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return 'TBD'
  return timeFmt.format(d).replace(/ /g, ' ').toUpperCase().replace('A.M.', 'AM').replace('P.M.', 'PM')
}

/*
 * "Sat, Jan 10, 8:00 PM" in the league time zone. Composed from the two helpers
 * rather than one formatter, because en-CA renders the meridiem as "p.m." and
 * this app shows PM everywhere.
 */
export function leagueDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return 'Date to be confirmed'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return 'Date to be confirmed'
  return `${dateOnlyFmt.format(d)}, ${leagueTime(d)}`
}

/** "Sat Jan 10" in the league time zone. */
export function leagueDate(iso: string | Date | null | undefined): string {
  if (!iso) return 'Date to be confirmed'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return 'Date to be confirmed'
  return dateOnlyFmt.format(d)
}

/** The 24 hour HH:MM wall time in the league zone. For prefilling form inputs. */
export function leagueHhMm(iso: string | Date | null | undefined): string {
  if (!iso) return ''
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return ''
  return hm24Fmt.format(d).replace('24:', '00:')
}

function tzOffsetMinutes(date: Date): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const local = new Date(date.toLocaleString('en-US', { timeZone: LEAGUE_TZ }))
  return Math.round((local.getTime() - utc.getTime()) / 60000)
}

/** Turn a league wall date + HH:MM into the UTC instant to store. */
export function leagueWallTimeToUtcISO(dateStr: string, timeStr: string): string {
  const naive = new Date(`${dateStr}T${timeStr}:00Z`)
  if (Number.isNaN(naive.getTime())) return ''
  const off = tzOffsetMinutes(naive)
  return new Date(naive.getTime() - off * 60000).toISOString()
}
