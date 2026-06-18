/*
 * Pure certification-status logic, shared by the Certifications write hook, the
 * compliance utilities, and the Phase 2 expiry-reminder cron. No I/O so it is
 * trivially testable.
 */
export type CertStatus = 'valid' | 'expiring' | 'expired' | 'pending-verification'

export const EXPIRING_WINDOW_DAYS = 60

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Derive a certification's status from its verification + expiry.
 * - Not yet verified by an admin -> `pending-verification`.
 * - Verified, no expiry -> `valid` (never expires).
 * - Verified, past expiry -> `expired`.
 * - Verified, expiring within EXPIRING_WINDOW_DAYS -> `expiring`.
 * - Otherwise -> `valid`.
 */
export function computeCertStatus(
  opts: { verifiedAt?: string | Date | null; expiryDate?: string | Date | null },
  now: Date = new Date(),
): CertStatus {
  if (!opts.verifiedAt) return 'pending-verification'
  if (!opts.expiryDate) return 'valid'
  const exp = new Date(opts.expiryDate).getTime()
  const nowMs = now.getTime()
  if (Number.isNaN(exp)) return 'valid'
  if (exp < nowMs) return 'expired'
  const daysLeft = (exp - nowMs) / DAY_MS
  if (daysLeft <= EXPIRING_WINDOW_DAYS) return 'expiring'
  return 'valid'
}

/** Add `months` to an ISO/Date issue date; returns ISO string (or null). */
export function addMonths(
  issueDate: string | Date | null | undefined,
  months: number | null | undefined,
): string | null {
  if (!issueDate || !months) return null
  const d = new Date(issueDate)
  if (Number.isNaN(d.getTime())) return null
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

/** Number of whole days until expiry (negative = already expired); null if no expiry. */
export function daysUntil(
  expiryDate: string | Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!expiryDate) return null
  const exp = new Date(expiryDate).getTime()
  if (Number.isNaN(exp)) return null
  return Math.floor((exp - now.getTime()) / DAY_MS)
}
