import type { Metadata } from 'next'

import { getPayloadClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Playoff bracket | CMBA Connect' }

const rel = (r: unknown, ...f: string[]) => (r && typeof r === 'object' ? f.map((k) => (r as Record<string, string>)[k]).find(Boolean) ?? '' : '')

export default async function BracketPage({ params }: { params: Promise<{ divisionId: string }> }) {
  const { divisionId } = await params
  const payload = await getPayloadClient()
  const brackets = await payload.find({ collection: 'playoff-brackets', where: { and: [{ division: { equals: divisionId } }, { publishState: { equals: 'published' } }] }, sort: ['-seededAt'], limit: 1, overrideAccess: true })
  const bracket = brackets.docs[0] as { id?: number | string; name?: string } | undefined

  if (!bracket) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
        <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">Playoff <span className="text-cmba-red">bracket</span></h1>
        <p className="text-cmba-grey text-sm">No published bracket for this division yet.</p>
      </div>
    )
  }

  const seriesRes = await payload.find({ collection: 'bracket-series', where: { bracket: { equals: bracket.id } }, sort: ['round', 'slot'], depth: 1, limit: 200, overrideAccess: true })
  const byRound = new Map<number, Array<Record<string, unknown>>>()
  for (const s of seriesRes.docs as unknown as Array<Record<string, unknown>>) {
    const r = (s.round as number) ?? 1
    if (!byRound.has(r)) byRound.set(r, [])
    byRound.get(r)!.push(s)
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b)

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Playoffs</div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-8">{bracket.name}</h1>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {rounds.map((r) => (
          <div key={r} className="min-w-[220px] flex flex-col justify-around gap-4">
            <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">{r === rounds[rounds.length - 1] ? 'Final' : `Round ${r}`}</div>
            {byRound.get(r)!.map((s) => {
              const home = rel(s.homeTeam) || (s.homeSeed ? `Seed ${s.homeSeed}` : 'TBD')
              const away = rel(s.awayTeam) || (s.awaySeed ? `Seed ${s.awaySeed}` : 'TBD')
              const winner = rel(s.winner)
              return (
                <div key={s.id as number} className="bg-cmba-black-card border border-white/12 p-3">
                  <Team name={home} won={Boolean(winner) && winner === rel(s.homeTeam)} />
                  <div className="border-t border-white/10 my-1" />
                  <Team name={away} won={Boolean(winner) && winner === rel(s.awayTeam)} />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function Team({ name, won }: { name: string; won: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${won ? 'text-green-400 font-display font-bold' : 'text-cmba-grey-light'}`}>
      <span className="truncate">{name}</span>
      {won && <span className="font-mono text-[10px] uppercase">Won</span>}
    </div>
  )
}
