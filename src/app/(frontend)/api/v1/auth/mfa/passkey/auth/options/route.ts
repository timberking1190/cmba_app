import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { getAuthWithSid, storeWebauthnChallenge } from '@/lib/mfa/server'
import { authOptions } from '@/lib/mfa/webauthn'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/auth/mfa/passkey/auth/options - start a passkey challenge for an
 * enrolled, signed-in (aal1) user who is elevating this session. Returns request
 * options scoped to the user's registered credentials.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const auth = await getAuthWithSid(payload, req)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { user } = auth

  const rl = await checkRateLimit(payload, { bucket: 'mfa_challenge', subject: String(user.id), limit: 10, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 })

  const creds = await payload.find({ collection: 'webauthn-credentials', where: { user: { equals: user.id } }, limit: 50, overrideAccess: true })
  if (creds.docs.length === 0) return NextResponse.json({ error: 'No passkey is registered.' }, { status: 400 })

  const allow = creds.docs.map((d) => ({ id: (d as { credentialID: string }).credentialID, transports: (d as { transports?: never }).transports }))
  const options = await authOptions(allow)
  await storeWebauthnChallenge(payload, user.id, options.challenge, 'authentication')
  return NextResponse.json(options)
}
