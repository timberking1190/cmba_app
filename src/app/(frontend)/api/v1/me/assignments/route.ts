import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const fmt = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Edmonton' })
const rel = (r: unknown, ...f: string[]) => (r && typeof r === 'object' ? f.map((k) => (r as Record<string, string>)[k]).find(Boolean) ?? '' : '')

/*
 * GET /api/v1/me/assignments - an official's OWN game assignments only (scoped by
 * the denormalized officialUserId on GameOfficials).
 */
export async function GET(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const res = await payload.find({ collection: 'game-officials', where: { officialUserId: { equals: user.id } }, depth: 2, limit: 200, overrideAccess: false, user })
  const data = res.docs.map((a) => {
    const ga = a as unknown as Record<string, unknown>
    const g = ga.game as Record<string, unknown> | undefined
    return {
      id: ga.id,
      role: ga.role,
      status: ga.status,
      game: g ? { id: g.id, date: g.startAt ? fmt.format(new Date(g.startAt as string)) : 'TBD', homeTeam: rel(g.homeTeam, 'name'), awayTeam: rel(g.awayTeam, 'name'), venue: rel(g.venue, 'name') } : null,
    }
  })
  return NextResponse.json({ data })
}
