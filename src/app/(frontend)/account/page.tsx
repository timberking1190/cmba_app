import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ShieldCheck, ShieldAlert, ShieldX, Download, ExternalLink, Trophy, Clock, AlertTriangle, CheckCircle2,
} from 'lucide-react'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { isAnyAdmin, isSuperAdmin } from '@/access/index'
import { getComplianceForUser, getPathwayProgress, getUserProgress } from '@/lib/compliance'
import { AccountActions } from '@/components/account/AccountActions'
import { CalgarySkyline } from '@/components/graphics/CalgarySkyline'
import type { Certification, CertificationType, Course } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'My Account | CMBA Connect' }

const statusChip: Record<string, { label: string; cls: string }> = {
  valid: { label: 'Valid', cls: 'bg-green-500/10 text-green-400 border-green-500/30' },
  expiring: { label: 'Expiring', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  expired: { label: 'Expired', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
  'pending-verification': { label: 'Pending verification', cls: 'bg-cmba-grey-dark/20 text-cmba-grey-light border-white/12' },
}

const nameOf = (rel: number | string | { name?: string } | null | undefined): string =>
  rel && typeof rel === 'object' ? rel.name ?? '' : ''

export default async function AccountPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/account')

  const payload = await getPayloadClient()
  const roles = user.roles ?? []
  const audience = roles.includes('coach') ? 'coach' : roles.includes('official') ? 'official' : undefined

  const [compliance, pathways, progress, certRes, certTypesRes] = await Promise.all([
    getComplianceForUser(payload, user),
    getPathwayProgress(payload, user, audience),
    getUserProgress(payload, user),
    payload.find({ collection: 'certifications', where: { user: { equals: user.id } }, depth: 2, limit: 200, overrideAccess: true }),
    payload.find({ collection: 'certification-types', limit: 200, depth: 0, overrideAccess: true }),
  ])
  const certs = certRes.docs as Certification[]
  const certTypes = certTypesRes.docs as CertificationType[]

  // Recommended courses: those tied to a missing required certification.
  const missingTypeIds = new Set(compliance.missing.map((m) => m.type.id))
  let recommended: Course[] = []
  if (missingTypeIds.size > 0) {
    const recRes = await payload.find({
      collection: 'courses',
      where: { relatedCertificationType: { in: Array.from(missingTypeIds) } },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    })
    recommended = recRes.docs as Course[]
  }

  const overallChip =
    compliance.overall === 'compliant'
      ? { icon: ShieldCheck, cls: 'text-green-400', label: 'Compliant', desc: 'You hold all required certifications.' }
      : compliance.overall === 'attention'
        ? { icon: ShieldAlert, cls: 'text-orange-400', label: 'Attention needed', desc: 'One or more certifications are expiring soon.' }
        : { icon: ShieldX, cls: 'text-red-400', label: 'Action required', desc: 'You are missing required certifications.' }

  const pending = user.status === 'pending'

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient border-b-2 border-cmba-red">
        <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-20 text-white/5" />
        <div className="relative max-w-6xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
          <div className="font-mono text-[11px] text-cmba-grey-mid uppercase tracking-[0.18em] mb-1">My Account</div>
          <h1 className="font-display font-black text-3xl lg:text-4xl text-white uppercase tracking-tight">
            {user.fullName}
          </h1>
          <div className="flex flex-wrap gap-2 mt-3">
            {roles.map((r) => (
              <span key={r} className="font-mono text-[10px] uppercase tracking-wider bg-cmba-red/10 text-cmba-red border border-cmba-red/30 px-2 py-0.5">
                {r.replace('_', ' ')}
              </span>
            ))}
          </div>
          <Link href="/account/security" className="inline-flex items-center gap-1.5 mt-4 font-mono text-[11px] text-cmba-grey-mid hover:text-white uppercase tracking-wider transition-colors">
            <ShieldCheck size={12} /> Security and two-factor
          </Link>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {pending && (
            <div className="reveal bg-orange-500/10 border border-orange-500/40 p-4 flex items-start gap-3">
              <Clock size={18} className="text-orange-400 shrink-0 mt-0.5" />
              <p className="text-sm text-cmba-grey-light">
                This account is <span className="text-orange-300 font-medium">pending guardian confirmation</span>. Some
                features stay limited until the guardian confirms their email.
              </p>
            </div>
          )}

          {/* Compliance banner */}
          <section className="reveal bg-cmba-black-card border border-white/12 p-5">
            <div className="flex items-center gap-3">
              <overallChip.icon size={28} className={overallChip.cls} />
              <div>
                <div className="font-display font-bold text-white uppercase tracking-wide">{overallChip.label}</div>
                <div className="text-xs text-cmba-grey">{overallChip.desc}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-display font-black text-2xl text-white">{compliance.heldValidCount}<span className="text-cmba-grey-mid text-lg">/{compliance.requiredCount}</span></div>
                <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Required held</div>
              </div>
            </div>

            {(compliance.missing.length > 0 || compliance.expiring.length > 0) && (
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                {compliance.missing.map((m) => (
                  <div key={`m-${m.type.id}`} className="flex items-center gap-2 text-sm">
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    <span className="text-cmba-grey-light">{m.type.name}</span>
                    <span className="font-mono text-[10px] text-red-400 uppercase">Missing</span>
                    {m.renewalUrl && (
                      <a href={m.renewalUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-cmba-red hover:text-white">
                        Get it <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
                {compliance.expiring.map((m) => (
                  <div key={`e-${m.type.id}`} className="flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-orange-400 shrink-0" />
                    <span className="text-cmba-grey-light">{m.type.name}</span>
                    <span className="font-mono text-[10px] text-orange-400 uppercase">
                      Expires in {m.daysUntilExpiry} days
                    </span>
                    {m.renewalUrl && (
                      <a href={m.renewalUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-cmba-red hover:text-white">
                        Renew <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Certification cards */}
          <section>
            <h2 className="reveal font-display font-bold text-white uppercase tracking-wide text-sm mb-3">My certifications</h2>
            {certs.length === 0 ? (
              <p className="text-sm text-cmba-grey">No certifications yet. Upload one below.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {certs.map((c, i) => {
                  const chip = statusChip[c.status ?? 'pending-verification'] ?? statusChip['pending-verification']
                  const file = c.certificateFile
                  const fileUrl = file && typeof file === 'object' ? file.url : undefined
                  return (
                    <div key={c.id} style={{ transitionDelay: `${i * 60}ms` }} className="reveal rv-scale bg-cmba-black-card border border-white/12 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-display font-bold text-sm text-white">{nameOf(c.type)}</div>
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 uppercase border ${chip.cls}`}>{chip.label}</span>
                      </div>
                      {c.expiryDate && (
                        <div className="font-mono text-[10px] text-cmba-grey-mid mt-1">
                          Expires {new Date(c.expiryDate).toLocaleDateString('en-CA')}
                        </div>
                      )}
                      {fileUrl && (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-3 text-xs text-cmba-red hover:text-white transition-colors">
                          <Download size={12} /> Download certificate
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Pathway progress */}
          {pathways.length > 0 && (
            <section>
              <h2 className="reveal font-display font-bold text-white uppercase tracking-wide text-sm mb-3 flex items-center gap-2">
                <Trophy size={14} className="text-cmba-red" /> Pathway progress
              </h2>
              <div className="space-y-4">
                {pathways.map((p, i) => (
                  <div key={p.pathway.id} style={{ transitionDelay: `${i * 60}ms` }} className="reveal rv-left bg-cmba-black-card border border-white/12 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-display font-bold text-white uppercase tracking-wide text-sm">{p.pathway.name}</div>
                      <div className="font-display font-black text-cmba-red">{p.overallPercent}%</div>
                    </div>
                    <div className="space-y-2">
                      {p.stages.map((s) => (
                        <div key={s.name} className="flex items-center gap-2">
                          {s.complete
                            ? <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                            : <div className="w-3.5 h-3.5 rounded-full border border-cmba-grey-dark shrink-0" />}
                          <span className="text-sm text-cmba-grey-light">{s.name}</span>
                          <span className="font-mono text-[10px] text-cmba-grey-mid ml-auto">{s.heldCount}/{s.requiredCount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommended courses */}
          {recommended.length > 0 && (
            <section>
              <h2 className="reveal font-display font-bold text-white uppercase tracking-wide text-sm mb-3">Recommended courses</h2>
              <div className="space-y-2">
                {recommended.map((c, i) => (
                  <a key={c.id} href={c.registerUrl ?? '#'} target="_blank" rel="noopener noreferrer" style={{ transitionDelay: `${i * 60}ms` }}
                    className="reveal rv-right flex items-center justify-between gap-3 bg-cmba-black-card border border-white/12 hover:border-cmba-red/40 p-3 transition-colors group">
                    <div>
                      <div className="font-display font-bold text-sm text-white group-hover:text-cmba-red transition-colors">{c.title}</div>
                      {c.provider && <div className="text-[11px] text-cmba-grey">{c.provider}</div>}
                    </div>
                    <ExternalLink size={14} className="text-cmba-grey-dark shrink-0" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column — XP + actions */}
        <div className="space-y-6">
          <section className="reveal rv-scale bg-cmba-black-card border border-cmba-red/30 p-5 text-center">
            <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">Level {progress.level}</div>
            <div className="font-display font-black text-2xl text-white uppercase">{progress.levelTitle}</div>
            <div className="font-mono text-[11px] text-cmba-grey-mid mt-1">{progress.xp} XP</div>
            <div className="mt-3 h-2 bg-cmba-grey-dark/30 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cmba-red to-cmba-red-dark rounded-full" style={{ width: `${progress.progress}%` }} />
            </div>
            {progress.earnedBadges.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {progress.earnedBadges.map((b) => (
                  <span key={b.id} title={b.name} className="text-xl">{b.icon}</span>
                ))}
              </div>
            )}
          </section>

          <AccountActions
            userId={user.id}
            initial={{
              fullName: user.fullName,
              preferredName: user.preferredName,
              pronouns: user.pronouns,
              phone: user.phone,
              bio: user.bio,
            }}
            certTypes={certTypes.map((t) => ({ id: t.id, name: t.name }))}
          />

          <Link href="/rep" className="block text-center font-mono text-xs text-cmba-red hover:text-white uppercase tracking-wider">
            My team: report and confirm scores →
          </Link>

          <Link href="/coach/pathway" className="block text-center font-mono text-xs text-cmba-grey hover:text-cmba-red uppercase tracking-wider">
            View full certification pathway →
          </Link>

          {isAnyAdmin(user) && (
            <section className="reveal bg-cmba-black-card border border-cmba-red/20 p-4">
              <h2 className="font-display font-bold text-white uppercase tracking-wide text-xs mb-2">Admin tools</h2>
              <div className="space-y-1.5">
                {/* Hard nav into the Payload admin SPA — not a Next page. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/admin" className="block font-mono text-xs text-cmba-red hover:text-white transition-colors">Management panel (/admin) →</a>
                <Link href="/manage" className="block font-mono text-xs text-cmba-red hover:text-white transition-colors">Scheduling console →</Link>
                <Link href="/compliance/dashboard" className="block font-mono text-xs text-cmba-red hover:text-white transition-colors">Compliance dashboard →</Link>
                {isSuperAdmin(user) && (
                  <Link href="/compliance/consent-audit" className="block font-mono text-xs text-cmba-red hover:text-white transition-colors">Consent audit →</Link>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
