import { searchRules } from '../rulesData'

/*
 * Site-wide search across public content: the rulebook (existing rules engine), CMS
 * pages, and schedule entities (teams, venues). Deliberately public and PII-free: it
 * never searches members, accounts, or private documents. Each source is guarded so
 * one failing does not take down the others.
 *
 * Copy rule: no em or en dashes anywhere.
 */

export type SearchResultType = 'rule' | 'page' | 'team' | 'venue'

export interface SearchResult {
  type: SearchResultType
  title: string
  url: string
  snippet?: string
  external?: string
}

export interface SiteSearchResponse {
  query: string
  count: number
  results: SearchResult[]
}

const PER_SOURCE = 6

type FindLike = {
  find: (args: { collection: string; where?: unknown; limit?: number; depth?: number; overrideAccess?: boolean }) => Promise<{ docs: Array<Record<string, unknown>> }>
}

export async function siteSearch(payload: FindLike, rawQuery: string): Promise<SiteSearchResponse> {
  const query = (rawQuery ?? '').trim().slice(0, 100)
  if (query.length < 2) return { query, count: 0, results: [] }

  const results: SearchResult[] = []

  // Rules (static engine, already ranked).
  try {
    for (const r of searchRules(query).slice(0, PER_SOURCE)) {
      results.push({ type: 'rule', title: r.document.title, url: '/rules', snippet: r.snippet || undefined, external: r.document.driveUrl })
    }
  } catch {
    /* ignore this source */
  }

  // CMS pages (title match on published pages only).
  try {
    const res = await payload.find({
      collection: 'pages',
      where: { and: [{ _status: { equals: 'published' } }, { title: { like: query } }] },
      limit: PER_SOURCE,
      depth: 0,
      overrideAccess: true,
    })
    for (const p of res.docs as Array<{ title?: string; slug?: string }>) {
      if (p.slug) results.push({ type: 'page', title: p.title || p.slug, url: `/${p.slug}` })
    }
  } catch {
    /* ignore */
  }

  // Teams and venues (schedule entities, public).
  try {
    const res = await payload.find({ collection: 'teams', where: { name: { like: query } }, limit: PER_SOURCE, depth: 0, overrideAccess: true })
    for (const t of res.docs as Array<{ name?: string }>) {
      if (t.name) results.push({ type: 'team', title: t.name, url: '/standings' })
    }
  } catch {
    /* ignore */
  }
  try {
    const res = await payload.find({ collection: 'venues', where: { name: { like: query } }, limit: PER_SOURCE, depth: 0, overrideAccess: true })
    for (const v of res.docs as Array<{ name?: string }>) {
      if (v.name) results.push({ type: 'venue', title: v.name, url: '/schedule' })
    }
  } catch {
    /* ignore */
  }

  return { query, count: results.length, results }
}
