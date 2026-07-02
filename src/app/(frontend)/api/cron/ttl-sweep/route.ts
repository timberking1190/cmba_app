import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkCronAuth } from '@/lib/cron'
import { EMAIL_LOG_RETENTION_DAYS } from '@/collections/EmailSendLog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/*
 * Daily TTL sweep. The idempotency-key store and the rate-limit hit log are
 * short-lived dedupe/limiter state; rows older than 24 hours are removed. The
 * email health log is kept about 90 days (data minimization) then swept.
 */
export async function GET(req: Request) {
  const denied = checkCronAuth(req)
  if (denied) return denied
  const payload = await getPayloadClient()
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
  const emailCutoff = new Date(Date.now() - EMAIL_LOG_RETENTION_DAYS * 24 * 60 * 60_000).toISOString()

  let idemRemoved = 0
  let hitsRemoved = 0
  let emailLogsRemoved = 0
  try {
    const idem = await payload.delete({ collection: 'idempotency-keys', where: { createdAt: { less_than: cutoff } }, overrideAccess: true })
    idemRemoved = (idem as { docs?: unknown[] }).docs?.length ?? 0
  } catch (err) {
    payload.logger.error(`[cron] ttl-sweep idempotency failed: ${String(err)}`)
  }
  try {
    const hits = await payload.delete({ collection: 'rate-limit-hits', where: { at: { less_than: cutoff } }, overrideAccess: true })
    hitsRemoved = (hits as { docs?: unknown[] }).docs?.length ?? 0
  } catch (err) {
    payload.logger.error(`[cron] ttl-sweep rate-limit failed: ${String(err)}`)
  }
  try {
    const logs = await payload.delete({ collection: 'email-send-log', where: { sentAt: { less_than: emailCutoff } }, overrideAccess: true })
    emailLogsRemoved = (logs as { docs?: unknown[] }).docs?.length ?? 0
  } catch (err) {
    payload.logger.error(`[cron] ttl-sweep email-send-log failed: ${String(err)}`)
  }

  const summary = { idemRemoved, hitsRemoved, emailLogsRemoved, ranAt: new Date().toISOString() }
  payload.logger.info(`[cron] ttl-sweep ${JSON.stringify(summary)}`)
  return NextResponse.json(summary)
}
