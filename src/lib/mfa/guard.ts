/*
 * Stage C / S1 — the single MFA decision function. Pure and unit-tested; every
 * gate (page guards, admin slot, sensitive-action checks) calls this so the policy
 * lives in one place.
 *
 * Force-enrollment invariant: an admin (required) who has not enrolled returns
 * 'enroll-required', never a hard denial. There is no path that locks a required
 * user out without offering enrollment.
 */

export type Aal = 'aal1' | 'aal2'
export type MfaDecision = 'ok' | 'enroll-required' | 'challenge-required' | 'stepup-required'

const ADMIN_ROLES = ['club_admin', 'super_admin']
const STEP_UP_MAX_AGE_MS = 5 * 60 * 1000

export type MfaUser = {
  roles?: string[] | null
  mfa?: { enrolled?: boolean | null; required?: boolean | null } | null
  // Attached at read time (see lib/mfa/session): per-session assurance.
  _mfa?: { aal?: Aal; mfaAt?: string | Date | null; stepUpAt?: string | Date | null } | null
}

/** MFA is required if the derived flag is set OR the user currently holds an admin role. */
export function mfaRequired(user: MfaUser): boolean {
  if (user.mfa?.required) return true
  const roles = Array.isArray(user.roles) ? user.roles : []
  return roles.some((r) => ADMIN_ROLES.includes(r))
}

function ageMs(value: string | Date | null | undefined, now: Date): number {
  if (!value) return Infinity
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(t) ? now.getTime() - t : Infinity
}

export function decideMfa(user: MfaUser, opts?: { stepUp?: boolean; now?: Date }): MfaDecision {
  const now = opts?.now ?? new Date()
  const required = mfaRequired(user)
  const enrolled = Boolean(user.mfa?.enrolled)
  const aal: Aal = user._mfa?.aal === 'aal2' ? 'aal2' : 'aal1'

  // 1. Required but not enrolled -> force enrollment (the always-open door).
  if (required && !enrolled) return 'enroll-required'

  // 2. Enrolled but this session has not passed a second factor.
  if (enrolled && aal !== 'aal2') return 'challenge-required'

  // 3. Sensitive action needs a FRESH re-auth (only meaningful once aal2).
  if (opts?.stepUp && enrolled && ageMs(user._mfa?.stepUpAt, now) > STEP_UP_MAX_AGE_MS) {
    return 'stepup-required'
  }

  return 'ok'
}

export { STEP_UP_MAX_AGE_MS }
