import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { isAnyAdmin } from '@/access/index'
import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { SchedulingConsole } from '@/components/manage/SchedulingConsole'
import { toAdminGame } from '@/lib/manageGames'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Manage schedule | CMBA Connect' }

export default async function ManageSchedulePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/manage/schedule')
  if (!isAnyAdmin(user)) redirect('/account')

  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'games', where: { isBye: { not_equals: true } }, sort: ['-startAt', 'id'], depth: 1, limit: 100, overrideAccess: true })
  const games = (res.docs as unknown as Array<Record<string, unknown>>).map(toAdminGame)

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Admin · Scheduling</div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">Manage <span className="text-cmba-red">schedule</span></h1>
      <p className="text-cmba-grey text-sm mb-8 max-w-2xl">Publish or unpublish games, and use Manage to finalize, postpone, cancel, or forfeit a game. Every change records a reason in the audit log.</p>
      <SchedulingConsole games={games} />
    </div>
  )
}
