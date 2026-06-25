import { NextResponse } from 'next/server'

import type { Where } from 'payload'

import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const fmtDate = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Edmonton' })
const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Edmonton' })
const rel = (r: unknown, ...f: string[]) => (r && typeof r === 'object' ? f.map((k) => (r as Record<string, string>)[k]).find(Boolean) ?? '' : '')

/*
 * GET /api/v1/games - cursor-paginated games for the apps. Anonymous callers get
 * published games; a signed-in verified rep also sees their own team drafts (the
 * Games.read access scopes it). Filters: division, status. Cursor: ?after=<id>.
 */
export async function GET(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 100)
  const after = url.searchParams.get('after')
  const division = url.searchParams.get('division')
  const status = url.searchParams.get('status')

  const and: Where[] = [{ isBye: { not_equals: true } }]
  if (division) and.push({ division: { equals: division } })
  if (status) and.push({ status: { equals: status } })
  if (after) and.push({ id: { greater_than: after } })

  const res = await payload.find({
    collection: 'games',
    where: { and },
    sort: ['startAt', 'id'],
    depth: 1,
    limit,
    overrideAccess: false,
    user: user ?? undefined,
  })

  const data = res.docs.map((g) => {
    const d = g as unknown as Record<string, unknown>
    const start = d.startAt ? new Date(d.startAt as string) : null
    return {
      id: d.id,
      startAt: d.startAt,
      date: start ? fmtDate.format(start) : '',
      time: start ? fmtTime.format(start) : '',
      division: rel(d.division, 'displayLabel', 'fullPath'),
      homeTeam: rel(d.homeTeam, 'name'),
      awayTeam: rel(d.awayTeam, 'name'),
      venue: rel(d.venue, 'name'),
      status: d.status,
      homeScore: d.homeScore ?? null,
      awayScore: d.awayScore ?? null,
    }
  })
  const nextCursor = res.docs.length === limit ? String(res.docs[res.docs.length - 1].id) : null
  return NextResponse.json({ data, nextCursor })
}
