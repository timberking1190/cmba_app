import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { isAnyAdmin } from '@/access/index'
import { BracketManager } from '@/components/manage/BracketManager'
import { LinkButton } from '@/components/manage/ui'
import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { loadBracketView } from '@/lib/brackets/manage'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Manage a bracket | CMBA Connect' }

export default async function BracketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/manage/brackets')
  if (!isAnyAdmin(user)) redirect('/account')

  const { id } = await params
  const payload = await getPayloadClient()
  const bracket = await loadBracketView(payload, Number(id))
  if (!bracket) notFound()

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em]">Admin, scheduling</div>
        <LinkButton href="/manage/brackets" variant="quiet">
          All brackets
        </LinkButton>
      </div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-6">{bracket.name}</h1>
      <BracketManager bracket={bracket} />
    </div>
  )
}
