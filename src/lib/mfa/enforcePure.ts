import type { MfaDecision } from './guard'

/*
 * Pure enforcement helpers (no server-only / Payload imports, so they unit-test).
 * The server entrypoint (enforceMfa) lives in enforce.ts.
 */

export function mfaEnforced(): boolean {
  return process.env.MFA_ENFORCE === 'true'
}

/** Map an MFA decision to a redirect target, or null when access is allowed. */
export function mfaRedirectTarget(decision: MfaDecision, path: string): string | null {
  const next = encodeURIComponent(path)
  if (decision === 'enroll-required') return `/account/security?next=${next}`
  if (decision === 'challenge-required' || decision === 'stepup-required') return `/account/security/challenge?next=${next}`
  return null
}
