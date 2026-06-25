import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { getDivisionStandings, getLeagueStandings } from '@/lib/standings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * GET /api/v1/standings - public, reads the precomputed StandingsCache (never
 * triggers a recompute). Optional ?division=<id>. Returns rows (each with a
 * server-assigned rank), a legend, and the computed-at time.
 */
export async function GET(req: Request) {
  const payload = await getPayloadClient()
  const division = new URL(req.url).searchParams.get('division')

  const rows = division ? await getDivisionStandings(payload, division) : await getLeagueStandings(payload)
  const cache = await payload.find({ collection: 'standings-cache', limit: 1, depth: 0, overrideAccess: true, ...(division ? { where: { division: { equals: division } } } : {}) })
  const doc = cache.docs[0] as { legend?: string; computedAt?: string } | undefined

  return NextResponse.json({ data: rows, legend: doc?.legend ?? '', computedAt: doc?.computedAt ?? null })
}
