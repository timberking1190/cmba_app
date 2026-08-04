import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { siteSearch } from '@/lib/search/site'

type FindLike = Parameters<typeof siteSearch>[0]

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * GET /api/v1/search?q=... - public site search across rules, CMS pages, and schedule
 * entities. PII-free (never searches members or private data). Used by the /search
 * page and available to the native apps.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  try {
    const payload = await getPayloadClient()
    const data = await siteSearch(payload as unknown as FindLike, q)
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=60' } })
  } catch (err) {
    const payload = await getPayloadClient().catch(() => null)
    payload?.logger.error(`[api] search failed: ${String(err)}`)
    return NextResponse.json({ query: q.slice(0, 100), count: 0, results: [] })
  }
}
