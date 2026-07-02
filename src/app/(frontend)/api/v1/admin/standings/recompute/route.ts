import { NextResponse } from 'next/server'

import { isAnyAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { recomputeDivision } from '@/lib/standings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/*
 * POST /api/v1/admin/standings/recompute - admin only. Forces a standings recompute
 * so an admin does not have to wait for the nightly cron after a manual data fix.
 * Body: { divisionId?: number|string }. With a divisionId, recomputes just that
 * division; without one, recomputes every division (time-bounded). recomputeDivision
 * is idempotent and only writes when the inputs hash drifts.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!isAnyAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { divisionId?: number | string } = {}
  try {
    body = (await req.json()) as { divisionId?: number | string }
  } catch {
    /* empty body means recompute all */
  }

  try {
    if (body.divisionId != null) {
      await recomputeDivision(payload, body.divisionId)
      return NextResponse.json({ ok: true, recomputed: 1, divisionId: body.divisionId })
    }

    const deadline = Date.now() + 270_000
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
        payload.logger.error(`[api] standings recompute division ${d.id} failed: ${String(err)}`)
      }
    }
    return NextResponse.json({ ok: true, recomputed, totalDivisions: divisions.docs.length, complete })
  } catch (err) {
    payload.logger.error(`[api] standings recompute failed: ${String(err)}`)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
