/*
 * Member Cards — requirement evaluation (D14 / D20).
 *
 * A role is SCANNABLE iff the requirement matrix lists ≥1 required credential for
 * it. Seeded so only `coach` is scannable (record_check + safesport +
 * cmba_coach_training). Adding required rows for another role later makes that role
 * scannable with zero code change.
 *
 * Pure functions over plain snapshots — no DB, no clock of their own (callers pass
 * `now`). The /verify route builds the inputs from `certification-types` (the
 * matrix) and `certifications` (the held credentials) and layers token/revocation
 * checks on top of this verdict.
 */

/** A credential "type" identity — in this repo, a certification-type key/slug. */
export type CredentialKey = string
export type RoleKey = string

/** One matrix row: role → credential type, required or not. */
export interface RequirementRow {
  role: RoleKey
  credential: CredentialKey
  isRequired: boolean
}

/** Held-credential status, mirroring `certifications.status` in this app. */
export type CertStatus = 'pending-verification' | 'valid' | 'expiring' | 'expired'

export interface HeldCredential {
  key: CredentialKey
  status: CertStatus
  /** ISO date (yyyy-mm-dd) or null when the credential does not expire. */
  expiresOn: string | null
}

/** The credential-side verdict. Token/revocation verdicts are added by /verify. */
export type CredentialVerdict = 'valid' | 'expired_credentials' | 'not_scannable' | 'member_inactive'

export interface MemberEval {
  role: RoleKey
  isActive: boolean
  held: HeldCredential[]
  now: Date
}

export interface EvalOutcome {
  verdict: CredentialVerdict
  requiredCredentials: CredentialKey[]
  /** Required credentials with no satisfying held record at all. */
  missing: CredentialKey[]
  /** Required credentials that are held but expired / unverified. */
  expiredOrInvalid: CredentialKey[]
}

/** Roles that have at least one required credential (D14/D20). */
export function scannableRoles(rows: RequirementRow[]): Set<RoleKey> {
  const set = new Set<RoleKey>()
  for (const r of rows) if (r.isRequired) set.add(r.role)
  return set
}

export function isRoleScannable(rows: RequirementRow[], role: RoleKey): boolean {
  return rows.some((r) => r.role === role && r.isRequired)
}

export function requiredCredentialsFor(rows: RequirementRow[], role: RoleKey): CredentialKey[] {
  const keys = new Set<CredentialKey>()
  for (const r of rows) if (r.role === role && r.isRequired) keys.add(r.credential)
  return [...keys]
}

/**
 * A credential satisfies a requirement when it is verified (valid or within its
 * expiring window) AND not past its expiry date. `pending-verification` and
 * `expired` never satisfy.
 */
export function isCredentialSatisfied(cred: Pick<HeldCredential, 'status' | 'expiresOn'>, now: Date): boolean {
  if (cred.status !== 'valid' && cred.status !== 'expiring') return false
  if (cred.expiresOn == null) return true
  const expiry = new Date(`${cred.expiresOn}T23:59:59.999Z`)
  if (Number.isNaN(expiry.getTime())) return false
  return expiry.getTime() >= now.getTime()
}

/**
 * Evaluate a scanned member's credential standing against the requirement matrix.
 * Precedence: role-not-scannable (ID-only card) → member inactive → credential eval.
 */
export function evaluateMember(rows: RequirementRow[], member: MemberEval): EvalOutcome {
  const requiredCredentials = requiredCredentialsFor(rows, member.role)

  if (requiredCredentials.length === 0) {
    return { verdict: 'not_scannable', requiredCredentials, missing: [], expiredOrInvalid: [] }
  }
  if (!member.isActive) {
    return { verdict: 'member_inactive', requiredCredentials, missing: [], expiredOrInvalid: [] }
  }

  const bestByKey = new Map<CredentialKey, HeldCredential>()
  for (const h of member.held) {
    // Keep the "best" held record per key: a satisfying one wins over a non-satisfying one.
    const existing = bestByKey.get(h.key)
    if (!existing || (isCredentialSatisfied(h, member.now) && !isCredentialSatisfied(existing, member.now))) {
      bestByKey.set(h.key, h)
    }
  }

  const missing: CredentialKey[] = []
  const expiredOrInvalid: CredentialKey[] = []
  for (const key of requiredCredentials) {
    const held = bestByKey.get(key)
    if (!held) {
      missing.push(key)
    } else if (!isCredentialSatisfied(held, member.now)) {
      expiredOrInvalid.push(key)
    }
  }

  const verdict: CredentialVerdict =
    missing.length === 0 && expiredOrInvalid.length === 0 ? 'valid' : 'expired_credentials'
  return { verdict, requiredCredentials, missing, expiredOrInvalid }
}
