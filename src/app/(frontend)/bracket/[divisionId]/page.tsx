import type { Metadata } from 'next'
import { Trophy } from 'lucide-react'

import { getPayloadClient } from '@/lib/auth'
import { loadBracketView } from '@/lib/brackets/manage'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Playoff bracket | CMBA Connect' }

/*
 * The public playoff bracket. A parent should be able to read this and know the
 * same things a scheduler sees on the console: who won, who plays next, when and
 * where, and, when a matchup has not moved on, why it has not.
 */
export default async function BracketPage({ params }: { params: Promise<{ divisionId: string }> }) {
  const { divisionId } = await params
  const payload = await getPayloadClient()

  const brackets = await payload.find({
    collection: 'playoff-brackets',
    where: { and: [{ division: { equals: divisionId } }, { publishState: { equals: 'published' } }] },
    sort: ['-seededAt'],
    limit: 1,
    overrideAccess: true,
  })
  const found = brackets.docs[0] as { id?: number | string } | undefined
  const bracket = found?.id != null ? await loadBracketView(payload, found.id) : null

  if (!bracket) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
        <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">
          Playoff <span className="text-cmba-red">bracket</span>
        </h1>
        <p className="text-cmba-grey text-sm">
          The playoff bracket for this division has not been published yet. It appears here as soon as the league office publishes it.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Playoffs</div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">{bracket.name}</h1>
      <p className="text-cmba-grey text-sm mb-6">{bracket.divisionName}</p>

      {bracket.champion && (
        <p className="inline-flex items-center gap-2 bg-status-ok/10 border border-status-ok/40 text-status-ok px-4 py-2 mb-6 font-display font-bold uppercase tracking-wide text-sm">
          <Trophy size={16} aria-hidden /> {bracket.champion} are the champions
        </p>
      )}

      <div className="flex gap-6 overflow-x-auto pb-4">
        {bracket.rounds.map((round) => (
          <div key={round.round} className="min-w-[260px] flex flex-col justify-around gap-4">
            <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">{round.name}</div>
            {round.matchups.map((m) => (
              <div key={m.id} className="bg-cmba-black-card border border-white/12 p-3">
                <Team name={m.homeTeamName} seed={m.homeSeed} won={m.winnerTeamId != null && String(m.winnerTeamId) === String(m.homeTeamId)} />
                <div className="border-t border-white/10 my-1" />
                <Team name={m.awayTeamName} seed={m.awaySeed} won={m.winnerTeamId != null && String(m.winnerTeamId) === String(m.awayTeamId)} />
                {m.gameWhen && (
                  <p className="font-mono text-[10px] text-cmba-grey-mid mt-2">
                    {m.gameWhen}
                    {m.gameVenue ? `, ${m.gameVenue}` : ''}
                  </p>
                )}
                {m.isBye && <p className="text-[11px] text-cmba-grey-mid mt-1">Bye, no game is played.</p>}
                {m.holdReason && !m.isBye && <p className="text-[11px] text-cmba-grey-mid mt-1">{m.holdReason}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Team({ name, seed, won }: { name: string; seed?: number | null; won: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 text-sm ${won ? 'text-status-ok font-display font-bold' : 'text-cmba-grey-light'}`}>
      <span className="truncate">
        {seed ? <span className="font-mono text-[10px] text-cmba-grey-mid mr-1">#{seed}</span> : null}
        {name}
      </span>
      {won && <span className="font-mono text-[10px] uppercase shrink-0">Won</span>}
    </div>
  )
}
