/**
 * The site's own public origin, with no trailing slash.
 *
 * Used by robots.ts, sitemap.ts and the structured data, all of which need
 * absolute URLs. Resolution order:
 *
 *   1. NEXT_PUBLIC_SERVER_URL, which this app already sets and is the intended
 *      answer in production.
 *   2. VERCEL_PROJECT_PRODUCTION_URL, so a deploy without the explicit variable
 *      still emits its real hostname rather than localhost.
 *   3. localhost, for development.
 *
 * Deliberately does NOT read the request Host header. A sitemap or a canonical
 * URL built from an attacker-supplied Host is how a site ends up advertising
 * someone else's domain as its own.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SERVER_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`

  return 'http://localhost:3000'
}
