import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/siteUrl'

/*
 * robots.txt. Public content is crawlable; member, admin, and API areas are not.
 *
 * Copy rule: no em or en dashes anywhere.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account', '/manage', '/compliance', '/rep', '/login', '/admin', '/api', '/guardian'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
