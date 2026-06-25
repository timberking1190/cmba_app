import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkCronAuth } from '@/lib/cron'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/*
 * Daily TTL sweep of the idempotency-key store and the rate-limit hit log. Both are
 * short-lived dedupe/limiter state; rows older than 24 hours are removed.
 */
export async function GET(req: Request) {
  const denied = checkCronAuth(req)
  if (denied) return denied
  const payload = await getPayloadClient()
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString()

  let idemRemoved = 0
  let hitsRemoved = 0
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

  const summary = { idemRemoved, hitsRemoved, ranAt: new Date().toISOString() }
  payload.logger.info(`[cron] ttl-sweep ${JSON.stringify(summary)}`)
  return NextResponse.json(summary)
}
