import { NextResponse } from 'next/server'

import { canManageScheduling } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { applyOfficialChanges } from '@/lib/officials/assignService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/admin/games/:id/officials - assign or remove officials on one game.
 *
 * Every outcome comes back with the official's NAME and a specific reason. The
 * previous version collapsed every failure into "Could not assign." and printed
 * the official's database id, which is what the lead scheduler saw as
 * "Blocked official 7: Could not assign."
 *
 * Body: { assignments: [{ officialId, role }], remove?: [officialId], force?, dryRun? }
 *  - blocked outcomes did NOT happen; warnings DID happen and are worth knowing.
 *  - dryRun reports what would happen and writes nothing.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gameId = numericId(id)
  if (gameId == null) return NextResponse.json({ error: 'That game could not be found. Go back to the board and open it again.' }, { status: 400 })

  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'You are signed out. Sign in again to assign officials.' }, { status: 401 })
  if (!canManageScheduling(user)) {
    return NextResponse.json({ error: 'Your account cannot assign officials. Ask a league administrator for scheduling access.' }, { status: 403 })
  }

  let body: Parameters<typeof applyOfficialChanges>[3]
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'That request could not be read. Please try again.' }, { status: 400 })
  }
  if (!body?.assignments?.length && !body?.remove?.length) {
    return NextResponse.json({ error: 'Choose at least one official to add or remove first.' }, { status: 400 })
  }

  const result = await applyOfficialChanges(payload, user as never, gameId, body)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 })
  return NextResponse.json({ ok: true, dryRun: Boolean(body.dryRun), ...result })
}
