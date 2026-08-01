import { NextResponse } from 'next/server'

import { canManageScheduling } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { buildPreview } from '@/lib/csvImport/commit'
import { detectKind, parseCsv, type ImportKind } from '@/lib/csvImport/parse'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/*
 * POST /api/v1/import/validate - admin dry run. Parses and validates the CSV and
 * runs the conflict check. Writes NOTHING. Body: { csv, kind?, seasonId? }.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!canManageScheduling(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { csv?: string; kind?: string; seasonId?: string | number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!body.csv || typeof body.csv !== 'string') return NextResponse.json({ error: 'A csv string is required.' }, { status: 400 })

  const rl = await checkRateLimit(payload, { bucket: 'import', subject: String(user.id), limit: 30, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })

  const parsed = parseCsv(body.csv)
  const kind = (body.kind as ImportKind) || detectKind(parsed.header)
  if (!kind) return NextResponse.json({ error: 'Could not detect the file type from the header. Use one of the templates.' }, { status: 400 })

  const preview = await buildPreview(payload, kind, parsed.rows, body.seasonId)
  return NextResponse.json({ ok: true, kind, ...preview })
}
