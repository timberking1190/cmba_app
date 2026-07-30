import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy } from 'lucide-react'

import { isAnyAdmin } from '@/access/index'
import { EmptyState, LinkButton, PublishChip } from '@/components/manage/ui'
import { getCurrentUser, getPayloadClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Playoff brackets | CMBA Connect' }

const relName = (r: unknown, ...keys: string[]): string =>
  r && typeof r === 'object' ? (keys.map((k) => (r as Record<string, string>)[k]).find(Boolean) ?? '') : ''

export default async function BracketsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/manage/brackets')
  if (!isAnyAdmin(user)) redirect('/account')

  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'playoff-brackets', sort: ['-seededAt'], depth: 1, limit: 200, overrideAccess: true })
  const brackets = (res.docs as unknown as Array<Record<string, unknown>>).map((b) => ({
    id: b.id as number,
    name: String(b.name ?? 'Bracket'),
    division: relName(b.division, 'displayLabel', 'fullPath') || 'Division',
    publishState: String(b.publishState ?? 'draft'),
    teams: Array.isArray(b.seedSnapshot) ? (b.seedSnapshot as unknown[]).length : 0,
  }))

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Admin, scheduling</div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">
        Playoff <span className="text-cmba-red">brackets</span>
      </h1>
      <p className="text-cmba-grey text-sm mb-8 max-w-3xl">
        A bracket seeds a division from its standings, creates the playoff games, and then advances the winners for you as results come in. Nothing is public until
        you publish it.
      </p>

      {brackets.length === 0 ? (
        <EmptyState
          icon={<Trophy size={22} />}
          title="No brackets yet"
          action={<LinkButton href="/manage/brackets/new">Create your first bracket</LinkButton>}
        >
          Creating one takes three steps. Pick a division, check the seeding and the matchups the standings produced, then create it. It stays a draft until you
          publish it, so you can look at it, rebuild it, or throw it away without anyone else seeing.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4">
            <LinkButton href="/manage/brackets/new">Create a bracket</LinkButton>
          </div>
          <ul className="space-y-2">
            {brackets.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/manage/brackets/${b.id}`}
                  className="flex flex-wrap items-center gap-3 bg-cmba-black-card border border-white/12 hover:border-cmba-red/40 p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmba-red"
                >
                  <Trophy size={16} className="text-cmba-red" aria-hidden />
                  <span className="font-display font-bold text-sm text-white">{b.name}</span>
                  <span className="font-mono text-[10px] text-cmba-grey-mid">{b.division}</span>
                  <span className="font-mono text-[10px] text-cmba-grey-mid">
                    {b.teams} team{b.teams === 1 ? '' : 's'}
                  </span>
                  <span className="ml-auto">
                    <PublishChip state={b.publishState} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
