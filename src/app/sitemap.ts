import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/siteUrl'
import { getPayloadClient } from '@/lib/auth'

/*
 * Sitemap for the public site.
 *
 * Only pages a signed out visitor can actually reach. Anything behind the session
 * gate in src/proxy.ts (/account, /manage, /rep, /compliance) is excluded, along
 * with /scan, which needs a camera and a signed in official, and the one-time
 * tokenised guardian links. Listing a page here that returns a redirect to /login
 * teaches search engines that the sign in page is the content.
 */

type Entry = MetadataRoute.Sitemap[number]

/** Static routes, with a rough sense of how often each actually changes. */
const STATIC: { path: string; changeFrequency: Entry['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/schedule', changeFrequency: 'daily', priority: 0.9 },
  { path: '/standings', changeFrequency: 'daily', priority: 0.9 },
  { path: '/calendar', changeFrequency: 'daily', priority: 0.8 },
  { path: '/rules', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/coach', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/coach/pathway', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/coach/courses', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/coach/clinics', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/coach/managing-the-moment', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/ref', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/ref/signals', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/ref/quick-ref', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/athlete', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/parent', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/resources', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/leadership', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/game-report', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/arcade', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/accessibility', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
]

/**
 * Published CMS pages from the `pages` collection, which the [slug] route
 * renders. Failing softly matters here: a sitemap that throws takes the route
 * down, and an incomplete sitemap is much better than a 500.
 */
async function cmsPages(base: string): Promise<Entry[]> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'pages',
      where: { _status: { equals: 'published' } },
      depth: 0,
      limit: 500,
      // Public permissions on purpose: if a visitor cannot read it, it does not
      // belong in a sitemap.
      overrideAccess: false,
    })

    return (res.docs as { slug?: string | null; updatedAt?: string | null }[])
      .filter((d): d is { slug: string; updatedAt?: string | null } => Boolean(d.slug))
      .map((d) => ({
        url: `${base}/${d.slug}`,
        lastModified: d.updatedAt ? new Date(d.updatedAt) : undefined,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }))
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const now = new Date()

  return [
    ...STATIC.map((s) => ({
      url: `${base}${s.path === '/' ? '' : s.path}`,
      lastModified: now,
      changeFrequency: s.changeFrequency,
      priority: s.priority,
    })),
    ...(await cmsPages(base)),
  ]
}
