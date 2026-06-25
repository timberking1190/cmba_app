import { NextResponse } from 'next/server'

import { issueRefreshToken } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/auth/login - email + password login for the native apps. Returns a
 * short-lived access token (sent as Authorization: JWT <token>) and a refresh token
 * the client stores in the device secure store.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!body.email || !body.password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })

  const rl = await checkRateLimit(payload, { bucket: 'login', subject: String(body.email).toLowerCase(), limit: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 })

  try {
    const result = await payload.login({ collection: 'users', data: { email: body.email, password: body.password } })
    if (!result.user) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    const refreshToken = await issueRefreshToken(payload, result.user.id)
    return NextResponse.json({ ok: true, accessToken: result.token, exp: result.exp, refreshToken, user: { id: result.user.id, email: result.user.email, roles: result.user.roles } })
  } catch {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }
}
