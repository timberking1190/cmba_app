import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkCronAuth } from '@/lib/cron'
import { emailWeeklyDigest } from '@/lib/emailEvents'
import { notifyUser } from '@/lib/notify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const ledgerEnabled = () => process.env.FEATURE_GAMIFICATION_LEDGER === 'true'

const relId = (r: unknown): number | string | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: number | string }).id : (r as number | string)

/*
 * Weekly, per-account: email a PII-free digest to each member who had new activity
 * in the last 7 days (a new badge award or an approved recognition). Honors
 * notificationPrefs.weeklyDigest and dedupes by lowercased email (a member never
 * gets two copies). Stateless like the other reminder crons (the weekly schedule
 * is the dedupe window). Skips unless FEATURE_GAMIFICATION_LEDGER is on. Protected
 * by CRON_SECRET. Note: until SES is provisioned, sends log via jsonTransport
 * rather than deliver - that is expected, not a defect.
 */
export async function GET(req: Request) {
  const denied = checkCronAuth(req)
  if (denied) return denied
  if (!ledgerEnabled()) return NextResponse.json({ skipped: 'FEATURE_GAMIFICATION_LEDGER is off' })

  const payload = await getPayloadClient()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Collect user ids with new activity this week.
  const userIds = new Set<string>()
  const ids = new Map<string, number | string>()
  const add = (raw: unknown) => {
    const id = relId(raw)
    if (id == null) return
    userIds.add(String(id))
    ids.set(String(id), id)
  }

  const awards = await payload.find({ collection: 'badge-awards', where: { awardedAt: { greater_than_equal: weekAgo } }, depth: 0, limit: 1000, overrideAccess: true })
  for (const a of awards.docs) add((a as { user?: unknown }).user)

  const recs = await payload.find({ collection: 'recognitions', where: { and: [{ moderationStatus: { equals: 'approved' } }, { moderatedAt: { greater_than_equal: weekAgo } }] }, depth: 0, limit: 1000, overrideAccess: true })
  for (const r of recs.docs) add((r as { subject?: unknown }).subject)

  let candidates = 0
  let sent = 0
  const s: Set<string> = new Set() // dedupe by lowercased email

  for (const key of userIds) {
    candidates++
    const id = ids.get(key)!
    const user = await payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: true }).catch(() => null)
    const email = (user as { email?: string } | null)?.email
    if (!email) continue
    const lower = email.toLowerCase()
    if (s.has(lower)) continue
    s.add(lower)
    const ok = await notifyUser(payload, user as never, {
      prefKey: 'weeklyDigest',
      send: (to) => emailWeeklyDigest(payload, { toEmail: to }),
    })
    if (ok) sent++
  }

  const summary = { candidates, sent, ranAt: now.toISOString() }
  payload.logger.info(`[cron] weekly-digest ${JSON.stringify(summary)}`)
  return NextResponse.json(summary)
}
