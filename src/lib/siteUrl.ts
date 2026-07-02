/*
 * The public base URL of the site, used by robots, sitemap, manifest, structured
 * data, and social share metadata. Reads NEXT_PUBLIC_SERVER_URL and falls back to the
 * production deploy. No trailing slash.
 *
 * Copy rule: no em or en dashes anywhere.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SERVER_URL || 'https://cmbaplatform.vercel.app'
  return raw.replace(/\/$/, '')
}

export const SITE_NAME = 'CMBA Connect'
export const SITE_DESCRIPTION =
  'The official platform for Calgary Minor Basketball Association: rules, education, certification tracking, schedule, standings, and game reports for coaches, referees, parents, and admins.'
