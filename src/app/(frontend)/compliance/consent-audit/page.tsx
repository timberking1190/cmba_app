import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { isSuperAdmin } from '@/access/index'
import type { User } from '@/payload-types'
import { CalgarySkyline } from '@/components/graphics/CalgarySkyline'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Consent Audit | CMBA Connect' }

/*
 * Consent audit view (super-admin only). Lists every account with its accepted
 * policy versions + date, and flags any account missing a CURRENT sign-off
 * (outdated version or never accepted). Satisfies the Phase 2 "consent audit
 * view" requirement; data comes from Users.consents + the PolicyVersions global.
 */
export default async function ConsentAuditPage() {
  const actor = await getCurrentUser()
  if (!actor) redirect('/login?redirect=/compliance/consent-audit')
  if (!isSuperAdmin(actor)) redirect('/account')

  const payload = await getPayloadClient()
  const [current, usersRes] = await Promise.all([
    payload.findGlobal({ slug: 'policy-versions' }),
    payload.find({ collection: 'users', depth: 0, limit: 1000, overrideAccess: true, sort: 'email' }),
  ])
  const users = usersRes.docs as User[]

  const rows = users.map((u) => {
    const c = u.consents || {}
    const missing: string[] = []
    if (!c.acceptedAt) missing.push('never accepted')
    if (c.termsVersion !== current.termsVersion) missing.push('Terms')
    if (c.privacyVersion !== current.privacyVersion) missing.push('Privacy')
    if (u.isMinor && c.guardianConsentVersion !== current.guardianConsentVersion) missing.push('Guardian')
    return { u, c, missing, current: missing.length === 0 }
  })

  const flagged = rows.filter((r) => !r.current).length

  return (
    <div className="relative max-w-6xl mx-auto px-4 lg:px-6 py-10">
      <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-20 text-white/[0.03]" />
      <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight">Consent Audit</h1>
      <p className="text-sm text-cmba-grey mt-1">
        Current policy versions — Terms {current.termsVersion}, Privacy {current.privacyVersion},
        Guardian {current.guardianConsentVersion}.
      </p>
      <div className="flex gap-4 mt-4 mb-6">
        <div className="reveal rv-scale bg-cmba-black-card border border-white/12 px-4 py-2">
          <div className="font-display font-black text-2xl text-white">{rows.length}</div>
          <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Accounts</div>
        </div>
        <div style={{ transitionDelay: '60ms' }} className={`reveal rv-scale bg-cmba-black-card border px-4 py-2 ${flagged ? 'border-red-500/40' : 'border-green-500/30'}`}>
          <div className={`font-display font-black text-2xl ${flagged ? 'text-red-400' : 'text-green-400'}`}>{flagged}</div>
          <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Missing current sign-off</div>
        </div>
      </div>

      <div className="reveal overflow-x-auto bg-cmba-black-card border border-white/12">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider border-b border-white/10">
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Minor</th>
              <th className="px-4 py-3">Terms</th>
              <th className="px-4 py-3">Privacy</th>
              <th className="px-4 py-3">Guardian</th>
              <th className="px-4 py-3">Accepted</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(({ u, c, missing, current: ok }) => (
              <tr key={u.id} className="text-cmba-grey-light">
                <td className="px-4 py-3">
                  <div className="text-white">{u.fullName}</div>
                  <div className="font-mono text-[11px] text-cmba-grey-mid">{u.email}</div>
                </td>
                <td className="px-4 py-3">{u.isMinor ? 'Yes' : '—'}</td>
                <td className="px-4 py-3 font-mono text-[11px]">{c.termsVersion ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-[11px]">{c.privacyVersion ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-[11px]">{c.guardianConsentVersion ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-[11px]">
                  {c.acceptedAt ? new Date(c.acceptedAt).toLocaleDateString('en-CA') : '—'}
                </td>
                <td className="px-4 py-3">
                  {ok ? (
                    <span className="inline-flex items-center gap-1 text-green-400 font-mono text-[11px]"><CheckCircle2 size={13} /> Current</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-400 font-mono text-[11px]" title={missing.join(', ')}>
                      <AlertTriangle size={13} /> {missing.join(', ')}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
