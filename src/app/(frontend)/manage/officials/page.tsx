import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { isAnyAdmin } from '@/access/index'
import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { OfficialsConsole } from '@/components/manage/OfficialsConsole'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Assign officials | CMBA Connect' }

const fmt = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Edmonton' })
const rel = (r: unknown, k: string) => (r && typeof r === 'object' ? (r as Record<string, string>)[k] ?? '' : '')

export default async function ManageOfficialsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/manage/officials')
  if (!isAnyAdmin(user)) redirect('/account')

  const payload = await getPayloadClient()
  const gamesRes = await payload.find({ collection: 'games', where: { and: [{ isBye: { not_equals: true } }, { status: { in: ['scheduled', 'reported'] } }] }, sort: ['startAt', 'id'], depth: 1, limit: 200, overrideAccess: true })
  const games = (gamesRes.docs as unknown as Array<Record<string, unknown>>).map((g) => ({
    id: g.id as number,
    label: `${g.startAt ? fmt.format(new Date(g.startAt as string)) : 'TBD'} · ${rel(g.homeTeam, 'name')} vs ${rel(g.awayTeam, 'name')}`,
  }))
  const offRes = await payload.find({ collection: 'officials', where: { active: { not_equals: false } }, sort: ['name'], depth: 0, limit: 500, overrideAccess: true })
  const officials = (offRes.docs as Array<{ id: number; name: string; rampLevel?: string }>).map((o) => ({ id: o.id, name: o.name, rampLevel: o.rampLevel }))

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Admin · Scheduling</div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">Assign <span className="text-cmba-red">officials</span></h1>
      <p className="text-cmba-grey text-sm mb-8 max-w-2xl">Pick a game, choose officials and their roles, and assign. Double-booking is blocked unless you override it, and over-max-per-day and ramp-level warnings are shown. Each assignment notifies the official.</p>
      <OfficialsConsole games={games} officials={officials} />
    </div>
  )
}
