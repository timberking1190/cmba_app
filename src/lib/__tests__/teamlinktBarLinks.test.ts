import { describe, expect, it } from 'vitest'

import { TEAMLINKT } from '../cmbaLinks'

/*
 * The three destinations behind the persistent league bar.
 *
 * The bar sits on every page of the site, so a wrong URL here is not a broken
 * link on one page, it is a broken link everywhere. The specific trap is the
 * league slug: TeamLinkt truncates it to 32 characters, so the real slug ends
 * "associatio" with no trailing "n". It reads like a typo and has been written
 * the "correct" way in briefs and in this repo before.
 *
 * Getting it wrong is silent. TeamLinkt answers an unknown slug with a 302 to its
 * own marketing site rather than a 404, so every visitor would be quietly sent to
 * a page about league management software with nothing logged anywhere.
 *
 * These assertions are offline on purpose. To confirm against the live upstream,
 * which is the only thing that truly proves it:
 *
 *   curl -sSI "https://leagues.teamlinkt.com/calgaryminorbasketballassociatio/Schedule"
 *
 * A correct slug answers 200. A wrong one answers 302 to www.teamlinkt.com.
 */
describe('TeamLinkt league bar destinations', () => {
  const slugOf = (url: string) => new URL(url).pathname.split('/').filter(Boolean)[0]

  it('uses the 32 character truncated slug TeamLinkt actually serves', () => {
    for (const url of [TEAMLINKT.schedule, TEAMLINKT.standings]) {
      expect(slugOf(url)).toBe('calgaryminorbasketballassociatio')
      expect(slugOf(url)).toHaveLength(32)
    }
  })

  it('does not use the untruncated slug, which redirects to marketing', () => {
    for (const url of [TEAMLINKT.schedule, TEAMLINKT.standings]) {
      expect(url).not.toContain('calgaryminorbasketballassociation')
    }
  })

  it('points at the league Schedule and Standings pages', () => {
    expect(new URL(TEAMLINKT.schedule).pathname).toBe('/calgaryminorbasketballassociatio/Schedule')
    expect(new URL(TEAMLINKT.standings).pathname).toBe('/calgaryminorbasketballassociatio/Standings')
  })

  it('sends score reporting to the TeamLinkt app, not the league site', () => {
    expect(new URL(TEAMLINKT.reportScore).host).toBe('app.teamlinkt.com')
  })

  it('serves every destination over https on a teamlinkt.com host', () => {
    for (const url of Object.values(TEAMLINKT)) {
      const u = new URL(url)
      expect(u.protocol).toBe('https:')
      expect(u.host.endsWith('teamlinkt.com')).toBe(true)
    }
  })

  /*
   * The league pages are framed elsewhere in the app (TeamLinktEmbed), and the CSP
   * frame-src allows https://*.teamlinkt.com. A wildcard matches subdomains but NOT
   * the apex, so a destination on bare teamlinkt.com would be blocked there.
   */
  it('never uses the apex host, which the CSP frame-src wildcard does not match', () => {
    for (const url of Object.values(TEAMLINKT)) {
      expect(new URL(url).host).not.toBe('teamlinkt.com')
    }
  })
})
