import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/security/botChallenge'
import { consumeWebauthnChallenge, elevateSession, getAuthWithSid, markEnrolled, writeAudit } from '@/lib/mfa/server'
import { verifyReg } from '@/lib/mfa/webauthn'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/auth/mfa/passkey/register/verify { response, name? } - finish passkey
 * registration. Verifies against the stored challenge + canonical origin, stores the
 * credential, marks the user enrolled, and elevates this session.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const auth = await getAuthWithSid(payload, req)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { user, sid } = auth

  const rl = await checkRateLimit(payload, { bucket: 'mfa_verify', subject: String(user.id), limit: 6, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 })

  let body: { response?: unknown; name?: string }
  try {
    body = (await req.json()) as { response?: unknown; name?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const challenge = await consumeWebauthnChallenge(payload, user.id, 'registration')
  const fail = async (msg: string) => {
    await writeAudit(payload, { actor: user.id, actorEmail: user.email, action: 'mfa.passkey.register.fail', entity: 'users', entityId: user.id })
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!challenge) return await fail('Your passkey setup expired. Please try again.')

  const result = await verifyReg(body.response as never, challenge)
  if (!result) return await fail('We could not verify that passkey. Please try again.')

  await payload.create({
    collection: 'webauthn-credentials',
    overrideAccess: true,
    data: {
      user: user.id,
      credentialID: result.credentialID,
      publicKey: result.publicKey,
      counter: result.counter,
      transports: result.transports,
      deviceType: result.deviceType,
      backedUp: result.backedUp,
      name: typeof body.name === 'string' && body.name ? body.name.slice(0, 60) : 'Passkey',
      createdAt: new Date().toISOString(),
    } as never,
  })

  await markEnrolled(payload, user.id, 'passkey')
  await elevateSession(payload, user.id, sid, { ip: getClientIp(req.headers), userAgent: req.headers.get('user-agent') ?? undefined })
  await writeAudit(payload, { actor: user.id, actorEmail: user.email, action: 'mfa.passkey.register', entity: 'users', entityId: user.id, after: { method: 'passkey' } })
  return NextResponse.json({ ok: true })
}
