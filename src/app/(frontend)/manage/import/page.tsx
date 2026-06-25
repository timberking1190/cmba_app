import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { isAnyAdmin } from '@/access/index'
import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { ImportConsole } from '@/components/manage/ImportConsole'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Import schedule data | CMBA Connect' }

export default async function ImportPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/manage/import')
  if (!isAnyAdmin(user)) redirect('/account')

  const payload = await getPayloadClient()
  const seasons = await payload.find({ collection: 'seasons', limit: 100, depth: 0, overrideAccess: true })

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Admin · Scheduling</div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">Import schedule data</h1>
      <p className="text-cmba-grey text-sm mb-8 max-w-2xl">
        Set up your season in three steps. Download a template, fill it in, then upload it here. Nothing is saved until you review and approve.
      </p>
      <ImportConsole seasons={seasons.docs.map((s) => ({ id: s.id, name: (s as { name?: string }).name ?? String(s.id) }))} />
    </div>
  )
}
