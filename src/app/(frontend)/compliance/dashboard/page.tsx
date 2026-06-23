import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Clock, ShieldCheck, ExternalLink } from 'lucide-react'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { isAnyAdmin, isSuperAdmin, clubIdOf } from '@/access/index'
import { computeCertStatus, daysUntil } from '@/lib/certStatus'
import type { Certification, CertificationType, User } from '@/payload-types'
import { CalgarySkyline } from '@/components/graphics/CalgarySkyline'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Compliance Dashboard | CMBA Connect' }

const rel = <T,>(v: unknown): T | undefined => (v && typeof v === 'object' ? (v as T) : undefined)

/*
 * Compliance dashboard (admins). Lists certifications that are expiring or
 * lapsed, with renewal links. Super admins see everyone; club admins see only
 * their club's members. Status is recomputed live from expiry.
 */
export default async function ComplianceDashboardPage() {
  const actor = await getCurrentUser()
  if (!actor) redirect('/login?redirect=/compliance/dashboard')
  if (!isAnyAdmin(actor)) redirect('/account')

  const payload = await getPayloadClient()
  const actorClub = clubIdOf(actor)
  const superAdmin = isSuperAdmin(actor)

  const res = await payload.find({
    collection: 'certifications',
    depth: 2,
    limit: 2000,
    overrideAccess: true,
  })

  type Row = {
    id: number | string
    userName: string
    userEmail: string
    club?: string
    typeName: string
    status: 'expiring' | 'expired'
    expiryDate?: string | null
    daysLeft: number | null
    renewalUrl?: string | null
  }

  const rows: Row[] = []
  for (const c of res.docs as Certification[]) {
    const status = computeCertStatus({ verifiedAt: c.verifiedAt, expiryDate: c.expiryDate })
    if (status !== 'expiring' && status !== 'expired') continue
    const user = rel<User>(c.user)
    if (!user) continue
    const userClub = rel<{ id: number | string; name?: string }>(user.club)
    // Club admins: scope to their own club.
    if (!superAdmin) {
      const cid = userClub?.id ?? (typeof user.club === 'number' || typeof user.club === 'string' ? user.club : undefined)
      if (!actorClub || cid !== actorClub) continue
    }
    const type = rel<CertificationType>(c.type)
    rows.push({
      id: c.id,
      userName: user.fullName,
      userEmail: user.email,
      club: userClub?.name,
      typeName: type?.name ?? '—',
      status,
      expiryDate: c.expiryDate,
      daysLeft: daysUntil(c.expiryDate),
      renewalUrl: type?.renewalUrl,
    })
  }

  rows.sort((a, b) => (a.daysLeft ?? -9999) - (b.daysLeft ?? -9999))
  const expired = rows.filter((r) => r.status === 'expired').length
  const expiring = rows.filter((r) => r.status === 'expiring').length

  return (
    <div className="relative max-w-6xl mx-auto px-4 lg:px-6 py-10">
      <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-16 text-white/[0.03]" />
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight">Compliance Dashboard</h1>
      <p className="text-sm text-cmba-grey mt-1">
        {superAdmin ? 'All members.' : 'Your club’s members.'} Certifications expiring within 60 days or already lapsed.
      </p>

      <div className="flex gap-4 mt-4 mb-6">
        <div className="reveal rv-scale bg-cmba-black-card border border-red-500/40 px-4 py-2">
          <div className="font-display font-black text-2xl text-red-400">{expired}</div>
          <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Lapsed</div>
        </div>
        <div className="reveal rv-scale bg-cmba-black-card border border-orange-500/40 px-4 py-2" style={{ transitionDelay: '60ms' }}>
          <div className="font-display font-black text-2xl text-orange-400">{expiring}</div>
          <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Expiring</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="reveal bg-cmba-black-card border border-green-500/30 p-6 flex items-center gap-3">
          <ShieldCheck size={24} className="text-green-400" />
          <p className="text-sm text-cmba-grey-light">Nothing expiring or lapsed. All tracked certifications are current.</p>
        </div>
      ) : (
        <div className="reveal overflow-x-auto bg-cmba-black-card border border-white/12">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider border-b border-white/10">
                <th className="px-4 py-3">Member</th>
                {superAdmin && <th className="px-4 py-3">Club</th>}
                <th className="px-4 py-3">Certification</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Renew</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.id} className="text-cmba-grey-light">
                  <td className="px-4 py-3">
                    <div className="text-white">{r.userName}</div>
                    <div className="font-mono text-[11px] text-cmba-grey-mid">{r.userEmail}</div>
                  </td>
                  {superAdmin && <td className="px-4 py-3">{r.club ?? '—'}</td>}
                  <td className="px-4 py-3">{r.typeName}</td>
                  <td className="px-4 py-3">
                    {r.status === 'expired' ? (
                      <span className="inline-flex items-center gap-1 text-red-400 font-mono text-[11px]"><AlertTriangle size={13} /> Lapsed</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-orange-400 font-mono text-[11px]"><Clock size={13} /> {r.daysLeft}d left</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px]">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('en-CA') : '—'}</td>
                  <td className="px-4 py-3">
                    {r.renewalUrl ? (
                      <a href={r.renewalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cmba-red hover:text-white text-xs">
                        Link <ExternalLink size={11} />
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="reveal mt-6">
        <Link href="/account" className="font-mono text-xs text-cmba-grey hover:text-cmba-red uppercase tracking-wider">← Back to account</Link>
      </div>
    </div>
  )
}
