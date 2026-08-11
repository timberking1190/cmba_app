import { NextResponse } from 'next/server'

import { canManageScheduling } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { undoImport } from '@/lib/csvImport/commit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/*
 * POST /api/v1/import/:batchId/undo - reverse a committed import within the undo
 * window (admin). 409 outside the window.
 */
export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params
  const id = numericId(batchId)
  if (id == null) return NextResponse.json({ error: 'Invalid batch id.' }, { status: 400 })

  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!canManageScheduling(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const result = await undoImport(payload, id, { id: user.id })
  if (!result.ok) {
    const status = result.error?.includes('window') ? 409 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ ok: true, removed: result.removed })
}
