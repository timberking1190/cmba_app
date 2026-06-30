import { NextResponse } from 'next/server'

import { decideMfa } from '@/lib/mfa/guard'
import { mfaEnforced } from '@/lib/mfa/enforcePure'
import { getCurrentUserWithAssurance } from '@/lib/mfa/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * GET /api/v1/auth/mfa/status - the current session's MFA posture. Used by the
 * Payload /admin gate (and usable by native clients). `decision` already accounts
 * for MFA_ENFORCE: it is forced to 'ok' when enforcement is off, so a client never
 * redirects unless enforcement is on.
 */
export async function GET() {
  const user = await getCurrentUserWithAssurance()
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 })
  const enforced = mfaEnforced()
  const mfa = (user as { mfa?: { enrolled?: boolean; required?: boolean } }).mfa ?? {}
  return NextResponse.json({
    authenticated: true,
    enrolled: Boolean(mfa.enrolled),
    aal: user._mfa?.aal ?? 'aal1',
    enforced,
    decision: enforced ? decideMfa(user) : 'ok',
  })
}
