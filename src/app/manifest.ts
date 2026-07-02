import type { MetadataRoute } from 'next'

import { SITE_DESCRIPTION } from '@/lib/siteUrl'

/*
 * Web app manifest, so families can install the site and it opens standalone. Brand
 * colors match the Off+Brand system (Calgary black background, near-white theme).
 *
 * Copy rule: no em or en dashes anywhere.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CMBA Connect',
    short_name: 'CMBA',
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#08080A',
    theme_color: '#08080A',
    orientation: 'portrait',
    categories: ['sports', 'education'],
    icons: [
      { src: '/favicon.png', sizes: 'any', type: 'image/png', purpose: 'any' },
      { src: '/cmba-logo-sm.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
