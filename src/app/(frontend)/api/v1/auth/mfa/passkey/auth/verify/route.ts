import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/security/botChallenge'
import { consumeWebauthnChallenge, elevateSession, getAuthWithSid, writeAudit } from '@/lib/mfa/server'
import { verifyAuth } from '@/lib/mfa/webauthn'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/auth/mfa/passkey/auth/verify { response } - finish a passkey
 * challenge and elevate this session to AAL2. The signature counter is written
 * back; a non-increasing counter (cloned authenticator) is rejected.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const auth = await getAuthWithSid(payload, req)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { user, sid } = auth

  const rl = await checkRateLimit(payload, { bucket: 'mfa_challenge', subject: String(user.id), limit: 10, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 })

  let response: { id?: string } | undefined
  try {
    response = ((await req.json()) as { response?: { id?: string } }).response
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const fail = async (msg: string) => {
    await writeAudit(payload, { actor: user.id, actorEmail: user.email, action: 'mfa.challenge.fail', entity: 'users', entityId: user.id, after: { method: 'passkey' } })
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const credId = response?.id
  if (!credId) return await fail('Invalid passkey response.')

  const found = await payload.find({
    collection: 'webauthn-credentials',
    where: { and: [{ user: { equals: user.id } }, { credentialID: { equals: credId } }] },
    limit: 1,
    overrideAccess: true,
  })
  const cred = found.docs[0] as
    | { id: string | number; credentialID: string; publicKey: string; counter: number; transports?: never }
    | undefined
  if (!cred) return await fail('That passkey is not registered to this account.')

  const challenge = await consumeWebauthnChallenge(payload, user.id, 'authentication')
  if (!challenge) return await fail('Your passkey challenge expired. Please try again.')

  const result = await verifyAuth(response as never, challenge, { id: cred.credentialID, publicKey: cred.publicKey, counter: cred.counter, transports: cred.transports })
  if (!result) return await fail('We could not verify that passkey.')
  // Cloned-authenticator guard: counter must advance (unless the authenticator
  // does not implement counters, in which case both are 0).
  if (result.newCounter !== 0 && result.newCounter <= cred.counter) {
    return await fail('This passkey could not be verified safely. Please use another method.')
  }

  await payload.update({ collection: 'webauthn-credentials', id: cred.id, overrideAccess: true, data: { counter: result.newCounter, lastUsedAt: new Date().toISOString() } as never })
  await elevateSession(payload, user.id, sid, { ip: getClientIp(req.headers), userAgent: req.headers.get('user-agent') ?? undefined })
  await writeAudit(payload, { actor: user.id, actorEmail: user.email, action: 'mfa.challenge.pass', entity: 'users', entityId: user.id, after: { method: 'passkey' } })
  return NextResponse.json({ ok: true })
}
