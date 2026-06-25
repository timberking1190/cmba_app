import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/devices - register or refresh a device push token on the signed-in
 * user. Tokens are stored on the user and never exposed to anyone else. Push fan-out
 * itself ships in a later stage; this lets tokens register now.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: { token?: string; platform?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!body.token) return NextResponse.json({ error: 'A device token is required.' }, { status: 400 })
  const platform = ['ios', 'android', 'web'].includes(String(body.platform)) ? body.platform : 'web'

  const now = new Date().toISOString()
  const existing = ((user as { pushDevices?: Array<{ token?: string; platform?: string; registeredAt?: string }> }).pushDevices ?? []).filter((d) => d.token !== body.token)
  existing.push({ token: body.token, platform, registeredAt: now, lastSeenAt: now } as never)

  await payload.update({ collection: 'users', id: user.id, data: { pushDevices: existing } as never, overrideAccess: true })
  return NextResponse.json({ ok: true })
}
