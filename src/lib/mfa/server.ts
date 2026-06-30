import type { Payload } from 'payload'

import type { User } from '@/payload-types'

/*
 * Stage C / S1 — server-side MFA writes. These run with overrideAccess (the mfa /
 * sessionMeta fields are update:()=>false to clients). Updating Users here is safe:
 * the Users side-effect hooks (consent enforcement, guardian flow, guardian email)
 * are all gated on operation === 'create', and logConsentRecord no-ops when consent
 * is unchanged, so a mfa/sessionMeta update triggers no emails or rejections.
 */

type SessionMetaRow = {
  sid?: string | null
  aal?: string | null
  mfaAt?: string | null
  stepUpAt?: string | null
  ip?: string | null
  userAgent?: string | null
}

/** Resolve the authenticated user AND the current session id (sid) from a request. */
export async function getAuthWithSid(
  payload: Payload,
  req: Request,
): Promise<{ user: User; sid?: string } | null> {
  try {
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return null
    return { user: user as User, sid: (user as { _sid?: string })._sid }
  } catch {
    return null
  }
}

/** Mark the current session AAL2 (and optionally a fresh step-up). Read-modify-write the full array. */
export async function elevateSession(
  payload: Payload,
  userId: string | number,
  sid: string | undefined,
  opts: { ip?: string; userAgent?: string; stepUp?: boolean; now?: Date } = {},
): Promise<void> {
  if (!sid) return
  const nowIso = (opts.now ?? new Date()).toISOString()
  const u = (await payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true })) as
    | (User & { sessionMeta?: SessionMetaRow[] })
    | null
  const list: SessionMetaRow[] = Array.isArray(u?.sessionMeta) ? [...u!.sessionMeta!] : []
  const idx = list.findIndex((r) => r?.sid === sid)
  const base: SessionMetaRow = idx >= 0 ? list[idx]! : { sid }
  const row: SessionMetaRow = {
    ...base,
    sid,
    aal: 'aal2',
    mfaAt: nowIso,
    ip: opts.ip ?? base.ip ?? null,
    userAgent: opts.userAgent ?? base.userAgent ?? null,
  }
  if (opts.stepUp) row.stepUpAt = nowIso
  if (idx >= 0) list[idx] = row
  else list.push(row)
  await payload.update({ collection: 'users', id: userId, data: { sessionMeta: list } as never, overrideAccess: true })
}

/** Flip the user to enrolled and record the method (merged by enforceMfaRequired). */
export async function markEnrolled(
  payload: Payload,
  userId: string | number,
  method: 'totp' | 'passkey',
): Promise<void> {
  const u = (await payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true })) as
    | (User & { mfa?: { methods?: string[] | null } })
    | null
  const methods = Array.from(new Set([...(u?.mfa?.methods ?? []), method]))
  await payload.update({
    collection: 'users',
    id: userId,
    overrideAccess: true,
    data: { mfa: { enrolled: true, methods, enrolledAt: new Date().toISOString() } } as never,
  })
}

/** Store a single-use WebAuthn ceremony challenge (5 min TTL). */
export async function storeWebauthnChallenge(
  payload: Payload,
  userId: string | number,
  value: string,
  type: 'registration' | 'authentication',
): Promise<void> {
  await payload.create({
    collection: 'webauthn-challenges',
    overrideAccess: true,
    data: { user: userId, value, type, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), createdAt: new Date().toISOString() } as never,
  })
}

/** Consume (return + delete) the most recent unexpired challenge for a user+type. */
export async function consumeWebauthnChallenge(
  payload: Payload,
  userId: string | number,
  type: 'registration' | 'authentication',
): Promise<string | null> {
  const res = await payload.find({
    collection: 'webauthn-challenges',
    where: { and: [{ user: { equals: userId } }, { type: { equals: type } }, { expiresAt: { greater_than: new Date().toISOString() } }] },
    sort: '-createdAt',
    limit: 1,
    overrideAccess: true,
  })
  const doc = res.docs[0] as { id: string | number; value: string } | undefined
  if (!doc) return null
  await payload.delete({ collection: 'webauthn-challenges', id: doc.id, overrideAccess: true }).catch(() => {})
  return doc.value
}

/** Append a security event to the append-only AuditLog. Never throws. */
export async function writeAudit(
  payload: Payload,
  e: {
    actor?: string | number | null
    actorEmail?: string | null
    action: string
    entity: string
    entityId: string | number
    after?: unknown
    reason?: string
  },
): Promise<void> {
  try {
    await payload.create({
      collection: 'audit-log',
      overrideAccess: true,
      data: {
        actor: e.actor ?? null,
        actorEmail: e.actorEmail ?? undefined,
        action: e.action,
        entity: e.entity,
        entityId: String(e.entityId),
        after: e.after,
        reason: e.reason,
        at: new Date().toISOString(),
      } as never,
    })
  } catch (err) {
    payload.logger.error(`Audit write failed (${e.action}): ${String(err)}`)
  }
}
