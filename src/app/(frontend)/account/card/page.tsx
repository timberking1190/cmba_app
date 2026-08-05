import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { ShieldCheck, IdCard, ArrowLeft, Apple, Wallet } from 'lucide-react'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { getActiveSigningKey, isSigningConfigured } from '@/lib/memberCards/keys'
import { loadRequirementMatrix, tokenExpirySeconds } from '@/lib/memberCards/issuance'
import { isRoleScannable } from '@/lib/memberCards/requirements'
import { mintPassToken } from '@/lib/memberCards/token'
import { googleDemoMode, isAppleWalletConfigured, isGoogleWalletConfigured } from '@/lib/memberCards/walletKeys'

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

export default async function MemberCardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/account/card')

  const payload = await getPayloadClient()
  const roles = (user.roles ?? []) as string[]

  const [passRes, matrix] = await Promise.all([
    payload.find({ collection: 'passes', where: { member: { equals: user.id } }, limit: 1, depth: 0, overrideAccess: true }),
    loadRequirementMatrix(payload),
  ])
  const pass = passRes.docs[0] as { serialNumber: string; currentJti?: string | null; season?: string } | undefined
  const scannable = roles.some((r) => isRoleScannable(matrix, r))

  let qrDataUrl: string | null = null
  if (scannable && pass?.currentJti && isSigningConfigured()) {
    const key = getActiveSigningKey()!
    const iat = Math.floor(Date.now() / 1000)
    const token = mintPassToken({
      passSerial: pass.serialNumber, jti: pass.currentJti, channel: 'wallet',
      kid: key.kid, iat, exp: tokenExpirySeconds(new Date(), 'wallet'), privateKeyPem: key.privateKeyPem,
    })
    qrDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
  }

  // Wallet download is offered only for a scannable pass that already carries a QR, and
  // only when that platform's signing material is configured server-side.
  const hasScannablePass = scannable && !!pass?.currentJti && isSigningConfigured()
  const appleAvailable = hasScannablePass && isAppleWalletConfigured()
  const googleAvailable = hasScannablePass && isGoogleWalletConfigured()
  const googleDemo = googleDemoMode()

  const memberNumber = (user as { memberNumber?: string | null }).memberNumber ?? '—'
  const name = (user as { preferredName?: string | null }).preferredName || user.fullName || user.email
  const photo = photoUrlOf((user as { profilePhoto?: unknown }).profilePhoto)
  const primaryRole = roles.find((r) => r === 'coach') || roles.find((r) => r === 'official') || roles[0] || 'participant'

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/account" className="mb-6 inline-flex items-center gap-1.5 text-sm text-cmba-grey-light hover:text-white">
        <ArrowLeft size={16} /> Account
      </Link>

      <div className={`rounded-2xl bg-gradient-to-br ${roleAccent(roles)} p-[1.5px] shadow-2xl`}>
        <div className="rounded-2xl bg-cmba-black/90 p-6 backdrop-blur">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-white/90">
              <IdCard size={18} /> <span className="font-mono text-xs uppercase tracking-widest">CMBA+ Member</span>
            </div>
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white">
              {ROLE_LABEL[primaryRole] ?? primaryRole}
            </span>
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

          {scannable ? (
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
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white/70">
              <ShieldCheck size={16} /> Photo ID card — no sideline verification applies to this role.
            </div>
          )}
        </div>
      </div>

      {appleAvailable || googleAvailable ? (
        <div className="mt-6 space-y-3">
          {appleAvailable && (
            // Real file download (.pkpass) — a plain anchor, not next/link (which would
            // client-navigate instead of downloading).
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href="/api/v1/member-cards/apple/download"
              // Fixed brand black/white (not the theme-flipped tokens) so the wallet
              // buttons keep their canonical look in both light and dark.
              style={{ backgroundColor: '#000', color: '#fff' }}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition hover:opacity-90"
            >
              <Apple size={18} /> Add to Apple Wallet
            </a>
          )}
          {googleAvailable && (
            <>
              {/* Server 302-redirects to pay.google.com — must be a plain anchor. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/api/v1/member-cards/google/save"
                style={{ backgroundColor: '#fff', color: '#202124' }}
                className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm ring-1 ring-black/10 transition hover:opacity-90"
              >
                <Wallet size={18} /> Add to Google Wallet
              </a>
              {googleDemo && (
                <p className="text-center text-xs text-cmba-grey-mid">
                  Google Wallet is in preview — it currently opens for approved test accounts only.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="mt-6 text-center text-xs text-cmba-grey-mid">
          Apple Wallet &amp; Google Wallet download are coming soon.
        </p>
      )}
    </main>
  )
}
