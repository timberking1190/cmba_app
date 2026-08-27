import { describe, expect, it } from 'vitest'
import { getTeamLinktConfig } from '../teamlinkt'

/*
 * Guards the config that broke the standings embed in production.
 *
 * The failure was silent and total, which is why it needs a test rather than a
 * comment. TeamLinkt answers an unknown league slug with a 302 to its own
 * marketing site rather than a 404, and that redirect chain ends on the apex host
 * teamlinkt.com. Our frame-src allows https://*.teamlinkt.com, and a CSP host
 * wildcard matches subdomains but NOT the apex, so the browser blocked the final
 * hop. The visible result was a 720px empty grey slab on /standings with nothing in
 * the console pointing anywhere near the cause.
 *
 * The slug is truncated to 32 characters by TeamLinkt, so it ends "associatio" with
 * no trailing "n". It reads like a typo and has been "corrected" back once already.
 *
 * These assertions are offline on purpose. To confirm the value against the live
 * upstream, which is the only thing that truly proves it:
 *
 *   curl -sSI "https://leagues.teamlinkt.com/calgaryminorbasketballassociatio/Standings"
 *
 * A correct slug answers 200. A wrong one answers 302 to www.teamlinkt.com.
 */
describe('TeamLinkt league config', () => {
  const { slug, leagueUrl, season } = getTeamLinktConfig()

  it('uses the 32 character truncated slug TeamLinkt actually serves', () => {
    expect(slug).toBe('calgaryminorbasketballassociatio')
    expect(slug).toHaveLength(32)
  })

  it('does not use the untruncated slug, which redirects to marketing', () => {
    expect(slug).not.toBe('calgaryminorbasketballassociation')
    expect(leagueUrl).not.toContain('calgaryminorbasketballassociation')
  })

  it('builds league page URLs on a subdomain the CSP frame-src allows', () => {
    const host = new URL(leagueUrl).host
    expect(host).toBe('leagues.teamlinkt.com')
    // A CSP wildcard covers subdomains only, so the apex would be blocked.
    expect(host).not.toBe('teamlinkt.com')
  })

  it('points at the current season, not the spring season that ended in June 2026', () => {
    expect(season).not.toBe('50938')
    expect(season).toBe('58270')
  })
})
