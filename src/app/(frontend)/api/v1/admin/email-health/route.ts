import { NextResponse } from 'next/server'

import { isSuperAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { computeEmailHealth, type HealthPayload } from '@/lib/email/health'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * GET /api/v1/admin/email-health - super admin only. Returns delivery-health
 * rollups for transactional email (send/fail counts over 24h, 7d, 30d, recent
 * failures, whether SES is configured, and an alert flag) so auth email problems
 * do not go unnoticed. PII free.
 */
export async function GET(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!isSuperAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const health = await computeEmailHealth(payload as unknown as HealthPayload)
    return NextResponse.json(health, {
      status: health.alert ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    payload.logger.error(`[api] email-health failed: ${String(err)}`)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
