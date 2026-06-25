import { NextResponse } from 'next/server'

import { issueAccessTokenForUser, rotateRefresh } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/auth/refresh - rotate a refresh token and mint a fresh access token.
 * Rotation revokes the presented token; presenting an already-used or revoked token
 * is treated as a reuse attack and revokes the whole family (401). The native SDK
 * calls this once on a 401 and replays the original request WITH the same
 * Idempotency-Key, so a mid-report token expiry never double counts.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  let body: { refreshToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!body.refreshToken) return NextResponse.json({ error: 'A refreshToken is required.' }, { status: 400 })

  const rotated = await rotateRefresh(payload, body.refreshToken)
  if (!rotated) return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 })

  const issued = await issueAccessTokenForUser(payload, rotated.userId)
  if (!issued) return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 })

  return NextResponse.json({ ok: true, accessToken: issued.token, exp: issued.exp, refreshToken: rotated.token, user: { id: issued.user.id, email: issued.user.email, roles: issued.user.roles } })
}
