import 'server-only'

import { unstable_cache } from 'next/cache'

import { getPayloadClient } from './auth'

/*
 * Which of the native CMS "program pages" are actually published?
 *
 * src/content/programPages.ts defines five pages: key dates, meeting minutes,
 * spring league, summer camps, and women in coaching. That file is SEED data, so
 * each page exists only once it has been seeded into the database. In production
 * none of the five ever were, while src/lib/cmbaLinks.ts links to all five from
 * the homepage, the schedule, resources, the parent hub, and coach clinics. Every
 * one of those links was a dead end.
 *
 * It went unnoticed because the app answers an unknown URL with the branded
 * not-found body under a 200 status. Any link checker that trusts status codes
 * reports the site as perfectly healthy; only reading the rendered heading finds
 * it. Verified against production: all five return the 404 page.
 *
 * Callers hide a link when its target is not published, so each one reappears by
 * itself the moment the page is seeded or written in the admin. One cached query
 * covers all five, on pages that already talk to Payload on every request.
 */
export const PROGRAM_SLUGS = [
  'key-dates',
  'meeting-minutes',
  'spring-league',
  'summer-camps',
  'women-in-coaching',
] as const

const cachedLookup = unstable_cache(
  async (): Promise<string[]> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'pages',
      where: { slug: { in: [...PROGRAM_SLUGS] } },
      limit: PROGRAM_SLUGS.length,
      depth: 0,
    })
    return res.docs.map((d) => (d as { slug?: string }).slug).filter((s): s is string => !!s)
  },
  ['published-program-pages'],
  { revalidate: 3600, tags: ['pages'] },
)

/*
 * Returns a predicate: does this href point somewhere a visitor can actually go?
 * Anything that is not one of the five program pages is left alone, so external
 * links, PDFs, and ordinary routes always pass.
 */
export async function livePageFilter(): Promise<(href: string) => boolean> {
  let published: Set<string>
  try {
    published = new Set(await cachedLookup())
  } catch {
    // A failed lookup must never take a public page down. Assume the seed-only
    // pages are missing, which is the state that has held in production anyway.
    published = new Set()
  }
  return (href: string) => {
    if (!href?.startsWith('/')) return true
    const slug = href.slice(1)
    return !(PROGRAM_SLUGS as readonly string[]).includes(slug) || published.has(slug)
  }
}
