/*
 * Stage C / S4 — registration readiness. Public self-registration can be switched
 * off without code changes, so the operator can run admin-invite-only (accounts
 * created by an admin) when desired. Default is 'open' to preserve the current
 * behavior; set REGISTRATION_MODE=closed to require admin-created accounts.
 *
 * A token-based self-serve invite flow is the documented next step; today 'closed'
 * means admin-creates-the-account (the invite-only effect).
 */
export type RegistrationMode = 'open' | 'closed'

export function registrationMode(): RegistrationMode {
  return process.env.REGISTRATION_MODE === 'closed' ? 'closed' : 'open'
}

export function publicRegistrationAllowed(mode: RegistrationMode = registrationMode()): boolean {
  return mode === 'open'
}
