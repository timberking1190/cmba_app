import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import {
  buildCsp,
  staticSecurityHeaders,
  CSP_HEADER,
  CSP_REPORT_ONLY_HEADER,
} from '@/lib/security/headers'

/*
 * Proxy (formerly the middleware file convention, renamed in Next 16) does two
 * jobs on every request, except static assets which the matcher excludes:
 *
 *  1. Security headers + a per-request, nonce-based CSP (Stage C / S0). The nonce
 *     is generated here and placed on the request's Content-Security-Policy header
 *     so Next.js stamps it onto the scripts it injects; the same policy is set on
 *     the response so the browser enforces it.
 *
 *  2. A lightweight session-presence gate for the private areas (/account,
 *     /compliance, /manage, /rep): no payload-token cookie -> redirect to /login.
 *     This is presence only; real authorization happens server-side in the page
 *     via payload.auth() + role checks, and /admin handles its own auth. That
 *     split matters more under Proxy than it did under Middleware: Next documents
 *     that a matcher change, or moving a Server Function to another route, can
 *     silently drop Proxy coverage. The page-level check is what actually
 *     protects anything; this gate only saves a round trip.
 *
 * Runtime: Proxy defaults to the NODE runtime in Next 16, where Middleware
 * defaulted to Edge. crypto.getRandomValues and btoa both exist there, so the
 * nonce generation below is unaffected. The `runtime` config option is not
 * allowed in a Proxy file and this one does not set it.
 */

const PROTECTED_PREFIXES = ['/account', '/compliance', '/manage', '/rep']

function makeNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

export function proxy(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production'
  const reportOnly = process.env.CSP_REPORT_ONLY === 'true'
  const nonce = makeNonce()
  const csp = buildCsp(nonce, isDev)
  const pathname = req.nextUrl.pathname

  // Private-area presence gate. Redirects do not need a CSP.
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  if (isProtected && !req.cookies.has('payload-token')) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Pass the nonce + (enforcing) CSP on the REQUEST so Next applies the nonce to
  // its own injected scripts. We always set the enforcing-name header here for the
  // nonce to be picked up, even in report-only mode (where the browser only gets
  // the Report-Only header below and so never blocks).
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set(CSP_HEADER, csp)

  const res = NextResponse.next({ request: { headers: requestHeaders } })

  for (const [k, v] of Object.entries(staticSecurityHeaders(isDev))) {
    res.headers.set(k, v)
  }
  res.headers.set(reportOnly ? CSP_REPORT_ONLY_HEADER : CSP_HEADER, csp)
  return res
}

export const config = {
  /*
   * Run on everything EXCEPT Next internals and static asset files (those are
   * served straight from disk and need no nonce). security.txt lives under
   * /.well-known and ends in .txt, so it is excluded here and served directly.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.png|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|otf|eot|map|txt|xml|json|webmanifest)$).*)',
  ],
}
