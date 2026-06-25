import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkCronAuth } from '@/lib/cron'
import { recomputeDivision } from '@/lib/standings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/*
 * Nightly standings safety recompute. recomputeDivision is idempotent and only
 * writes the cache when the inputs hash drifts, so this self-heals a stale or
 * corrupted cache (it does not merely log). Bounded by a per-run time budget; if
 * truncated, complete=false and the next run continues.
 */
export async function GET(req: Request) {
  const denied = checkCronAuth(req)
  if (denied) return denied
  const payload = await getPayloadClient()
  const deadline = Date.now() + 270_000 // stay under maxDuration

  const divisions = await payload.find({ collection: 'divisions', limit: 1000, depth: 0, overrideAccess: true })
  let recomputed = 0
  let complete = true
  for (const d of divisions.docs) {
    if (Date.now() > deadline) {
      complete = false
      break
    }
    try {
      await recomputeDivision(payload, d.id)
      recomputed++
    } catch (err) {
      payload.logger.error(`[cron] standings-nightly division ${d.id} failed: ${String(err)}`)
    }
  }

  const summary = { recomputed, totalDivisions: divisions.docs.length, complete, ranAt: new Date().toISOString() }
  payload.logger.info(`[cron] standings-nightly ${JSON.stringify(summary)}`)
  return NextResponse.json(summary)
}
