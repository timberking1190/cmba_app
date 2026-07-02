import { NextResponse } from 'next/server'

import { AUTO_HIDE_REPORTS } from '@/collections/ArcadeScores'
import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp, hashIp } from '@/lib/security/botChallenge'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TEN_MINUTES = 10 * 60 * 1000

/*
 * POST /api/v1/arcade/report - flag a high-score entry for moderation. Public and
 * rate-limited per IP. Increments the entry's report count server-side (via
 * overrideAccess, since the public cannot update the collection) and auto-hides it
 * once enough reports arrive, pending an admin decision. No community signal is
 * perfect, so admins have the final say (hide or delete) in the panel. Existence is
 * never revealed: an unknown id returns ok so the endpoint can't be used to probe.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  try {
    const ip = getClientIp(req.headers)
    const rl = await checkRateLimit(payload, {
      bucket: 'arcade-report:ip',
      subject: hashIp(ip),
      limit: 20,
      windowMs: TEN_MINUTES,
    })
    if (!rl.ok) return NextResponse.json({ error: 'Too many reports. Please slow down.' }, { status: 429 })

    let body: { id?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const id = typeof body.id === 'number' ? body.id : Number(body.id)
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const existing = (await payload
      .findByID({ collection: 'arcade-scores', id, overrideAccess: true })
      .catch(() => null)) as { reports?: number; hidden?: boolean } | null
    if (!existing) return NextResponse.json({ ok: true })

    const reports = (typeof existing.reports === 'number' ? existing.reports : 0) + 1
    await payload.update({
      collection: 'arcade-scores',
      id,
      overrideAccess: true,
      data: { reports, hidden: Boolean(existing.hidden) || reports >= AUTO_HIDE_REPORTS },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    payload.logger.error(`[api] arcade report: ${String(err)}`)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
