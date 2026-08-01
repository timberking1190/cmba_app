import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { canManageScheduling } from '@/access/index'
import { ScheduleWorkspace } from '@/components/manage/ScheduleWorkspace'
import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { loadAdminGames, loadEditOptions } from '@/lib/manageGames.server'
import { buildScheduleFilters, scheduleWhere, type ScheduleFilter } from '@/lib/manage/scheduleFilters'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Manage schedule | CMBA Connect' }

const PAGE_SIZE = 50

/*
 * The schedule console. A season here runs to thousands of games, so the list is
 * filtered and paged on the server rather than loading everything into the
 * browser at once.
 */
export default async function ManageSchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/manage/schedule')
  if (!canManageScheduling(user)) redirect('/account')

  const sp = await searchParams
  const filter: ScheduleFilter = {
    division: sp.division ?? '',
    venue: sp.venue ?? '',
    status: sp.status ?? '',
    publishState: sp.publish ?? '',
    from: sp.from ?? '',
    to: sp.to ?? '',
    q: sp.q ?? '',
  }
  const page = Math.max(1, Number(sp.page ?? '1') || 1)

  const payload = await getPayloadClient()

  // Load the page of games first, so the edit options can be scoped to just the
  // divisions on screen rather than every team in the league.
  const { games, totalDocs, totalPages } = await loadAdminGames(payload, {
    where: await scheduleWhere(payload, filter),
    sort: ['startAt', 'id'],
    limit: PAGE_SIZE,
    page,
  })
  const divisionIds = Array.from(new Set(games.map((g) => g.divisionId).filter((d): d is string | number => d != null)))
  const [options, filters] = await Promise.all([loadEditOptions(payload, divisionIds), buildScheduleFilters(payload)])

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Admin, scheduling</div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">
        Manage <span className="text-cmba-red">schedule</span>
      </h1>
      <p className="text-cmba-grey text-sm mb-8 max-w-3xl">
        Select Edit on any game to change its date, time, venue, court, teams, status, or score. Clashes with the rest of the schedule are checked as you type and
        shown before you save. Every change needs a reason and is recorded in the audit log.
      </p>
      <ScheduleWorkspace games={games} options={options} filters={filters} filter={filter} page={page} totalPages={totalPages} totalDocs={totalDocs} />
    </div>
  )
}
