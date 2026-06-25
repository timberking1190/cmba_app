import { NextResponse } from 'next/server'

import type { Where } from 'payload'

import { getPayloadClient } from '@/lib/auth'
import { buildIcs, verifyIcsToken, type IcsGame } from '@/lib/ics/feed'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const rel = (r: unknown, k = 'name') => (r && typeof r === 'object' ? (r as Record<string, string>)[k] ?? '' : '')

/*
 * GET /api/v1/ics/:scope/:token.ics - a read-only calendar subscription. The token
 * is an unguessable HMAC capability that carries the resource id. Division and
 * league feeds are live; team feeds are gated behind FEATURE_TEAM_ICS (a youth
 * movement-pattern disclosure pending a decision). No personal data in the body.
 */
export async function GET(req: Request, { params }: { params: Promise<{ scope: string; token: string }> }) {
  const { scope, token } = await params
  const payload = await getPayloadClient()

  if (!['division', 'league', 'team'].includes(scope)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (scope === 'team' && process.env.FEATURE_TEAM_ICS !== 'true') {
    return NextResponse.json({ error: 'Team calendar feeds are not enabled.' }, { status: 403 })
  }

  const rl = await checkRateLimit(payload, { bucket: 'ics', subject: token.slice(0, 40), limit: 60, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const id = verifyIcsToken(scope, token, payload.secret)
  if (id == null) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const published: Where = { and: [{ publishState: { equals: 'published' } }, { isBye: { not_equals: true } }] }
  let where: Where = published
  let name = 'CMBA Schedule'
  if (scope === 'division') {
    where = { and: [{ division: { equals: id } }, ...(published.and as Where[])] }
    const division = await payload.findByID({ collection: 'divisions', id, depth: 0, overrideAccess: true }).catch(() => null)
    name = `CMBA ${rel(division, 'displayLabel') || rel(division, 'fullPath') || 'Division'}`
  } else if (scope === 'team') {
    where = { and: [{ or: [{ homeTeam: { equals: id } }, { awayTeam: { equals: id } }] }, ...(published.and as Where[])] }
    const team = await payload.findByID({ collection: 'teams', id, depth: 0, overrideAccess: true }).catch(() => null)
    name = `CMBA ${rel(team, 'name') || 'Team'}`
  }

  const res = await payload.find({ collection: 'games', where, sort: ['startAt', 'id'], depth: 1, limit: 2000, overrideAccess: true })
  const games: IcsGame[] = (res.docs as unknown as Array<Record<string, unknown>>).map((g) => ({
    id: g.id as number,
    startAt: g.startAt as string,
    endAt: g.endAt as string | undefined,
    homeTeam: rel(g.homeTeam),
    awayTeam: rel(g.awayTeam),
    venue: rel(g.venue),
    status: g.status as string,
  }))

  return new Response(buildIcs(games, { name }), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Content-Disposition': `inline; filename="cmba-${scope}.ics"` },
  })
}
