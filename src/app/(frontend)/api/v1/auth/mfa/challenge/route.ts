import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/security/botChallenge'
import { decryptSecret } from '@/lib/mfa/crypto'
import { verifyRecoveryCode } from '@/lib/mfa/recovery'
import { elevateSession, getAuthWithSid, writeAudit } from '@/lib/mfa/server'
import { verifyTotp } from '@/lib/mfa/totp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/auth/mfa/challenge { method, token } - an enrolled user with an
 * aal1 session completes a second factor (authenticator code or a one-time recovery
 * code) to elevate THIS session to AAL2. Per-session: elevating session A does not
 * elevate session B (the sid comes from the caller's own token).
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const auth = await getAuthWithSid(payload, req)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { user, sid } = auth

  const rl = await checkRateLimit(payload, { bucket: 'mfa_challenge', subject: String(user.id), limit: 6, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 })

  let method = ''
  let token = ''
  try {
    const body = (await req.json()) as { method?: string; token?: string }
    method = String(body.method ?? '')
    token = String(body.token ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const fail = async (msg: string) => {
    await writeAudit(payload, { actor: user.id, actorEmail: user.email, action: 'mfa.challenge.fail', entity: 'users', entityId: user.id, after: { method } })
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  if (method === 'totp') {
    const found = await payload.find({ collection: 'mfa-totp', where: { user: { equals: user.id } }, limit: 1, overrideAccess: true })
    const doc = found.docs[0] as { id: string | number; secretEncrypted: string; activated?: boolean; lastStep?: number } | undefined
    if (!doc?.activated) return await fail('No authenticator app is set up.')
    const step = verifyTotp(decryptSecret(doc.secretEncrypted), token, doc.lastStep ?? 0)
    if (step === null) return await fail('That code did not match. Try again.')
    await payload.update({ collection: 'mfa-totp', id: doc.id, overrideAccess: true, data: { lastStep: step } })
  } else if (method === 'recovery') {
    const found = await payload.find({ collection: 'recovery-codes', where: { user: { equals: user.id } }, limit: 1, overrideAccess: true })
    const doc = found.docs[0] as
      | { id: string | number; codes?: Array<{ id?: string; hash: string; salt: string; consumedAt?: string | null }>; remaining?: number }
      | undefined
    const codes = doc?.codes ?? []
    const matchIdx = codes.findIndex((c) => !c.consumedAt && verifyRecoveryCode(token, c.hash, c.salt))
    if (!doc || matchIdx < 0) return await fail('That recovery code is not valid or has already been used.')
    const updated = codes.map((c, i) => (i === matchIdx ? { ...c, consumedAt: new Date().toISOString() } : c))
    await payload.update({ collection: 'recovery-codes', id: doc.id, overrideAccess: true, data: { codes: updated, remaining: Math.max(0, (doc.remaining ?? updated.length) - 1) } as never })
  } else {
    return await fail('Unknown verification method.')
  }

  await elevateSession(payload, user.id, sid, { ip: getClientIp(req.headers), userAgent: req.headers.get('user-agent') ?? undefined })
  await writeAudit(payload, { actor: user.id, actorEmail: user.email, action: 'mfa.challenge.pass', entity: 'users', entityId: user.id, after: { method } })
  return NextResponse.json({ ok: true })
}
