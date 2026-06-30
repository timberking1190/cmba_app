import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/security/botChallenge'
import { decryptSecret } from '@/lib/mfa/crypto'
import { generateRecoveryCodes, hashRecoveryCode } from '@/lib/mfa/recovery'
import { elevateSession, getAuthWithSid, markEnrolled, writeAudit } from '@/lib/mfa/server'
import { verifyTotp } from '@/lib/mfa/totp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/auth/mfa/totp/activate { token } - confirm the pending TOTP secret.
 * On success: activate it, mark the user enrolled, generate one-time recovery codes
 * (returned ONCE), and elevate this session to AAL2. Replay-protected via lastStep.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const auth = await getAuthWithSid(payload, req)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { user, sid } = auth

  const rl = await checkRateLimit(payload, { bucket: 'mfa_verify', subject: String(user.id), limit: 6, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 })

  let token = ''
  try {
    token = String(((await req.json()) as { token?: string }).token ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const found = await payload.find({ collection: 'mfa-totp', where: { user: { equals: user.id } }, limit: 1, overrideAccess: true })
  const doc = found.docs[0] as { id: string | number; secretEncrypted: string; activated?: boolean; lastStep?: number } | undefined
  if (!doc || doc.activated) {
    return NextResponse.json({ error: 'No pending authenticator to confirm. Start setup again.' }, { status: 400 })
  }

  const step = verifyTotp(decryptSecret(doc.secretEncrypted), token, doc.lastStep ?? 0)
  if (step === null) {
    await writeAudit(payload, { actor: user.id, actorEmail: user.email, action: 'mfa.totp.activate.fail', entity: 'users', entityId: user.id })
    return NextResponse.json({ error: 'That code did not match. Check your authenticator app and try again.' }, { status: 400 })
  }

  await payload.update({ collection: 'mfa-totp', id: doc.id, overrideAccess: true, data: { activated: true, lastStep: step, activatedAt: new Date().toISOString() } })
  await markEnrolled(payload, user.id, 'totp')

  // One-time recovery codes (shown once). Replace any prior set.
  const codes = generateRecoveryCodes()
  const hashed = codes.map((c) => {
    const { hash, salt } = hashRecoveryCode(c)
    return { hash, salt, consumedAt: null as string | null }
  })
  const existingRc = await payload.find({ collection: 'recovery-codes', where: { user: { equals: user.id } }, limit: 1, overrideAccess: true })
  const rcData = { user: user.id, codes: hashed, remaining: codes.length, generatedAt: new Date().toISOString() }
  if (existingRc.docs[0]) await payload.update({ collection: 'recovery-codes', id: existingRc.docs[0].id, overrideAccess: true, data: rcData as never })
  else await payload.create({ collection: 'recovery-codes', overrideAccess: true, data: rcData as never })

  await elevateSession(payload, user.id, sid, { ip: getClientIp(req.headers), userAgent: req.headers.get('user-agent') ?? undefined })
  await writeAudit(payload, { actor: user.id, actorEmail: user.email, action: 'mfa.totp.activate', entity: 'users', entityId: user.id, after: { method: 'totp' } })

  return NextResponse.json({ ok: true, recoveryCodes: codes })
}
