import { NextResponse } from 'next/server'

import { numericId } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const rel = (r: unknown, k = 'name') => (r && typeof r === 'object' ? (r as Record<string, string>)[k] ?? '' : '')

/*
 * GET /api/v1/brackets/:divisionId - the published bracket for a division as a tree
 * of series with seeds, teams, and winners. Public.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ divisionId: string }> }) {
  const { divisionId } = await params
  const id = numericId(divisionId)
  if (id == null) return NextResponse.json({ error: 'Invalid division id.' }, { status: 400 })

  const payload = await getPayloadClient()
  const brackets = await payload.find({ collection: 'playoff-brackets', where: { and: [{ division: { equals: id } }, { publishState: { equals: 'published' } }] }, sort: ['-seededAt'], limit: 1, overrideAccess: true })
  const bracket = brackets.docs[0] as { id?: number | string; name?: string; format?: string } | undefined
  if (!bracket) return NextResponse.json({ error: 'No bracket found' }, { status: 404 })

  const series = await payload.find({ collection: 'bracket-series', where: { bracket: { equals: bracket.id } }, sort: ['round', 'slot'], depth: 1, limit: 200, overrideAccess: true })
  const data = (series.docs as unknown as Array<Record<string, unknown>>).map((s) => ({
    id: s.id,
    round: s.round,
    slot: s.slot,
    homeSeed: s.homeSeed,
    awaySeed: s.awaySeed,
    homeTeam: rel(s.homeTeam),
    awayTeam: rel(s.awayTeam),
    winner: rel(s.winner),
  }))
  return NextResponse.json({ bracket: { id: bracket.id, name: bracket.name, format: bracket.format }, series: data })
}
