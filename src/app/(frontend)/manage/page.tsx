import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Upload, Calendar, AlertTriangle, Users } from 'lucide-react'

import { isAnyAdmin } from '@/access/index'
import { getCurrentUser } from '@/lib/auth'
import { enforceMfa } from '@/lib/mfa/enforce'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Scheduling admin | CMBA Connect' }

const TILES = [
  { href: '/manage/import', title: 'Import', desc: 'Bring in teams, venues, officials, and games from CSV.', icon: Upload },
  { href: '/manage/schedule', title: 'Schedule', desc: 'Edit, move, postpone, cancel, forfeit, and publish games.', icon: Calendar },
  { href: '/manage/contested', title: 'Contested', desc: 'Review contested results and open disputes.', icon: AlertTriangle },
  { href: '/manage/officials', title: 'Officials', desc: 'Assign officials to games with conflict checks.', icon: Users },
]

export default async function ManageHub() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/manage')
  if (!isAnyAdmin(user)) redirect('/account')
  await enforceMfa('/manage')

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
      <div className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-2">Admin</div>
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight mb-8">Scheduling <span className="text-cmba-red">console</span></h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="bg-cmba-black-card border border-white/12 hover:border-cmba-red/40 p-5 transition-colors group">
            <t.icon size={20} className="text-cmba-red mb-3" />
            <div className="font-display font-bold text-white uppercase tracking-wide text-sm group-hover:text-cmba-red transition-colors">{t.title}</div>
            <p className="text-[11px] text-cmba-grey mt-1">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
