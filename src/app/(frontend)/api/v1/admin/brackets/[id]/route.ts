import { NextResponse } from 'next/server'

import { isAnyAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { deleteBracket, loadBracketView, publishBracket, regenerateBracket, resolveByes, seedsFromStandings, unpublishBracket } from '@/lib/brackets/manage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/admin/brackets/:id - act on one bracket.
 * Body: { action: 'publish' | 'unpublish' | 'regenerate' | 'delete' | 'resolve-byes', reason, seedTeamIds? }
 *
 * The destructive actions (regenerate, delete) are refused while the bracket is
 * published, and say what to do instead rather than just failing.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bracketId = numericId(id)
  if (bracketId == null) return NextResponse.json({ error: 'That bracket could not be found.' }, { status: 400 })

  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'You are signed out. Sign in again to manage brackets.' }, { status: 401 })
  if (!isAnyAdmin(user)) return NextResponse.json({ error: 'Your account cannot manage brackets. Ask a league administrator for scheduling access.' }, { status: 403 })

  let body: { action?: string; reason?: string; seedTeamIds?: Array<string | number> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'That request could not be read. Please try again.' }, { status: 400 })
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!reason) return NextResponse.json({ error: 'A reason is required so the change is recorded in the audit log. Say briefly why you are making it.' }, { status: 400 })

  const actor = { id: user.id, email: user.email }

  switch (body.action) {
    case 'publish': {
      const res = await publishBracket(payload, actor, { bracketId, reason })
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
      return NextResponse.json({ ok: true, gamesCreated: res.gamesCreated, bracket: await loadBracketView(payload, bracketId) })
    }
    case 'unpublish': {
      const res = await unpublishBracket(payload, actor, { bracketId, reason })
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
      return NextResponse.json({ ok: true, bracket: await loadBracketView(payload, bracketId) })
    }
    case 'regenerate': {
      const bracket = await loadBracketView(payload, bracketId)
      const seeds = Array.isArray(body.seedTeamIds) && body.seedTeamIds.length
        ? body.seedTeamIds
        : bracket?.divisionId != null
          ? await seedsFromStandings(payload, bracket.divisionId)
          : []
      const res = await regenerateBracket(payload, actor, { bracketId, seedTeamIds: seeds, reason })
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
      return NextResponse.json({ ok: true, bracket: await loadBracketView(payload, bracketId) })
    }
    case 'resolve-byes': {
      const resolved = await resolveByes(payload, bracketId)
      return NextResponse.json({ ok: true, resolved, bracket: await loadBracketView(payload, bracketId) })
    }
    case 'delete': {
      const res = await deleteBracket(payload, actor, { bracketId, reason })
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
      return NextResponse.json({ ok: true, deleted: true })
    }
    default:
      return NextResponse.json({ error: 'That action is not one this screen can do.' }, { status: 400 })
  }
}
