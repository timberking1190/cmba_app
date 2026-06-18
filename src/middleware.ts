import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/*
 * Gate the /account area: if there is no Payload session cookie, redirect to
 * /login (preserving where the user was headed). This is a lightweight presence
 * check only — the real authorization happens in the server component via
 * payload.auth(), and Payload's own /admin handles its own auth.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has('payload-token')
  if (!hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // Presence check only; role is enforced in the page (super-admin pages gate
  // themselves via getCurrentUser + isSuperAdmin).
  matcher: ['/account/:path*', '/compliance/:path*'],
}
