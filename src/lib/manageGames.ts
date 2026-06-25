import type { AdminGame } from '@/components/manage/SchedulingConsole'

/*
 * Map a Payload game doc (depth 1) to the AdminGame shape the scheduling consoles
 * render. Server-side only helper; the date is formatted in the league time zone.
 */
const fmt = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Edmonton' })
const rel = (r: unknown, ...f: string[]) => (r && typeof r === 'object' ? f.map((k) => (r as Record<string, string>)[k]).find(Boolean) ?? '' : '')

export function toAdminGame(g: Record<string, unknown>): AdminGame {
  return {
    id: g.id as number,
    status: (g.status as string) ?? 'scheduled',
    publishState: (g.publishState as string) ?? 'draft',
    homeTeam: rel(g.homeTeam, 'name'),
    awayTeam: rel(g.awayTeam, 'name'),
    division: rel(g.division, 'displayLabel', 'fullPath'),
    date: g.startAt ? fmt.format(new Date(g.startAt as string)) : 'TBD',
    homeScore: g.homeScore as number | null,
    awayScore: g.awayScore as number | null,
  }
}
