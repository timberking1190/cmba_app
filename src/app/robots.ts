import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/siteUrl'

/*
 * There was no robots.txt at all, static or generated, so every crawler was free
 * to walk the whole app including the admin and the signed in areas. Those are
 * behind auth and would 302 to /login rather than leak anything, but a crawler
 * hammering /manage or /api is still load nobody asked for, and a search result
 * pointing at a sign in page is a bad result.
 *
 * Disallow here is a request, not a control. The security boundary is the Payload
 * access functions in src/access/ and the session gate in src/proxy.ts, and that
 * is unchanged by anything in this file.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin', // Payload admin
          '/api/', // REST and GraphQL
          '/account', // anything scoped to one signed in person
          '/manage', // scheduling and roster console
          '/rep',
          '/compliance', // consent audit and compliance dashboards
          '/scan', // scanner, needs a camera and a signed in official
          '/guardian/confirm', // one-time tokenised links
          '/score-login',
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  }
}
