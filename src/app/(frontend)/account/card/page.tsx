import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { ShieldCheck, IdCard, ArrowLeft, CircleCheck, Circle, TriangleAlert, ExternalLink } from 'lucide-react'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { getActiveSigningKey, isSigningConfigured } from '@/lib/memberCards/keys'
import { loadRequirementMatrix, tokenExpirySeconds } from '@/lib/memberCards/issuance'
import { evaluateMember, isRoleScannable, requiredCredentialsForRoles, type CertStatus } from '@/lib/memberCards/requirements'
import { mintPassToken } from '@/lib/memberCards/token'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'My Member Card | CMBA Connect' }

const ROLE_LABEL: Record<string, string> = {
  coach: 'Coach', official: 'Official', league_official: 'League Official',
  participant: 'Participant', club_admin: 'Club Admin', super_admin: 'Super Admin',
}
const roleAccent = (roles: string[]): string =>
  roles.includes('coach') ? 'from-cmba-red/80 to-orange-600/70'
  : roles.includes('official') ? 'from-blue-600/80 to-cyan-600/70'
  : 'from-cmba-grey-dark to-cmba-grey-mid'

const photoUrlOf = (p: unknown): string | null =>
  p && typeof p === 'object' && typeof (p as { url?: unknown }).url === 'string' ? (p as { url: string }).url : null

type Rel = number | { id: number } | null | undefined
const relId = (r: Rel): number | undefined => (r == null ? undefined : typeof r === 'object' ? r.id : r)
const toISODate = (d: unknown): string | null => {
  if (!d) return null
  const dt = new Date(d as string)
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10)
}

