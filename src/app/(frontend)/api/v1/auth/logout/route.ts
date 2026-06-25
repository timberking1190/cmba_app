import { NextResponse } from 'next/server'

import { logoutRefresh } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/auth/logout - revoke the refresh-token family. Idempotent.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  let body: { refreshToken?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  if (body.refreshToken) await logoutRefresh(payload, body.refreshToken)
  return NextResponse.json({ ok: true })
}
