import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { encryptSecret } from '@/lib/mfa/crypto'
import { getAuthWithSid } from '@/lib/mfa/server'
import { generateTotpSecret, totpUri } from '@/lib/mfa/totp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/auth/mfa/totp/enroll - begin TOTP setup. Generates a fresh secret,
 * stores it ENCRYPTED and unactivated, and returns the otpauth URI + a QR data URL
 * for the user to scan. The plaintext base32 is returned once for manual entry; the
 * secret is only confirmed (and the user marked enrolled) at /activate.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const auth = await getAuthWithSid(payload, req)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { user } = auth

  const rl = await checkRateLimit(payload, { bucket: 'mfa_enroll', subject: String(user.id), limit: 5, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 })

  const existing = await payload.find({ collection: 'mfa-totp', where: { user: { equals: user.id } }, limit: 1, overrideAccess: true })
  const current = existing.docs[0] as { id: string | number; activated?: boolean } | undefined
  if (current?.activated) {
    return NextResponse.json({ error: 'An authenticator app is already set up. Remove it first to set up a new one.' }, { status: 409 })
  }

  const secret = generateTotpSecret()
  const uri = totpUri(secret, user.email ?? `user-${user.id}`)
  const data = { user: user.id, secretEncrypted: encryptSecret(secret), activated: false, lastStep: 0, createdAt: new Date().toISOString() }

  if (current) {
    await payload.update({ collection: 'mfa-totp', id: current.id, overrideAccess: true, data })
  } else {
    await payload.create({ collection: 'mfa-totp', overrideAccess: true, data })
  }

  const qr = await QRCode.toDataURL(uri)
  return NextResponse.json({ ok: true, secret, uri, qr })
}
