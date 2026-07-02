import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  categoryFromSubject,
  errorCodeOf,
  hashRecipient,
  normalizeRecipients,
  recipientCount,
  recipientDomain,
  resolveCategory,
  sanitizeErrorMessage,
} from '../email/meta'
import { computeEmailHealth, type HealthPayload } from '../email/health'

describe('email meta helpers', () => {
  it('normalizes string, comma list, array, and object recipients', () => {
    expect(normalizeRecipients('A@Example.com')).toEqual(['a@example.com'])
    expect(normalizeRecipients('a@x.com, b@y.com')).toEqual(['a@x.com', 'b@y.com'])
    expect(normalizeRecipients(['A@X.com', { address: 'B@Y.com' }])).toEqual(['a@x.com', 'b@y.com'])
    expect(normalizeRecipients(null)).toEqual([])
    expect(recipientCount('a@x.com, b@y.com')).toBe(2)
  })

  it('hashes the first recipient deterministically and salts it', () => {
    const h1 = hashRecipient('user@example.com', 'salt-a')
    const h2 = hashRecipient('user@example.com', 'salt-a')
    const h3 = hashRecipient('user@example.com', 'salt-b')
    expect(h1).toBe(h2)
    expect(h1).not.toBe(h3)
    expect(h1).not.toContain('user@example.com')
    expect(hashRecipient('', 'salt')).toBe('')
  })

  it('extracts the bare recipient domain', () => {
    expect(recipientDomain('user@gmail.com')).toBe('gmail.com')
    expect(recipientDomain('nope')).toBe('unknown')
    expect(recipientDomain(undefined)).toBe('unknown')
  })

  it('infers a category from the subject as a fallback', () => {
    expect(categoryFromSubject('Reset your password')).toBe('password_reset')
    expect(categoryFromSubject('Confirm your email address')).toBe('verify')
    expect(categoryFromSubject('Your one-time code')).toBe('email_otp')
    expect(categoryFromSubject('CMBA Connect email test')).toBe('test')
    expect(categoryFromSubject('A game on your schedule has changed')).toBe('other')
    expect(categoryFromSubject('')).toBe('other')
  })

  it('prefers a valid category header over subject inference', () => {
    expect(resolveCategory('weekly_digest', 'anything')).toBe('weekly_digest')
    expect(resolveCategory('WEEKLY_DIGEST', 'anything')).toBe('weekly_digest')
    expect(resolveCategory('bogus', 'Reset your password')).toBe('password_reset')
    expect(resolveCategory(undefined, 'A game on your schedule has changed')).toBe('other')
  })

  it('sanitizes error text (no addresses) and derives a code', () => {
    const msg = sanitizeErrorMessage(new Error('550 mailbox user@secret.com rejected'))
    expect(msg).not.toContain('user@secret.com')
    expect(msg).toContain('[email]')
    expect(sanitizeErrorMessage('x'.repeat(500)).length).toBe(300)
    expect(errorCodeOf({ code: 'EAUTH' })).toBe('EAUTH')
    expect(errorCodeOf({ responseCode: 554 })).toBe('SMTP_554')
    expect(errorCodeOf(new Error('boom'))).toBe('ERROR')
  })
})

// A fake payload that returns fixed counts by the status in the where clause.
function fakePayload(counts: { sent: number; failed: number }, failures: Array<Record<string, unknown>> = []): HealthPayload {
  const statusOf = (where: unknown): string => {
    const and = (where as { and?: Array<{ status?: { equals?: string } }> })?.and
    return and?.find((c) => c.status?.equals)?.status?.equals ?? ''
  }
  return {
    count: async ({ where }) => ({ totalDocs: statusOf(where) === 'failed' ? counts.failed : counts.sent }),
    find: async () => ({ docs: failures }),
  }
}

describe('computeEmailHealth', () => {
  const OLD = process.env.SES_SMTP_HOST
  beforeEach(() => {
    process.env.SES_SMTP_HOST = 'email-smtp.ca-central-1.amazonaws.com'
  })
  afterEach(() => {
    if (OLD === undefined) delete process.env.SES_SMTP_HOST
    else process.env.SES_SMTP_HOST = OLD
  })

  it('reports configured SES transport and a healthy window', async () => {
    const health = await computeEmailHealth(fakePayload({ sent: 10, failed: 0 }))
    expect(health.configured).toBe(true)
    expect(health.transport).toBe('ses')
    expect(health.windows.last24h.failureRate).toBe(0)
    expect(health.alert).toBe(false)
    expect(health.warnings).toHaveLength(0)
  })

  it('raises an alert on an elevated failure rate and maps recent failures', async () => {
    const failures = [{ category: 'password_reset', recipientDomain: 'gmail.com', errorCode: 'EAUTH', sentAt: '2026-07-01T00:00:00.000Z' }]
    const health = await computeEmailHealth(fakePayload({ sent: 6, failed: 4 }, failures))
    expect(health.windows.last24h.total).toBe(10)
    expect(health.windows.last24h.failureRate).toBeCloseTo(0.4)
    expect(health.alert).toBe(true)
    expect(health.warnings.length).toBeGreaterThan(0)
    expect(health.recentFailures[0]).toMatchObject({ category: 'password_reset', errorCode: 'EAUTH' })
  })
})
