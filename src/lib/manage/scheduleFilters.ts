import type { Payload } from 'payload'

/*
 * Filters for the schedule console. This league runs thousands of games in a
 * season, so the console never loads them all: the filter narrows on the server
 * and the result is paged. The where builder is exported separately from the
 * option lists so it can be unit tested without a database.
 */

export type ScheduleFilter = {
  division: string
  venue: string
  status: string
  publishState: string
  /** League wall dates, YYYY-MM-DD, inclusive. */
  from: string
  to: string
  /** Free text against the team names. */
  q: string
}

export type ScheduleFilterOptions = {
  divisions: Array<{ id: string | number; name: string }>
  venues: Array<{ id: string | number; name: string }>
}

export const EMPTY_FILTER: ScheduleFilter = { division: '', venue: '', status: '', publishState: '', from: '', to: '', q: '' }

export function isFilterActive(f: ScheduleFilter): boolean {
  return Object.values(f).some((v) => v !== '')
}

/*
 * Build the Payload where clause. Dates are league wall dates, so a from of
 * 2026-01-10 must include a 9:00 PM game that is stored as the 11th in UTC.
 * Widening by a day on each end and letting the caller show league dates keeps
 * this simple and never hides a game the scheduler expected to see.
 */
export function buildScheduleWhere(f: ScheduleFilter, teamIds?: Array<string | number>): Record<string, unknown> {
  const and: Array<Record<string, unknown>> = [{ isBye: { not_equals: true } }]

  if (f.division) and.push({ division: { equals: f.division } })
  if (f.venue) and.push({ venue: { equals: f.venue } })
  if (f.status) and.push({ status: { equals: f.status } })
  if (f.publishState) and.push({ publishState: { equals: f.publishState } })
  if (f.from) and.push({ startAt: { greater_than_equal: `${f.from}T00:00:00.000Z` } })
  if (f.to) {
    const end = new Date(`${f.to}T00:00:00.000Z`)
    end.setUTCDate(end.getUTCDate() + 2) // the league day plus the UTC offset
    and.push({ startAt: { less_than: end.toISOString() } })
  }
  if (teamIds && teamIds.length) {
    and.push({ or: [{ homeTeam: { in: teamIds } }, { awayTeam: { in: teamIds } }] })
  }

  return and.length === 1 ? and[0] : { and }
}

/** Resolve a free-text team search to ids, then build the where clause. */
export async function scheduleWhere(payload: Payload, f: ScheduleFilter): Promise<Record<string, unknown>> {
  let teamIds: Array<string | number> | undefined
  if (f.q.trim()) {
    const res = await payload.find({
      collection: 'teams',
      where: { name: { like: f.q.trim() } },
      depth: 0,
      limit: 200,
      overrideAccess: true,
    })
    teamIds = res.docs.map((d) => d.id as string | number)
    // No team matched, so nothing can match. Use an id that cannot exist rather
    // than dropping the filter and showing the whole season.
    if (!teamIds.length) teamIds = [-1]
  }
  return buildScheduleWhere(f, teamIds)
}

export async function buildScheduleFilters(payload: Payload): Promise<ScheduleFilterOptions> {
  const [divisions, venues] = await Promise.all([
    payload.find({ collection: 'divisions', sort: ['fullPath'], depth: 0, limit: 500, overrideAccess: true }),
    payload.find({ collection: 'venues', sort: ['name'], depth: 0, limit: 500, overrideAccess: true }),
  ])
  return {
    divisions: (divisions.docs as unknown as Array<Record<string, unknown>>).map((d) => ({
      id: d.id as string | number,
      name: String(d.displayLabel ?? d.fullPath ?? d.name ?? d.id),
    })),
    venues: (venues.docs as unknown as Array<Record<string, unknown>>).map((v) => ({ id: v.id as string | number, name: String(v.name ?? v.id) })),
  }
}
