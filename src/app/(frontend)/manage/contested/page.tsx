import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { isAnyAdmin } from '@/access/index'
import { SchedulingConsole } from '@/components/manage/SchedulingConsole'
import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { loadAdminGames, loadEditOptions } from '@/lib/manageGames.server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Contested queue | CMBA Connect' }

export default async function ContestedPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/manage/contested')
  if (!isAnyAdmin(user)) redirect('/account')

  const payload = await getPayloadClient()
  const [contested, awaiting, options] = await Promise.all([
    loadAdminGames(payload, { where: { status: { equals: 'contested' } }, sort: ['startAt', 'id'], limit: 100 }),
    loadAdminGames(payload, { where: { status: { equals: 'reported' } }, sort: ['startAt', 'id'], limit: 100 }),
    loadEditOptions(payload),
  ])

  // Attach the latest open dispute reason per game, so the admin sees why it is here.
  const ids = contested.games.map((g) => g.id)
  if (ids.length) {
    const disputes = await payload.find({
      collection: 'disputes',
      where: { and: [{ game: { in: ids } }, { status: { equals: 'open' } }] },
      depth: 0,
      limit: 200,
      overrideAccess: true,
    })
    const reasonByGame = new Map<string, string>()
    for (const d of disputes.docs as Array<{ game?: unknown; reason?: string }>) {
      const gid = typeof d.game === 'object' ? (d.game as { id: number }).id : d.game
      if (gid != null && !reasonByGame.has(String(gid))) reasonByGame.set(String(gid), d.reason ?? '')
    }
    for (const g of contested.games) g.disputeReason = reasonByGame.get(String(g.id))
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-10">
      <div>
        <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Admin, scheduling</div>
        <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">
          Contested <span className="text-cmba-red">queue</span>
        </h1>
        <p className="text-cmba-grey text-sm mb-6 max-w-2xl">
          Games where a result was contested or a review was requested. Resolve each one with a corrected final score, a forfeit, or a cancellation. A reason is
          required and recorded.
        </p>
        <SchedulingConsole games={contested.games} options={options} emptyMessage="Nothing is contested right now. Every reported result has been agreed." />
      </div>
      {awaiting.games.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-3">Awaiting confirmation</h2>
          <p className="text-cmba-grey text-sm mb-4 max-w-2xl">Reported by one team and waiting for the other team to confirm.</p>
          <SchedulingConsole games={awaiting.games} options={options} />
        </div>
      )}
    </div>
  )
}
