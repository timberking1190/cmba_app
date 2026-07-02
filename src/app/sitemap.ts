import type { MetadataRoute } from 'next'

import { getPayloadClient } from '@/lib/auth'
import { siteUrl } from '@/lib/siteUrl'

export const dynamic = 'force-dynamic'

/*
 * Sitemap: the public static routes plus every published CMS page. Member, admin,
 * and API routes are intentionally excluded (see robots.ts). If the Pages query
 * fails, we still return the static routes rather than erroring.
 *
 * Copy rule: no em or en dashes anywhere.
 */
const STATIC_PATHS = [
  '', '/schedule', '/standings', '/calendar', '/rules', '/resources', '/faq',
  '/contact', '/leadership', '/coach', '/coach/pathway', '/ref', '/parent',
  '/privacy', '/terms',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: p === '' || p === '/schedule' || p === '/standings' ? 'daily' : 'weekly',
    priority: p === '' ? 1 : 0.7,
  }))

  let pageEntries: MetadataRoute.Sitemap = []
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'pages',
      where: { _status: { equals: 'published' } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    pageEntries = (res.docs as Array<{ slug?: string; updatedAt?: string }>)
      .filter((d) => d.slug)
      .map((d) => ({
        url: `${base}/${d.slug}`,
        lastModified: d.updatedAt ? new Date(d.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.6,
      }))
  } catch {
    // Degrade to the static routes if the CMS query fails.
  }

  return [...staticEntries, ...pageEntries]
}
