import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { enforceMfa } from '@/lib/mfa/enforce'
import { getRepDashboard } from '@/lib/repDashboard'
import { RepConsole } from '@/components/rep/RepConsole'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'My team | CMBA Connect' }

export default async function RepPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/rep')
  await enforceMfa('/rep')

  const payload = await getPayloadClient()
  const dashboard = await getRepDashboard(payload, user.id)

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Team rep</div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">My <span className="text-cmba-red">team</span></h1>
      <p className="text-cmba-grey text-sm mb-8 max-w-2xl">
        Report scores for your games and confirm the other team&apos;s reports.{' '}
        {dashboard.teamIds.length === 0 && 'You are not yet a verified team representative. Ask your league admin to verify your account so you can report scores.'}
      </p>
      <RepConsole dashboard={dashboard} />
    </div>
  )
}
