import { NextResponse } from 'next/server'

import { getCurrentUser, getPayloadClient } from '@/lib/auth'
import { isSuperAdmin } from '@/access/index'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * Admin erasure workflow (PIPEDA right to erasure). Super-admin only. Refuses if
 * the account is under a legal/safety hold. Removes the user's certifications,
 * private certificate files (DB + Supabase Storage, via the storage plugin's
 * delete), and consent records, then the user. Returns a summary.
 */
export async function POST(req: Request) {
  const actor = await getCurrentUser()
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { userId?: number | string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const userId = body.userId
  if (userId == null) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const payload = await getPayloadClient()

  const user = await payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.legalHold) {
    return NextResponse.json({ error: 'Account is under a legal hold and cannot be erased.' }, { status: 409 })
  }

  // Certifications + their private files first (file delete cascades to Storage).
  const certs = await payload.find({ collection: 'certifications', where: { user: { equals: userId } }, depth: 0, limit: 1000, overrideAccess: true })
  for (const c of certs.docs) {
    await payload.delete({ collection: 'certifications', id: c.id, overrideAccess: true })
  }
  const files = await payload.find({ collection: 'certificate-files', where: { owner: { equals: userId } }, depth: 0, limit: 1000, overrideAccess: true })
  for (const f of files.docs) {
    await payload.delete({ collection: 'certificate-files', id: f.id, overrideAccess: true })
  }
  const consents = await payload.find({ collection: 'consent-records', where: { user: { equals: userId } }, depth: 0, limit: 1000, overrideAccess: true })
  for (const cr of consents.docs) {
    await payload.delete({ collection: 'consent-records', id: cr.id, overrideAccess: true })
  }
  // Private scoresheet and incident photos owned by this user (delete cascades to Storage).
  const scoresheets = await payload.find({ collection: 'scoresheet-files', where: { owner: { equals: userId } }, depth: 0, limit: 1000, overrideAccess: true })
  for (const f of scoresheets.docs) {
    await payload.delete({ collection: 'scoresheet-files', id: f.id, overrideAccess: true })
  }
  const incidentFiles = await payload.find({ collection: 'incident-files', where: { owner: { equals: userId } }, depth: 0, limit: 1000, overrideAccess: true })
  for (const f of incidentFiles.docs) {
    await payload.delete({ collection: 'incident-files', id: f.id, overrideAccess: true })
  }
  await payload.delete({ collection: 'users', id: userId, overrideAccess: true })

  const summary = {
    erasedUser: userId,
    certificationsDeleted: certs.docs.length,
    certificateFilesDeleted: files.docs.length,
    consentRecordsDeleted: consents.docs.length,
    scoresheetFilesDeleted: scoresheets.docs.length,
    incidentFilesDeleted: incidentFiles.docs.length,
  }
  payload.logger.info(`[erasure] super-admin ${actor.id} erased user ${userId}: ${JSON.stringify(summary)}`)
  return NextResponse.json({ ok: true, ...summary })
}
