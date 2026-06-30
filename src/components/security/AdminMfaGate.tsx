'use client'

import { useEffect } from 'react'

/*
 * Stage C / S1 (I7) - MFA enforcement for the Payload /admin SPA. Registered as a
 * Payload admin provider, so it wraps every admin route. On mount it checks the
 * session's MFA posture; when enforcement is on and the session is not yet AAL2
 * (or the admin is required-but-unenrolled), it sends them to enroll or challenge,
 * then back to /admin. A no-op when MFA_ENFORCE is off (the status route forces
 * decision to 'ok'), so the admin is unaffected until the operator turns it on.
 */
export function AdminMfaGate({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/auth/mfa/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enforced?: boolean; decision?: string } | null) => {
        if (cancelled || !d || !d.enforced) return
        const next = '?next=' + encodeURIComponent('/admin')
        if (d.decision === 'enroll-required') window.location.href = '/account/security' + next
        else if (d.decision === 'challenge-required' || d.decision === 'stepup-required') {
          window.location.href = '/account/security/challenge' + next
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return <>{children}</>
}
