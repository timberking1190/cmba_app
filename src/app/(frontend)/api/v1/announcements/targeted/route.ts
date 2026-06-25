import { NextResponse } from 'next/server'

import type { Where } from 'payload'

import { isAnyAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { emailTargetedAnnouncement } from '@/lib/emailEvents'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/*
 * POST /api/v1/announcements/targeted - send a plain announcement to the verified
 * reps of a division or a team. One single-recipient email per recipient (families
 * are never exposed to each other), opted-out recipients (generalUpdates false) are
 * suppressed, and guardians are deduped by email. Admin only.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!isAnyAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { divisionId?: string | number; teamId?: string | number; subject?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const subject = (body.subject || '').trim()
  const message = (body.message || '').trim()
  if (!subject || !message) return NextResponse.json({ error: 'A subject and a message are required.' }, { status: 400 })
  if (body.divisionId == null && body.teamId == null) return NextResponse.json({ error: 'A divisionId or teamId is required.' }, { status: 400 })

  // Resolve the target teams.
  let teamIds: (string | number)[] = []
  if (body.teamId != null) teamIds = [body.teamId]
  else {
    const teams = await payload.find({ collection: 'teams', where: { division: { equals: body.divisionId } }, depth: 0, limit: 1000, overrideAccess: true })
    teamIds = teams.docs.map((t) => t.id)
  }
  if (!teamIds.length) return NextResponse.json({ error: 'No teams found for that target.' }, { status: 404 })

  const where: Where = { and: [{ team: { in: teamIds } }, { verified: { equals: true } }] }
  const memberships = await payload.find({ collection: 'team-memberships', where, depth: 1, limit: 2000, overrideAccess: true })

  const sent = new Set<string>()
  let count = 0
  for (const m of memberships.docs as Array<{ user?: { email?: string; notificationPrefs?: { generalUpdates?: boolean } } | unknown }>) {
    const u = m.user
    if (!u || typeof u !== 'object') continue
    const email = (u as { email?: string }).email
    if (!email || sent.has(email.toLowerCase())) continue
    if ((u as { notificationPrefs?: { generalUpdates?: boolean } }).notificationPrefs?.generalUpdates === false) continue
    sent.add(email.toLowerCase())
    await emailTargetedAnnouncement(payload, { toEmail: email, subject, message })
    count++
  }

  await payload.create({ collection: 'audit-log', overrideAccess: true, data: { actor: user.id, action: 'announcement.targeted', entity: 'teams', entityId: String(body.teamId ?? body.divisionId ?? ''), after: { recipients: count }, at: new Date().toISOString() } as never }).catch(() => {})
  return NextResponse.json({ ok: true, recipients: count })
}
