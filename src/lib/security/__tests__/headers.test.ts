import { afterEach, describe, expect, it } from 'vitest'

import { buildCsp, staticSecurityHeaders } from '../headers'

const NONCE = 'TEST_NONCE_123'

afterEach(() => {
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  delete process.env.CSP_COMPAT_SCRIPTS
})

describe('buildCsp script-src strategy', () => {
  it('strict-nonce (default): self + nonce + strict-dynamic, no unsafe-inline/eval in script-src (prod)', () => {
    const csp = buildCsp(NONCE, false)
    expect(csp).toContain(`script-src 'self' 'nonce-${NONCE}' 'strict-dynamic'`)
    // script-src specifically must not weaken (style-src may keep unsafe-inline).
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) || ''
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  it('compatible (CSP_COMPAT_SCRIPTS=true): self + unsafe-inline, no nonce', () => {
    process.env.CSP_COMPAT_SCRIPTS = 'true'
    const csp = buildCsp(NONCE, false)
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).not.toContain('nonce-')
    expect(csp).not.toContain("'strict-dynamic'")
  })
})

describe('buildCsp (production)', () => {
  const csp = buildCsp(NONCE, false)

  it('locks the dangerous directives', () => {
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
  })

  it("uses frame-ancestors 'self' so Live Preview works but cross-origin framing is denied", () => {
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).not.toContain("frame-ancestors 'none'")
  })

  it('allowlists only the embeds the site actually uses', () => {
    expect(csp).toContain('https://*.teamlinkt.com')
    expect(csp).toContain('https://www.youtube.com')
    // No blanket https: in frame-src.
    expect(csp).not.toMatch(/frame-src[^;]*\shttps:(\s|;)/)
  })

  it('reports violations and upgrades insecure subresources', () => {
    expect(csp).toContain('report-uri /api/csp-report')
    expect(csp).toContain('upgrade-insecure-requests')
  })

  it('omits Turnstile origins until a site key is configured', () => {
    expect(buildCsp(NONCE, false)).not.toContain('challenges.cloudflare.com')
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    expect(buildCsp(NONCE, false)).toContain('https://challenges.cloudflare.com')
  })
})

describe('buildCsp (development)', () => {
  const csp = buildCsp(NONCE, true)
  it('permits eval for HMR and does not force https upgrades locally', () => {
    expect(csp).toContain("'unsafe-eval'")
    expect(csp).not.toContain('upgrade-insecure-requests')
  })
})

describe('staticSecurityHeaders', () => {
  it('sets the core hardening headers and HSTS in production', () => {
    const h = staticSecurityHeaders(false)
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['X-Frame-Options']).toBe('SAMEORIGIN')
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(h['Strict-Transport-Security']).toContain('max-age=63072000')
    expect(h['Strict-Transport-Security']).toContain('preload')
    expect(h['Permissions-Policy']).toContain('camera=()')
    expect(h['Permissions-Policy']).toContain('geolocation=()')
  })

  it('omits HSTS in development (plain http)', () => {
    expect(staticSecurityHeaders(true)['Strict-Transport-Security']).toBeUndefined()
  })
})
