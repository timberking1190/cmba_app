/*
 * Stage C / S0 — security headers and a strict, nonce-based Content Security
 * Policy for the whole app. Built once per request in the proxy so every script
 * Next.js injects carries the per-request nonce (Next reads the nonce from the
 * request's Content-Security-Policy header and applies it automatically).
 *
 * Design decisions worth knowing:
 *  - frame-ancestors is 'self', NOT 'none'. Payload Live Preview (Phase 3) frames
 *    the public site inside /admin on the same origin; 'none' would break it.
 *    Clickjacking protection still holds because cross-origin framing is denied.
 *  - style-src keeps 'unsafe-inline'. React/Next inject inline styles and the
 *    Off+Brand UI uses style attributes; inline style is a low XSS risk and this
 *    is recorded as an accepted exception in docs/SECURITY.md.
 *  - frame-src allowlists only the embeds the site actually uses (TeamLinkt
 *    schedule/standings, plus admin-authored CMS embeds: YouTube, Google
 *    Docs/Drive, RAMP). Anything else is blocked.
 *  - Set CSP_REPORT_ONLY=true to emit Content-Security-Policy-Report-Only instead
 *    of enforcing. Use it for the first preview deploy, watch /api/csp-report,
 *    then enforce.
 */

// Cross-origin frame embeds the public site legitimately loads.
const FRAME_SRC = [
  "'self'",
  // A CSP host wildcard matches subdomains but NOT the apex, so *.teamlinkt.com
  // alone silently blocks any redirect that lands on bare teamlinkt.com. That is
  // what turned a stale league slug into an unexplained empty embed on /standings.
  'https://teamlinkt.com',
  'https://*.teamlinkt.com',
  'https://www.youtube.com',
  'https://www.youtube-nocookie.com',
  'https://youtube.com',
  'https://docs.google.com',
  'https://drive.google.com',
  'https://sites.google.com',
  'https://*.rampinteractive.com',
  'https://cmba.rampassigning.com',
]

// Supabase Storage / API (ca-central-1) for images, media, and any client fetch.
const SUPABASE = ['https://*.supabase.co', 'https://*.supabase.in']

/*
 * script-src has two strategies:
 *
 *  - 'strict-nonce' (gold standard): 'self' + per-request nonce + 'strict-dynamic'.
 *    REQUIRES the page to be dynamically rendered so Next stamps the nonce onto
 *    its inline bootstrap scripts. Opt in with CSP_STRICT_SCRIPTS=true once the
 *    public site reads the nonce in its root layout (forcing dynamic rendering).
 *
 *  - 'compatible' (default): 'self' + 'unsafe-inline'. Works with the existing
 *    statically/ISR-rendered public pages without breaking Next's un-nonced inline
 *    bootstrap scripts. 'unsafe-inline' is the one documented residual; it still
 *    blocks loading scripts from foreign origins and there are no app-authored
 *    inline scripts. Tracked for upgrade in S2 (docs/SECURITY.md).
 */
export function cspScriptStrategy(): 'strict-nonce' | 'compatible' {
  // Default to the gold-standard strict policy. The public site reads the request
  // nonce in its root layout (forcing dynamic rendering) so Next stamps the nonce
  // onto every script it emits. Set CSP_COMPAT_SCRIPTS=true to fall back to the
  // 'self' 'unsafe-inline' policy (e.g. if a static export is ever reintroduced).
  return process.env.CSP_COMPAT_SCRIPTS === 'true' ? 'compatible' : 'strict-nonce'
}

/*
 * `isLoopback` means the request arrived on localhost / 127.0.0.1 / ::1, which is
 * almost always a production build being served over plain http for testing.
 * It is deliberately separate from `isDev`: `next start` sets NODE_ENV=production,
 * so a local production run looked exactly like the real deployment and got
 * upgrade-insecure-requests, which rewrites every asset URL to https://localhost
 * where nothing is listening. Chromium hides this by exempting localhost from the
 * upgrade; WebKit obeys it, so the whole stylesheet failed to load and the mobile
 * Safari project rendered unstyled HTML. Scoping to loopback means production
 * behaviour is untouched: a real deployment is never loopback.
 */
export function buildCsp(nonce: string, isDev: boolean, isLoopback = false): string {
  // Cloudflare Turnstile (bot challenge) only ships when a site key is set; allow
  // its script + frame origin in that case, and not before (no unused origins).
  const turnstileOn = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  const TURNSTILE = turnstileOn ? ['https://challenges.cloudflare.com'] : []

  const scriptSrc =
    cspScriptStrategy() === 'strict-nonce'
      ? [
          "'self'",
          `'nonce-${nonce}'`,
          "'strict-dynamic'",
          ...TURNSTILE,
          ...(isDev ? ["'unsafe-eval'"] : []),
        ]
      : [
          "'self'",
          "'unsafe-inline'",
          ...TURNSTILE,
          // Next.js dev (HMR / React refresh) needs eval; never in production.
          ...(isDev ? ["'unsafe-eval'"] : []),
        ]
  const connectSrc = [
    "'self'",
    ...SUPABASE,
    // Local dev websocket for HMR.
    ...(isDev ? ['ws:', 'http://localhost:*'] : []),
  ]

  const directives: Record<string, string[] | null> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    // 'self' (not 'none') so Payload Live Preview can frame the site same-origin.
    'frame-ancestors': ["'self'"],
    'form-action': ["'self'"],
    'script-src': scriptSrc,
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...SUPABASE],
    'font-src': ["'self'", 'data:'],
    'connect-src': connectSrc,
    'frame-src': FRAME_SRC,
    'media-src': ["'self'", ...SUPABASE],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'report-uri': ['/api/csp-report'],
    // Valueless directive (force https on http subresources). Skip in dev (http).
    'upgrade-insecure-requests': isDev || isLoopback ? null : [],
  }

  return Object.entries(directives)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => (v && v.length ? `${k} ${v.join(' ')}` : k))
    .join('; ')
}

/*
 * Static security headers applied to every response. HSTS is only meaningful over
 * https; it is harmless on localhost http (browsers ignore it) but we still emit a
 * conservative value only in production.
 */
export function staticSecurityHeaders(isDev: boolean, isLoopback = false): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-DNS-Prefetch-Control': 'off',
    'Cross-Origin-Opener-Policy': 'same-origin',
    // Disable powerful features the site does not use. (No camera/mic/geo; the
    // site never calls those APIs.)
    'Permissions-Policy': [
      'accelerometer=()',
      'autoplay=(self)',
      'camera=()',
      'display-capture=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
      'browsing-topics=()',
      'interest-cohort=()',
    ].join(', '),
  }
  // Never pin loopback to https: the browser would remember it, and every later
  // plain-http run against localhost would fail before it started.
  if (!isDev && !isLoopback) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
  }
  return headers
}

export const CSP_HEADER = 'Content-Security-Policy'
export const CSP_REPORT_ONLY_HEADER = 'Content-Security-Policy-Report-Only'
