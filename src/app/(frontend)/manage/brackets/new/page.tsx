import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { canManageScheduling } from '@/access/index'
import { BracketCreator } from '@/components/manage/BracketCreator'
import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { buildScheduleFilters } from '@/lib/manage/scheduleFilters'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Create a bracket | CMBA Connect' }

export default async function NewBracketPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/manage/brackets/new')
  if (!canManageScheduling(user)) redirect('/account')

  const payload = await getPayloadClient()
  const { divisions } = await buildScheduleFilters(payload)

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Admin, scheduling</div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">
        Create a <span className="text-cmba-red">bracket</span>
      </h1>
      <p className="text-cmba-grey text-sm mb-8 max-w-3xl">
        Four steps, and nothing is saved until the last one. The seeding starts from the division standings and you can change it before anything exists.
      </p>
      <BracketCreator divisions={divisions} />
    </div>
  )
}
