import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { getAuthWithSid, storeWebauthnChallenge } from '@/lib/mfa/server'
import { regOptions } from '@/lib/mfa/webauthn'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/auth/mfa/passkey/register/options - start passkey registration.
 * Returns WebAuthn creation options (challenge stored server-side, single-use).
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const auth = await getAuthWithSid(payload, req)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { user } = auth

  const rl = await checkRateLimit(payload, { bucket: 'mfa_enroll', subject: String(user.id), limit: 5, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 })

  const existing = await payload.find({ collection: 'webauthn-credentials', where: { user: { equals: user.id } }, limit: 50, overrideAccess: true })
  const exclude = existing.docs.map((d) => ({ id: (d as { credentialID: string }).credentialID, transports: (d as { transports?: never }).transports }))

  const options = await regOptions({ userId: user.id, userName: user.email ?? `user-${user.id}`, exclude })
  await storeWebauthnChallenge(payload, user.id, options.challenge, 'registration')
  return NextResponse.json(options)
}
