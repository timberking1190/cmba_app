import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { getAuthWithSid, writeAudit } from '@/lib/mfa/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/auth/mfa/sessions/revoke { sid? , all? } - sign out a device, or all
 * other devices. Removing a sid from the user's sessions immediately invalidates
 * that token (Payload's JWT strategy rejects an unknown sid). The current session is
 * always kept so the caller is not signed out of the page they are using.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const auth = await getAuthWithSid(payload, req)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { user, sid: currentSid } = auth

  const rl = await checkRateLimit(payload, { bucket: 'mfa_session', subject: String(user.id), limit: 20, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please wait and try again.' }, { status: 429 })

  let body: { sid?: string; all?: boolean }
  try {
    body = (await req.json()) as { sid?: string; all?: boolean }
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const full = (await payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true })) as
    | { sessions?: Array<{ id: string; createdAt: string; expiresAt: string }>; sessionMeta?: Array<{ sid?: string }> }
    | null
  const sessions = full?.sessions ?? []

  let kept: typeof sessions
  if (body.all) {
    kept = sessions.filter((s) => s.id === currentSid) // sign out all others
  } else if (body.sid) {
    if (body.sid === currentSid) return NextResponse.json({ error: 'Use sign out for the current session.' }, { status: 400 })
    kept = sessions.filter((s) => s.id !== body.sid)
  } else {
    return NextResponse.json({ error: 'Specify a session to revoke.' }, { status: 400 })
  }

  const keptIds = new Set(kept.map((s) => s.id))
  const sessionMeta = (full?.sessionMeta ?? []).filter((m) => m.sid && keptIds.has(m.sid))
  await payload.update({ collection: 'users', id: user.id, overrideAccess: true, data: { sessions: kept, sessionMeta } as never })
  await writeAudit(payload, { actor: user.id, actorEmail: user.email, action: 'mfa.session.revoke', entity: 'users', entityId: user.id, after: { all: Boolean(body.all) } })

  return NextResponse.json({ ok: true, remaining: kept.length })
}
