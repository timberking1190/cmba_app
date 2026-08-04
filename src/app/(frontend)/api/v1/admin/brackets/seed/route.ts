import { NextResponse } from 'next/server'

import { canManageScheduling } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { seedBracket } from '@/lib/brackets/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/*
 * POST /api/v1/admin/brackets/seed - seed a single-elimination bracket for a
 * division from its computed standings. Admin only. Body: { divisionId, name?,
 * publish? }.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!canManageScheduling(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { divisionId?: string | number; name?: string; publish?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (body.divisionId == null) return NextResponse.json({ error: 'A divisionId is required.' }, { status: 400 })

  const result = await seedBracket(payload, { divisionId: body.divisionId, name: body.name || 'Playoffs', publish: Boolean(body.publish) })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  await payload.create({ collection: 'audit-log', overrideAccess: true, data: { actor: user.id, action: 'bracket.seed', entity: 'playoff-brackets', entityId: String(result.bracketId), at: new Date().toISOString() } as never }).catch(() => {})
  return NextResponse.json({ ok: true, bracketId: result.bracketId })
}
