import { createHash } from 'crypto'

/*
 * Pure helpers for the email health log. Kept PII free by design: we never store a
 * raw recipient address, only a salted hash (so repeat failures to one person can
 * be counted without exposing who they are) plus the bare domain (to spot a whole
 * provider bouncing). Pure functions so they are unit testable without a database.
 *
 * Copy rule: no em or en dashes anywhere.
 */

// The category header an app composer may set so the health surface can label a
// send precisely. Stripped before the message goes out on the wire.
export const CATEGORY_HEADER = 'x-cmba-email-category'

// Every category the health log recognizes. Shared with the collection select.
export const EMAIL_CATEGORIES = [
  'report_request',
  'contested',
  'schedule_change',
  'announcement',
  'assignment',
  'weekly_digest',
  'recognition',
  'cert_reminder',
  'score_reminder',
  'score_report',
  'guardian',
  'password_reset',
  'verify',
  'email_otp',
  'test',
  'other',
] as const

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number]

function addressString(a: unknown): string {
  if (typeof a === 'string') return a
  if (a && typeof a === 'object' && 'address' in a) return String((a as { address?: unknown }).address ?? '')
  return ''
}

/** Flatten a nodemailer `to` (string, comma list, or array) to normalized addresses. */
export function normalizeRecipients(to: unknown): string[] {
  if (!to) return []
  const arr = Array.isArray(to) ? to : [to]
  return arr
    .flatMap((a) => addressString(a).split(','))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/** Salted SHA-256 of the first recipient. Empty string if there is no recipient. */
export function hashRecipient(to: unknown, salt: string): string {
  const [first] = normalizeRecipients(to)
  if (!first) return ''
  return createHash('sha256').update(`${salt}:${first}`).digest('hex')
}

/** Bare domain of the first recipient (e.g. "gmail.com"), or "unknown". */
export function recipientDomain(to: unknown): string {
  const [first] = normalizeRecipients(to)
  const at = first ? first.lastIndexOf('@') : -1
  return at > -1 ? first.slice(at + 1) : 'unknown'
}

export function recipientCount(to: unknown): number {
  return normalizeRecipients(to).length
}

/*
 * Best effort category from the subject line, used for Payload's own auth emails
 * (password reset, verify) and anything an app composer did not tag with the
 * category header. Ordered so the most specific match wins.
 */
export function categoryFromSubject(subject?: string | null): EmailCategory {
  const s = (subject ?? '').toLowerCase()
  if (!s) return 'other'
  if (s.includes('reset') && s.includes('password')) return 'password_reset'
  if (s.includes('verify') || s.includes('confirm your email')) return 'verify'
  if (s.includes('passcode') || s.includes('one-time') || s.includes('one time code')) return 'email_otp'
  if (s.includes('test')) return 'test'
  return 'other'
}

/** Coerce an incoming header value to a known category, else fall back to subject. */
export function resolveCategory(headerValue: string | undefined, subject?: string | null): EmailCategory {
  const v = (headerValue ?? '').trim().toLowerCase()
  if ((EMAIL_CATEGORIES as readonly string[]).includes(v)) return v as EmailCategory
  return categoryFromSubject(subject)
}

/*
 * Reduce an error to a short, PII-safe string for the log. Strips anything that
 * looks like an email address, then truncates. Full detail stays in the server log.
 */
export function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  return raw
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[email]')
    .slice(0, 300)
}

/** A stable short error code from an error-like object (SES/SMTP set `code`). */
export function errorCodeOf(err: unknown): string {
  const e = err as { code?: unknown; responseCode?: unknown } | null
  if (e && typeof e.code === 'string') return e.code
  if (e && typeof e.responseCode === 'number') return `SMTP_${e.responseCode}`
  return 'ERROR'
}
