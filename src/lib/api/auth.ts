import { createHash, randomBytes, randomUUID } from 'crypto'

import { SignJWT } from 'jose'
import type { Payload } from 'payload'

import type { User } from '@/payload-types'

/*
 * Token auth for the native app plus a net-new refresh-token flow. The login
 * access JWT is short lived (2h) and Payload issues it from POST /api/users/login.
 * Native clients additionally hold a refresh token (stored HASHED) that is rotated
 * on every use. Presenting an already-rotated or revoked token is treated as a
 * reuse attack and revokes the WHOLE family. The rotation decision is a pure
 * function so it is unit-testable without a database.
 *
 * Web keeps using the secure httpOnly cookie. Native MUST send the access token as
 * `Authorization: JWT <token>` (cookies are CSRF-rejected for headless callers).
 */

export const REFRESH_TTL_DAYS = 60

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export type RefreshRecord = {
  id?: string | number
  user?: string | number | { id: string | number } | null
  family?: string | null
  revoked?: boolean | null
  replacedBy?: string | null
  expiresAt?: string | null
}

export type RefreshDecision = 'rotate' | 'reuse-detected' | 'expired' | 'invalid'

export function decideRefresh(record: RefreshRecord | null | undefined, now: Date = new Date()): RefreshDecision {
  if (!record) return 'invalid'
  // A revoked token, or one that has already been rotated (replacedBy set),
  // presented again means the token was captured and replayed: reuse attack.
  if (record.revoked) return 'reuse-detected'
  if (record.replacedBy) return 'reuse-detected'
  if (record.expiresAt && new Date(record.expiresAt).getTime() < now.getTime()) return 'expired'
  return 'rotate'
}

/*
 * Mint a Payload-compatible access JWT for a user. Matches Payload's own signing:
 * HS256 over the raw secret, claims { id, collection, email, sid }. Payload uses
 * sessions, so the token carries the session id (sid) the auth strategy validates
 * against the user's sessions.
 */
export async function mintAccessToken(
  user: { id: string | number; email?: string | null },
  secret: string,
  ttlSeconds = 2 * 60 * 60,
  sid?: string,
): Promise<{ token: string; exp: number }> {
  const secretKey = new TextEncoder().encode(secret)
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + ttlSeconds
  const claims: Record<string, unknown> = { id: user.id, collection: 'users', email: user.email ?? undefined }
  if (sid) claims.sid = sid
  const token = await new SignJWT(claims).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt(iat).setExpirationTime(exp).sign(secretKey)
  return { token, exp }
}

/*
 * Issue a fresh access token for a user by creating a server session and minting a
 * token bound to it (so it passes Payload's session check). Used by the refresh
 * route to hand a native client a new access token without a password.
 */
export async function issueAccessTokenForUser(
  payload: Payload,
  userId: string | number,
  ttlSeconds = 2 * 60 * 60,
): Promise<{ token: string; exp: number; user: User } | null> {
  const user = (await payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true }).catch(() => null)) as
    | (User & { sessions?: Array<{ id: string; createdAt: string; expiresAt: string }> })
    | null
  if (!user) return null
  const sid = randomUUID()
  const now = new Date()
  const session = { id: sid, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString() }
  const sessions = [...(user.sessions ?? []), session]
  await payload.update({ collection: 'users', id: userId, data: { sessions } as never, overrideAccess: true })
  const { token, exp } = await mintAccessToken({ id: user.id, email: user.email }, payload.secret, ttlSeconds, sid)
  return { token, exp, user }
}

/* Resolve the signed-in user from an Authorization: JWT <token> header (or cookie). */
export async function authenticateRequest(payload: Payload, req: Request): Promise<User | null> {
  try {
    const { user } = await payload.auth({ headers: req.headers })
    return (user as User | null) ?? null
  } catch {
    return null
  }
}

function refreshUserId(record: RefreshRecord): number | undefined {
  const u = record.user
  if (u == null) return undefined
  return Number(typeof u === 'object' ? u.id : u)
}

/* Issue a fresh refresh token in a new family (called at login). Returns the plaintext. */
export async function issueRefreshToken(payload: Payload, userId: number): Promise<string> {
  const token = generateToken()
  const family = generateToken()
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400000).toISOString()
  await payload.create({
    collection: 'refresh-tokens',
    overrideAccess: true,
    data: { tokenHash: hashToken(token), user: userId, family, expiresAt, revoked: false, createdAt: new Date().toISOString() },
  })
  return token
}

export async function revokeFamily(payload: Payload, family: string): Promise<void> {
  await payload.update({
    collection: 'refresh-tokens',
    where: { family: { equals: family } },
    data: { revoked: true },
    overrideAccess: true,
  })
}

/*
 * Rotate a presented refresh token. On success returns a new plaintext token and
 * the user id. On reuse detection revokes the whole family and returns null. On
 * expired or invalid returns null.
 */
export async function rotateRefresh(
  payload: Payload,
  presentedToken: string,
): Promise<{ token: string; userId: number } | null> {
  const tokenHash = hashToken(presentedToken)
  const res = await payload.find({ collection: 'refresh-tokens', where: { tokenHash: { equals: tokenHash } }, limit: 1, overrideAccess: true })
  const record = (res.docs[0] as RefreshRecord) ?? null
  const decision = decideRefresh(record)

  if (decision === 'reuse-detected') {
    if (record?.family) await revokeFamily(payload, record.family)
    return null
  }
  if (decision !== 'rotate' || !record) return null

  const userId = refreshUserId(record)
  if (userId == null) return null

  const newToken = generateToken()
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400000).toISOString()
  // Mark the old token rotated, then mint the replacement in the same family.
  await payload.update({ collection: 'refresh-tokens', id: record.id as number, data: { replacedBy: hashToken(newToken) }, overrideAccess: true })
  await payload.create({
    collection: 'refresh-tokens',
    overrideAccess: true,
    data: { tokenHash: hashToken(newToken), user: userId, family: record.family as string, expiresAt, revoked: false, createdAt: new Date().toISOString() },
  })
  return { token: newToken, userId }
}

/* Revoke the family a token belongs to (logout). Idempotent. */
export async function logoutRefresh(payload: Payload, presentedToken: string): Promise<void> {
  const res = await payload.find({ collection: 'refresh-tokens', where: { tokenHash: { equals: hashToken(presentedToken) } }, limit: 1, overrideAccess: true })
  const record = (res.docs[0] as RefreshRecord) ?? null
  if (record?.family) await revokeFamily(payload, record.family)
}
