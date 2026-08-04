import { NextResponse } from 'next/server'

import type { Payload } from 'payload'

import { getPayloadClient } from '@/lib/auth'
import { checkCronAuth } from '@/lib/cron'
import { emailReportRequest } from '@/lib/emailEvents'
import { CATEGORY_HEADER } from '@/lib/email/meta'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const relId = (r: unknown): string | number | undefined => (r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number))

/*
 * Daily reminder and escalation cron (no PII in any body; portal links only):
 *  - games played but not reported -> remind the teams' verified reps;
 *  - games reported but not confirmed -> remind the opposing rep;
 *  - contested games older than 3 days -> escalate to all super admins.
 * Reminder emails honor the gameReminders preference; escalations do not.
 */
async function remindTeam(payload: Payload, teamId: string | number, sentTo: Set<string>) {
  const reps = await payload.find({ collection: 'team-memberships', where: { and: [{ team: { equals: teamId } }, { verified: { equals: true } }] }, depth: 1, limit: 10, overrideAccess: true })
  for (const m of reps.docs as Array<{ user?: { email?: string; notificationPrefs?: { gameReminders?: boolean } } | unknown }>) {
    const u = m.user
    if (!u || typeof u !== 'object') continue
    const email = (u as { email?: string }).email
    if (!email || sentTo.has(email.toLowerCase())) continue
    if ((u as { notificationPrefs?: { gameReminders?: boolean } }).notificationPrefs?.gameReminders === false) continue
    sentTo.add(email.toLowerCase())
    await emailReportRequest(payload, { toEmail: email })
  }
}

export async function GET(req: Request) {
  const denied = checkCronAuth(req)
  if (denied) return denied
  const payload = await getPayloadClient()
  const now = Date.now()
  const sentTo = new Set<string>()
  let reportReminders = 0
  let confirmReminders = 0
  let escalations = 0

  // Played but not reported (in the last week).
  const toReport = await payload.find({ collection: 'games', where: { and: [{ status: { equals: 'scheduled' } }, { isBye: { not_equals: true } }, { startAt: { less_than: new Date(now).toISOString() } }, { startAt: { greater_than: new Date(now - 7 * 86400000).toISOString() } }] }, depth: 0, limit: 500, overrideAccess: true })
  for (const g of toReport.docs as unknown as Array<Record<string, unknown>>) {
    await remindTeam(payload, relId(g.homeTeam)!, sentTo)
    await remindTeam(payload, relId(g.awayTeam)!, sentTo)
    reportReminders++
  }

  // Reported but not confirmed for over a day: remind the team that did NOT report.
  const toConfirm = await payload.find({ collection: 'games', where: { and: [{ status: { equals: 'reported' } }, { startAt: { less_than: new Date(now - 86400000).toISOString() } }] }, depth: 0, limit: 500, overrideAccess: true })
  for (const g of toConfirm.docs as unknown as Array<Record<string, unknown>>) {
    const reports = await payload.find({ collection: 'score-reports', where: { game: { equals: g.id } }, depth: 0, limit: 2, overrideAccess: true })
    const reportedTeam = relId((reports.docs[0] as { submittedForTeam?: unknown })?.submittedForTeam)
    const opposing = String(reportedTeam) === String(relId(g.homeTeam)) ? relId(g.awayTeam) : relId(g.homeTeam)
    if (opposing != null) {
      await remindTeam(payload, opposing, sentTo)
      confirmReminders++
    }
  }

  // Contested older than 3 days: escalate to super admins.
  const stale = await payload.find({ collection: 'games', where: { and: [{ status: { equals: 'contested' } }, { updatedAt: { less_than: new Date(now - 3 * 86400000).toISOString() } }] }, depth: 0, limit: 200, overrideAccess: true })
  if (stale.docs.length) {
    const supers = await payload.find({ collection: 'users', where: { roles: { contains: 'super_admin' } }, depth: 0, limit: 50, overrideAccess: true })
    const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    for (const s of supers.docs as Array<{ email?: string }>) {
      if (!s.email) continue
      try {
        await payload.sendEmail({ to: s.email, subject: `${stale.docs.length} contested games need review`, text: `Some contested games have been waiting more than three days. Open the contested queue:\n${base}/manage/contested`, headers: { [CATEGORY_HEADER]: 'score_reminder' } })
        escalations++
      } catch (err) {
        payload.logger.error(`[cron] contested escalation failed: ${String(err)}`)
      }
    }
  }

  const summary = { reportReminders, confirmReminders, escalations, ranAt: new Date().toISOString() }
  payload.logger.info(`[cron] score-reminders ${JSON.stringify(summary)}`)
  return NextResponse.json(summary)
}
