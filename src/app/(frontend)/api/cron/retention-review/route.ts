import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkCronAuth } from '@/lib/cron'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/*
 * Weekly retention-review cron. Conservatively FLAGS (does not delete) accounts
 * that have been inactive beyond the retention window so the Privacy Officer can
 * review them for erasure. Deletion stays a deliberate admin action (with a
 * legal-hold check) — see the erasure route. Protected by CRON_SECRET.
 */
const RETENTION_INACTIVE_MONTHS = 24

export async function GET(req: Request) {
  const denied = checkCronAuth(req)
  if (denied) return denied

  const payload = await getPayloadClient()
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - RETENTION_INACTIVE_MONTHS)

  const res = await payload.find({
    collection: 'users',
    where: {
      and: [{ status: { equals: 'inactive' } }, { updatedAt: { less_than: cutoff.toISOString() } }],
    },
    depth: 0,
    limit: 500,
    overrideAccess: true,
  })

  const flagged = res.docs.map((u) => u.id)
  const summary = {
    retentionInactiveMonths: RETENTION_INACTIVE_MONTHS,
    flaggedForReview: flagged.length,
    userIds: flagged,
    ranAt: new Date().toISOString(),
  }
  payload.logger.info(`[cron] retention-review flagged ${flagged.length} inactive accounts for review`)
  return NextResponse.json(summary)
}
