import { NextResponse } from 'next/server'

import { isAnyAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { mutationResponse } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { commitImport } from '@/lib/csvImport/commit'
import { detectKind, parseCsv, type ImportKind } from '@/lib/csvImport/parse'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

/*
 * POST /api/v1/import/commit - admin commit after the acknowledge gate. Re-validates
 * server side and re-enforces the gate, then commits the rows in one transaction.
 * Idempotency-Key required so a double tap returns the same batch.
 * Body: { csv, kind?, publishMode?, acknowledged?, seasonId? }.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!isAnyAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { csv?: string; kind?: string; publishMode?: string; acknowledged?: boolean; seasonId?: string | number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!body.csv || typeof body.csv !== 'string') return NextResponse.json({ error: 'A csv string is required.' }, { status: 400 })

  const parsed = parseCsv(body.csv)
  const kind = (body.kind as ImportKind) || detectKind(parsed.header)
  if (!kind) return NextResponse.json({ error: 'Could not detect the file type from the header.' }, { status: 400 })
  const publishMode = body.publishMode === 'published' ? 'published' : 'draft'

  return mutationResponse(payload, req, {
    scope: `import:${kind}`,
    userId: String(user.id),
    method: 'POST',
    path: '/api/v1/import/commit',
    logical: { kind, publishMode, rowCount: parsed.rows.length },
    run: async () => {
      const result = await commitImport(payload, { kind, rows: parsed.rows, publishMode, acknowledged: Boolean(body.acknowledged), actor: { id: user.id }, seasonId: body.seasonId })
      if (!result.ok) return { statusCode: 400, body: { error: result.error, batchId: result.batchId } }
      return { statusCode: 201, body: { ok: true, batchId: result.batchId, counts: result.counts } }
    },
  })
}
