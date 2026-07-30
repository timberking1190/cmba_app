import { NextResponse } from 'next/server'

import { isAnyAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { createBracket, previewBracket, seedsFromStandings } from '@/lib/brackets/manage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/admin/brackets
 *
 * dryRun: true returns what the bracket WOULD look like and writes nothing, so a
 * first time scheduler sees the matchups, the seeds, and the byes before anything
 * exists. Without dryRun it creates the bracket, always as a draft.
 *
 * Body: { divisionId, name?, source: 'standings' | 'manual', seedTeamIds?, reason?, dryRun? }
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'You are signed out. Sign in again to manage brackets.' }, { status: 401 })
  if (!isAnyAdmin(user)) return NextResponse.json({ error: 'Your account cannot manage brackets. Ask a league administrator for scheduling access.' }, { status: 403 })

  let body: { divisionId?: string | number; name?: string; source?: string; seedTeamIds?: Array<string | number>; reason?: string; dryRun?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'That request could not be read. Please try again.' }, { status: 400 })
  }
  if (body.divisionId == null) return NextResponse.json({ error: 'Choose a division first.' }, { status: 400 })

  const source = body.source === 'manual' ? 'manual' : 'standings'
  const seedTeamIds =
    source === 'manual' && Array.isArray(body.seedTeamIds) ? body.seedTeamIds : await seedsFromStandings(payload, body.divisionId)

  if (body.dryRun) {
    const preview = await previewBracket(payload, seedTeamIds)
    return NextResponse.json({ ok: preview.ok, preview })
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!reason) return NextResponse.json({ error: 'A reason is required so the bracket is recorded in the audit log. Say briefly why you are creating it.' }, { status: 400 })

  const name = (body.name ?? '').trim() || 'Playoffs'
  const res = await createBracket(payload, { id: user.id, email: user.email }, { divisionId: body.divisionId, name, seedTeamIds, source, reason })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ ok: true, bracketId: res.bracketId })
}
