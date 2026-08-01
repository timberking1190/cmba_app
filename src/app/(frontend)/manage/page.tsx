import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, Calendar, CheckCircle2, Trophy, Upload, Users } from 'lucide-react'

import { canManageScheduling } from '@/access/index'
import { Callout, Panel } from '@/components/manage/ui'
import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { loadSeasonSnapshot } from '@/lib/manage/dashboard'
import { enforceMfa } from '@/lib/mfa/enforce'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Scheduling admin | CMBA Connect' }

const TILES = [
  { href: '/manage/schedule', title: 'Schedule', desc: 'Edit any game: date, time, venue, court, teams, status, and score.', icon: Calendar },
  { href: '/manage/officials', title: 'Officials', desc: 'Staff a whole weekend in one sitting, with conflicts checked live.', icon: Users },
  { href: '/manage/brackets', title: 'Brackets', desc: 'Seed the playoffs, publish them, and watch the winners advance.', icon: Trophy },
  { href: '/manage/contested', title: 'Contested', desc: 'Decide results the two teams do not agree on.', icon: AlertTriangle },
  { href: '/manage/import', title: 'Import', desc: 'Bring in teams, venues, officials, and games from a spreadsheet.', icon: Upload },
]

const TONE_CLS: Record<string, string> = {
  urgent: 'text-status-danger',
  todo: 'text-status-warn',
  calm: 'text-cmba-grey-light',
}

/*
 * The season dashboard. The first thing a scheduler sees is what needs them
 * today, with a real number beside it and one click to the screen that fixes it.
 */
export default async function ManageHub() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/manage')
  if (!canManageScheduling(user)) redirect('/account')
  await enforceMfa('/manage')

  const payload = await getPayloadClient()
  const snapshot = await loadSeasonSnapshot(payload)
  const needsAttention = snapshot.items.filter((i) => i.count > 0 && i.tone !== 'calm')

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-8">
      <div>
        <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Admin</div>
        <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-2">
          Scheduling <span className="text-cmba-red">console</span>
        </h1>
        <p className="text-cmba-grey text-sm max-w-3xl">
          {snapshot.totals.games} games, {snapshot.totals.published} of them on the public site, {snapshot.totals.teams} teams, and {snapshot.totals.officials}{' '}
          active officials.
        </p>
      </div>

      <Panel title="What needs you now" description="Counted live. Select any of these to go straight to the screen that deals with it.">
        {snapshot.allClear && needsAttention.length === 0 ? (
          <Callout tone="success" title="Nothing is waiting on you">
            No contested results, nothing waiting on a second team, and every upcoming game has officials. This is a good moment to publish anything still in
            draft or to get the playoff brackets ready.
          </Callout>
        ) : null}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {snapshot.items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="bg-cmba-black-surface border border-white/10 hover:border-cmba-red/40 p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmba-red"
            >
              <div className="flex items-baseline gap-2">
                <span className={`font-display font-black text-3xl tabular-nums ${item.count === 0 ? 'text-cmba-grey-dark' : TONE_CLS[item.tone]}`}>
                  {item.count}
                </span>
                {item.count === 0 && <CheckCircle2 size={14} className="text-status-ok" aria-hidden />}
              </div>
              <div className="font-display font-bold text-xs text-white uppercase tracking-wide mt-1">{item.label}</div>
              <p className="text-[11px] text-cmba-grey mt-1">{item.count === 0 ? 'Nothing to do here right now.' : item.action}</p>
            </Link>
          ))}
        </div>
      </Panel>

      <div>
        <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-3">Everything you can do</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {TILES.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="bg-cmba-black-card border border-white/12 hover:border-cmba-red/40 p-5 transition-colors group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmba-red"
            >
              <t.icon size={20} className="text-cmba-red mb-3" aria-hidden />
              <div className="font-display font-bold text-white uppercase tracking-wide text-sm group-hover:text-cmba-red transition-colors">{t.title}</div>
              <p className="text-[11px] text-cmba-grey mt-1">{t.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
