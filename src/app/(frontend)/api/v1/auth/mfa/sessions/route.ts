import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { getAuthWithSid } from '@/lib/mfa/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * GET /api/v1/auth/mfa/sessions - the signed-in user's active sessions/devices,
 * combining Payload's session list (sid, timestamps) with sessionMeta (assurance,
 * ip, device). The current session is flagged. No secrets are returned.
 */
export async function GET(req: Request) {
  const payload = await getPayloadClient()
  const auth = await getAuthWithSid(payload, req)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { user, sid } = auth

  const full = (await payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true })) as
    | { sessions?: Array<{ id: string; createdAt: string; expiresAt: string }>; sessionMeta?: Array<{ sid?: string; aal?: string; ip?: string; userAgent?: string; mfaAt?: string }> }
    | null
  const meta = new Map((full?.sessionMeta ?? []).map((m) => [m.sid, m]))
  const sessions = (full?.sessions ?? []).map((s) => {
    const m = meta.get(s.id)
    return {
      current: s.id === sid,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      aal: m?.aal === 'aal2' ? 'aal2' : 'aal1',
      mfaAt: m?.mfaAt ?? null,
      ip: m?.ip ?? null,
      device: m?.userAgent ?? null,
      // Opaque handle for revoke (do not expose the raw sid beyond the owner).
      id: s.id,
    }
  })
  return NextResponse.json({ sessions })
}
