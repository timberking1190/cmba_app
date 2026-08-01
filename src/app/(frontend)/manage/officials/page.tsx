import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { canManageScheduling } from '@/access/index'
import { OfficialsBoard, type BoardGame, type BoardOfficial } from '@/components/manage/OfficialsBoard'
import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { leagueDate, leagueDayKey, leagueTime, leagueWallTimeToUtcISO } from '@/lib/leagueTime'
import { buildScheduleFilters } from '@/lib/manage/scheduleFilters'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Assign officials | CMBA Connect' }

const BOARD_PAGE_SIZE = 40

const relId = (r: unknown): string | number | null =>
  r == null ? null : typeof r === 'object' ? ((r as { id: string | number }).id ?? null) : (r as string | number)
const relName = (r: unknown, ...keys: string[]): string =>
  r && typeof r === 'object' ? (keys.map((k) => (r as Record<string, string>)[k]).find(Boolean) ?? '') : ''

/*
 * The officials assignment board. Loads the slate the scheduler asked for, plus
 * every official's current load per day so the board can show who is filling up
 * as choices are made. Staffing a whole weekend happens in one submit.
 */
export default async function ManageOfficialsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/manage/officials')
  if (!canManageScheduling(user)) redirect('/account')

  const sp = await searchParams
  const filter = {
    day: sp.day ?? '',
    division: sp.division ?? '',
    venue: sp.venue ?? '',
    unstaffedOnly: sp.unstaffed === '1',
  }
  const page = Math.max(1, Number(sp.page ?? '1') || 1)

  const payload = await getPayloadClient()

  /*
   * Default to ONE day rather than the whole season.
   *
   * Staffing is a per weekend job, and loading every day at once does not just
   * cost time, it produces a board nobody can use: at league scale that is
   * hundreds of games in one list. Measured against the 1,500 game season, the
   * unscoped board took 26 seconds to render. Scoped to a day it is a normal page.
   *
   * The day chosen is the next one that still has games, so a scheduler lands on
   * work rather than on an empty screen. Every day remains available from the
   * picker, deliberately as an explicit choice.
   */
  let effectiveDay = filter.day
  if (!effectiveDay) {
    const next = await payload.find({
      collection: 'games',
      where: { and: [{ isBye: { not_equals: true } }, { status: { in: ['scheduled', 'reported', 'postponed'] } }] } as never,
      sort: ['startAt'],
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    const firstStart = (next.docs[0] as { startAt?: string } | undefined)?.startAt
    if (firstStart) effectiveDay = leagueDayKey(firstStart)
  }

  const and: Array<Record<string, unknown>> = [{ isBye: { not_equals: true } }, { status: { in: ['scheduled', 'reported', 'postponed'] } }]
  if (filter.division) and.push({ division: { equals: filter.division } })
  if (filter.venue) and.push({ venue: { equals: filter.venue } })
  if (effectiveDay) {
    // A league day runs from midnight to midnight in Calgary, which is not a UTC day.
    const next = new Date(`${effectiveDay}T00:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    and.push({ startAt: { greater_than_equal: leagueWallTimeToUtcISO(effectiveDay, '00:00') } })
    and.push({ startAt: { less_than: leagueWallTimeToUtcISO(next.toISOString().slice(0, 10), '00:00') } })
  }

  const [gamesRes, offRes, filters] = await Promise.all([
    payload.find({ collection: 'games', where: { and } as never, sort: ['startAt', 'id'], depth: 1, limit: BOARD_PAGE_SIZE, page, overrideAccess: true }),
    payload.find({ collection: 'officials', where: { active: { not_equals: false } }, sort: ['name'], depth: 0, limit: 500, overrideAccess: true }),
    buildScheduleFilters(payload),
  ])

  const gameDocs = gamesRes.docs as unknown as Array<Record<string, unknown>>

  /*
   * Assignments already on the games this board is showing.
   */
  const slateAssignments = gameDocs.length
    ? await payload.find({
        collection: 'game-officials',
        where: { game: { in: gameDocs.map((g) => g.id as number) } },
        depth: 1,
        limit: 2000,
        overrideAccess: true,
      })
    : { docs: [] as unknown[] }

  /*
   * Each official's load, scoped to the DAYS this board is showing.
   *
   * This used to read every assignment in the league at depth 2, which is fine on
   * a handful of games and unusable on a real season: with 1,500 games it did not
   * return inside a minute. The load a scheduler needs to see is only for the days
   * in front of them, so that is all we fetch. Games on those days that the board
   * has filtered out still count, because an official is just as busy at a game
   * this screen is not showing.
   */
  const boardDays = Array.from(new Set(gameDocs.map((g) => leagueDayKey(String(g.startAt ?? ''))).filter(Boolean)))
  const dayWindows = boardDays.map((d) => {
    const next = new Date(`${d}T00:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    return {
      and: [
        { startAt: { greater_than_equal: leagueWallTimeToUtcISO(d, '00:00') } },
        { startAt: { less_than: leagueWallTimeToUtcISO(next.toISOString().slice(0, 10), '00:00') } },
      ],
    }
  })
  const dayGames = dayWindows.length
    ? await payload.find({ collection: 'games', where: { or: dayWindows } as never, depth: 0, limit: 4000, overrideAccess: true })
    : { docs: [] as unknown[] }
  const dayByGameId = new Map<string, string>()
  for (const g of dayGames.docs as unknown as Array<Record<string, unknown>>) {
    if (g.startAt) dayByGameId.set(String(g.id), leagueDayKey(String(g.startAt)))
  }
  const allAssignments = dayByGameId.size
    ? await payload.find({
        collection: 'game-officials',
        where: { game: { in: Array.from(dayByGameId.keys()) } },
        depth: 0,
        limit: 5000,
        overrideAccess: true,
      })
    : { docs: [] as unknown[] }

  const assignedByGame = new Map<string, Array<{ id: string | number; name: string; role: string }>>()
  for (const a of slateAssignments.docs as unknown as Array<Record<string, unknown>>) {
    const gid = String(relId(a.game) ?? '')
    const list = assignedByGame.get(gid) ?? []
    list.push({ id: relId(a.official) ?? '', name: relName(a.official, 'name') || 'An official', role: String(a.role ?? 'referee1') })
    assignedByGame.set(gid, list)
  }

  const loadByOfficial = new Map<string, Record<string, number>>()
  for (const a of allAssignments.docs as unknown as Array<Record<string, unknown>>) {
    const oid = String(relId(a.official) ?? '')
    const day = dayByGameId.get(String(relId(a.game) ?? ''))
    if (!oid || !day) continue
    const rec = loadByOfficial.get(oid) ?? {}
    rec[day] = (rec[day] ?? 0) + 1
    loadByOfficial.set(oid, rec)
  }

  const totalBoardGames = gamesRes.totalDocs
  const totalBoardPages = gamesRes.totalPages

  const games: BoardGame[] = gameDocs
    .map((g) => ({
      id: g.id as number,
      startAt: String(g.startAt ?? ''),
      dayLabel: leagueDate(g.startAt as string),
      timeLabel: g.startAt ? leagueTime(g.startAt as string) : 'Time to be confirmed',
      homeTeam: relName(g.homeTeam, 'name') || 'Home team',
      awayTeam: relName(g.awayTeam, 'name') || 'Away team',
      division: relName(g.division, 'displayLabel', 'fullPath'),
      divisionId: relId(g.division),
      venue: relName(g.venue, 'name'),
      court: relName(g.court, 'name'),
      venueId: relId(g.venue),
      requiredRampLevel: (g.division as { requiredRampLevel?: string } | undefined)?.requiredRampLevel ?? 'none',
      assigned: assignedByGame.get(String(g.id)) ?? [],
    }))
    .filter((g) => (filter.unstaffedOnly ? g.assigned.length === 0 : true))

  const officials: BoardOfficial[] = (offRes.docs as unknown as Array<Record<string, unknown>>).map((o) => ({
    id: o.id as number,
    name: String(o.name ?? 'Official'),
    rampLevel: (o.rampLevel as string) ?? null,
    maxGamesPerDay: (o.maxGamesPerDay as number) ?? null,
    loadByDay: loadByOfficial.get(String(o.id)) ?? {},
  }))

  // Days that actually have games, so the day picker only offers real choices.
  const days = Array.from(new Set(gameDocs.map((g) => leagueDayKey(String(g.startAt ?? ''))).filter(Boolean))).sort()

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Admin, scheduling</div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">
        Assign <span className="text-cmba-red">officials</span>
      </h1>
      <p className="text-cmba-grey text-sm mb-8 max-w-3xl">
        Staff a whole weekend in one sitting. Choose officials for as many games as you like, then assign them all at once. Each name shows how many games that
        person already has that day. Double booking is blocked unless you choose to override it, and every result names the official and says exactly what
        happened.
      </p>
      <OfficialsBoard
        games={games}
        officials={officials}
        days={days}
        divisions={filters.divisions}
        venues={filters.venues}
        filter={{ ...filter, day: effectiveDay }}
        page={page}
        totalPages={totalBoardPages}
        totalGames={totalBoardGames}
      />
    </div>
  )
}
