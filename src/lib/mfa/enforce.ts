import 'server-only'
import { redirect } from 'next/navigation'

import { decideMfa } from './guard'
import { mfaEnforced, mfaRedirectTarget } from './enforcePure'
import { getCurrentUserWithAssurance, type UserWithMfa } from './session'

export { mfaEnforced, mfaRedirectTarget } from './enforcePure'

/*
 * Stage C / S1 (I7) — MFA enforcement for gated pages, behind MFA_ENFORCE.
 *
 * Call AFTER a page's existing getCurrentUser + role gate. When MFA_ENFORCE is off
 * (default) this is a no-op: it does no query and never redirects, so behavior is
 * identical to before. When on, it loads the per-session assurance and redirects a
 * required/enrolled user to enroll or challenge. The redirect targets
 * (/account/security and /account/security/challenge) are NOT themselves enforced,
 * so a required-but-unenrolled super admin always has a path in (force-enrollment,
 * never a hard lockout).
 */

export async function enforceMfa(path: string, opts?: { stepUp?: boolean }): Promise<void> {
  if (!mfaEnforced()) return
  const user = await getCurrentUserWithAssurance()
  if (!user) return // signed-out is already handled by the proxy + the page's own guard
  const target = mfaRedirectTarget(decideMfa(user as UserWithMfa, { stepUp: opts?.stepUp }), path)
  if (target) redirect(target)
}
