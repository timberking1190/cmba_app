import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { getRepDashboard } from '@/lib/repDashboard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * GET /api/v1/me/dashboard - a verified rep's upcoming games, games awaiting their
 * report, and games awaiting their confirmation. The same shape powers the web /rep
 * page and the native dashboard.
 */
export async function GET(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const dashboard = await getRepDashboard(payload, user.id)
  return NextResponse.json(dashboard)
}
