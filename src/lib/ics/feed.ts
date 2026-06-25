import { createHmac } from 'crypto'

/*
 * Pure ICS (RFC 5545) builder for schedule subscriptions, plus an unguessable
 * capability token for the feed URL. The token carries the resource id and an HMAC,
 * so a feed link is a bearer capability and the route never lists ids. Feeds carry
 * no personal data (times, venues, opponents only).
 */
const TZID = 'America/Edmonton'

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0700',
  'TZOFFSETTO:-0600',
  'TZNAME:MDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0600',
  'TZOFFSETTO:-0700',
  'TZNAME:MST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
].join('\r\n')

const partFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZID,
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
})

function localStamp(iso: string): string {
  const parts = partFmt.formatToParts(new Date(iso))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}${get('month')}${get('day')}T${hour}${get('minute')}${get('second')}`
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

const esc = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

export type IcsGame = {
  id: string | number
  startAt: string
  endAt?: string | null
  homeTeam: string
  awayTeam: string
  venue?: string
  status?: string
}

export function buildIcs(games: IcsGame[], opts: { name: string; now?: Date }): string {
  const now = opts.now ?? new Date()
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CMBA Connect//Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(opts.name)}`,
    `X-WR-TIMEZONE:${TZID}`,
    VTIMEZONE,
  ]
  for (const g of games) {
    if (!g.startAt) continue
    const end = g.endAt || new Date(new Date(g.startAt).getTime() + 75 * 60_000).toISOString()
    const cancelled = g.status === 'cancelled'
    lines.push(
      'BEGIN:VEVENT',
      `UID:game-${g.id}@cmbaplatform`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART;TZID=${TZID}:${localStamp(g.startAt)}`,
      `DTEND;TZID=${TZID}:${localStamp(end)}`,
      `SUMMARY:${esc(`${g.homeTeam} vs ${g.awayTeam}`)}`,
      ...(g.venue ? [`LOCATION:${esc(g.venue)}`] : []),
      `STATUS:${cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function hmac(scope: string, id: string | number, secret: string): string {
  return createHmac('sha256', secret).update(`${scope}:${id}`).digest('hex').slice(0, 24)
}

export function makeIcsToken(scope: string, id: string | number, secret: string): string {
  return `${id}.${hmac(scope, id, secret)}`
}

export function verifyIcsToken(scope: string, token: string, secret: string): string | null {
  const clean = token.replace(/\.ics$/, '')
  const dot = clean.lastIndexOf('.')
  if (dot < 1) return null
  const id = clean.slice(0, dot)
  const sig = clean.slice(dot + 1)
  return hmac(scope, id, secret) === sig ? id : null
}