export default async function MemberCardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/account/card')

  const payload = await getPayloadClient()
  const roles = (user.roles ?? []) as string[]

  const [passRes, matrix, gatingRes, certsRes] = await Promise.all([
    payload.find({ collection: 'passes', where: { member: { equals: user.id } }, limit: 1, depth: 0, overrideAccess: true }),
    loadRequirementMatrix(payload),
    payload.find({ collection: 'certification-types', where: { gatesMemberCard: { equals: true } }, limit: 1000, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'certifications', where: { user: { equals: user.id } }, limit: 1000, depth: 0, overrideAccess: true }),
  ])
  const pass = passRes.docs[0] as { serialNumber: string; currentJti?: string | null; season?: string } | undefined
  const scannable = roles.some((r) => isRoleScannable(matrix, r))

  // Names + "how to complete" links for each gating credential, and the member's held credentials.
  const labelById = new Map<string, { name: string; url: string | null }>(
    (gatingRes.docs as Array<{ id: number | string; name?: string; renewalUrl?: string | null }>).map((t) => [
      String(t.id),
      { name: t.name || 'Required credential', url: t.renewalUrl || null },
    ]),
  )
  const held = (certsRes.docs as Array<{ type: Rel; status: CertStatus; expiryDate?: string | null }>).map((c) => ({
    key: String(relId(c.type)),
    status: c.status,
    expiresOn: toISODate(c.expiryDate),
  }))

  // A member's card is ACTIVE only when every required credential is satisfied (D14/D20).
  const isActive = (user as { status?: string }).status ? (user as { status?: string }).status === 'active' : true
  const evalOutcome = evaluateMember(matrix, { roles, isActive, held, now: new Date() })
  const eligible = evalOutcome.verdict === 'valid'

  // Mint the QR only for an ELIGIBLE, scannable member (never for an incomplete one).
  let qrDataUrl: string | null = null
  if (scannable && eligible && pass?.currentJti && isSigningConfigured()) {
    try {
      const key = getActiveSigningKey()!
      const iat = Math.floor(Date.now() / 1000)
      const token = mintPassToken({
        passSerial: pass.serialNumber, jti: pass.currentJti, channel: 'wallet',
        kid: key.kid, iat, exp: tokenExpirySeconds(new Date(), 'wallet'), privateKeyPem: key.privateKeyPem,
      })
      qrDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
    } catch (err) {
      console.error('[account/card] QR mint failed (signing key issue):', err instanceof Error ? err.message : err)
      qrDataUrl = null
    }
  }

  // Per-credential checklist for a scannable member who is not yet eligible.
  const missingSet = new Set(evalOutcome.missing)
  const invalidSet = new Set(evalOutcome.expiredOrInvalid)
  const checklist = requiredCredentialsForRoles(matrix, roles).map((id) => {
    const meta = labelById.get(id)
    const state: 'done' | 'missing' | 'invalid' = missingSet.has(id) ? 'missing' : invalidSet.has(id) ? 'invalid' : 'done'
    return { id, name: meta?.name ?? 'Required credential', url: meta?.url ?? null, state }
  })
  const remaining = checklist.filter((c) => c.state !== 'done').length

  const memberNumber = (user as { memberNumber?: string | null }).memberNumber ?? '—'
  const name = (user as { preferredName?: string | null }).preferredName || user.fullName || user.email
  const photo = photoUrlOf((user as { profilePhoto?: unknown }).profilePhoto)
  const primaryRole = roles.find((r) => r === 'coach') || roles.find((r) => r === 'official') || roles[0] || 'participant'

  const statusPill = !scannable
    ? { text: ROLE_LABEL[primaryRole] ?? primaryRole, cls: 'border-white/20 bg-white/10 text-white' }
    : eligible
      ? { text: 'Active', cls: 'border-status-ok/40 bg-status-ok/15 text-status-ok' }
      : { text: 'Not active', cls: 'border-status-warn/40 bg-status-warn/15 text-status-warn' }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/account" className="mb-6 inline-flex items-center gap-1.5 text-sm text-cmba-grey-light hover:text-white">
        <ArrowLeft size={16} /> Account
      </Link>

      <div className={`rounded-2xl bg-gradient-to-br ${roleAccent(roles)} p-[1.5px] shadow-2xl`}>
        <div className="rounded-2xl bg-cmba-black/90 p-6 backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-white/90">
              <IdCard size={18} /> <span className="font-mono text-xs uppercase tracking-widest">CMBA+ Member</span>
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusPill.cls}`}>{statusPill.text}</span>
          </div>

          <div className="mt-6 flex items-center gap-4">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-16 w-16 rounded-full border border-white/20 object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl font-bold text-white">
                {(name || '?').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-lg font-bold text-white">{name}</div>
              <div className="font-mono text-sm text-white/70">{memberNumber}</div>
              <div className="text-xs text-white/50">Season {pass?.season ?? '2026-27'}</div>
            </div>
          </div>

          {!scannable ? (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white/70">
              <ShieldCheck size={16} /> Photo ID card — no sideline verification applies to this role.
            </div>
          ) : eligible ? (
            qrDataUrl ? (
              <div className="mt-6 rounded-xl bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Verification QR" className="mx-auto h-56 w-56" />
                <p className="mt-2 text-center text-xs text-cmba-grey-dark">Present at the gym for sideline verification</p>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4 text-center text-sm text-white/70">
                Verification QR is being set up for your card.
              </div>
            )
          ) : (
            <div className="mt-6 rounded-xl border border-status-warn/30 bg-status-warn/5 p-4">
              <div className="flex items-center gap-2 text-status-warn">
                <TriangleAlert size={16} />
                <span className="text-sm font-semibold">Your card isn&apos;t active yet</span>
              </div>
              <p className="mt-1 text-xs text-white/70">
                A verified member card is issued once your required screening and training are complete
                {remaining > 0 ? ` — ${remaining} still needed` : ''}:
              </p>
              <ul className="mt-3 space-y-2.5">
                {checklist.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    {item.state === 'done' ? (
                      <CircleCheck size={18} className="mt-0.5 shrink-0 text-status-ok" />
                    ) : item.state === 'invalid' ? (
                      <TriangleAlert size={18} className="mt-0.5 shrink-0 text-status-warn" />
                    ) : (
                      <Circle size={18} className="mt-0.5 shrink-0 text-white/40" />
                    )}
                    <div className="min-w-0">
                      <div className={item.state === 'done' ? 'text-white/50 line-through' : 'text-white'}>{item.name}</div>
                      <div className="text-xs text-white/50">
                        {item.state === 'done' ? 'Complete' : item.state === 'invalid' ? 'Expired or awaiting verification' : 'Not started'}
                        {item.state !== 'done' && item.url && /^https?:\/\//.test(item.url) ? (
                          <>
                            {' · '}
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-cmba-red hover:underline">
                              Complete <ExternalLink size={11} />
                            </a>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-white/40">
                Already completed one of these? It can take a short time to verify. Contact CMBA if it doesn&apos;t update.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-cmba-grey-mid">
        Apple Wallet &amp; Google Wallet download are coming soon.
      </p>
    </main>
  )
}
