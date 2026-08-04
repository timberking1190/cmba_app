import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkCronAuth } from '@/lib/cron'
import { computeCertStatus } from '@/lib/certStatus'
import { reminderBucketFor } from '@/lib/reminders'
import { CATEGORY_HEADER } from '@/lib/email/meta'
import type { Certification } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/*
 * Daily cron: (1) refresh each certification's cached status from its expiry,
 * and (2) email the owner when a cert is 60/30/7 days from expiry or has just
 * lapsed. Emails carry NO PII — just a portal link (PIPEDA data minimization).
 * Protected by CRON_SECRET. Logged for audit.
 */
export async function GET(req: Request) {
  const denied = checkCronAuth(req)
  if (denied) return denied

  const payload = await getPayloadClient()
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const now = new Date()

  let scanned = 0
  let statusesUpdated = 0
  let remindersSent = 0

  const pageSize = 200
  let page = 1
  for (;;) {
    const res = await payload.find({
      collection: 'certifications',
      depth: 1, // populate user (email + prefs)
      limit: pageSize,
      page,
      overrideAccess: true,
    })
    for (const cert of res.docs as Certification[]) {
      scanned++

      // (1) refresh cached status
      const fresh = computeCertStatus({ verifiedAt: cert.verifiedAt, expiryDate: cert.expiryDate })
      if (fresh !== cert.status) {
        await payload.update({
          collection: 'certifications',
          id: cert.id,
          data: { status: fresh },
          overrideAccess: true,
          context: { skipConsentEnforcement: true },
        })
        statusesUpdated++
      }

      // (2) reminder email at thresholds
      const bucket = reminderBucketFor(cert.expiryDate, now)
      if (!bucket) continue
      const user = typeof cert.user === 'object' ? cert.user : null
      if (!user?.email) continue
      if (user.notificationPrefs && user.notificationPrefs.certificationReminders === false) continue

      const when = bucket === 'lapsed' ? 'has expired' : `expires in ${bucket} days`
      try {
        await payload.sendEmail({
          to: user.email,
          subject:
            bucket === 'lapsed'
              ? 'A CMBA Connect certification has expired'
              : 'A CMBA Connect certification is expiring soon',
          text:
            `One of your certifications ${when}.\n\n` +
            `Sign in to CMBA Connect to view the details and renew:\n${base}/account\n\n` +
            `(We keep personal details out of email. Please use the portal.)`,
          headers: { [CATEGORY_HEADER]: 'cert_reminder' },
        })
        remindersSent++
      } catch (err) {
        payload.logger.error(`Reminder email failed for user ${user.id}: ${String(err)}`)
      }
    }
    if (page >= res.totalPages) break
    page++
  }

  const summary = { scanned, statusesUpdated, remindersSent, ranAt: now.toISOString() }
  payload.logger.info(`[cron] certification-reminders ${JSON.stringify(summary)}`)
  return NextResponse.json(summary)
}
