import { describe, expect, it } from 'vitest'

import { addMonths, computeCertStatus, daysUntil, EXPIRING_WINDOW_DAYS } from '../certStatus'
import { isUnder18 } from '../age'

const NOW = new Date('2026-06-18T12:00:00Z')

describe('computeCertStatus', () => {
  it('is pending-verification when not verified', () => {
    expect(computeCertStatus({ verifiedAt: null, expiryDate: '2030-01-01' }, NOW)).toBe('pending-verification')
  })

  it('is valid when verified with no expiry', () => {
    expect(computeCertStatus({ verifiedAt: '2026-01-01', expiryDate: null }, NOW)).toBe('valid')
  })

  it('is valid when verified and far from expiry', () => {
    expect(computeCertStatus({ verifiedAt: '2026-01-01', expiryDate: '2027-01-01' }, NOW)).toBe('valid')
  })

  it('is expiring within the 60-day window', () => {
    const exp = new Date(NOW.getTime() + (EXPIRING_WINDOW_DAYS - 5) * 86400000).toISOString()
    expect(computeCertStatus({ verifiedAt: '2026-01-01', expiryDate: exp }, NOW)).toBe('expiring')
  })

  it('is expired once past the expiry date', () => {
    expect(computeCertStatus({ verifiedAt: '2026-01-01', expiryDate: '2026-06-01' }, NOW)).toBe('expired')
  })

  it('transitions valid -> expiring -> expired as time passes', () => {
    const expiry = '2026-08-01'
    expect(computeCertStatus({ verifiedAt: '2026-01-01', expiryDate: expiry }, new Date('2026-01-01'))).toBe('valid')
    expect(computeCertStatus({ verifiedAt: '2026-01-01', expiryDate: expiry }, new Date('2026-07-01'))).toBe('expiring')
    expect(computeCertStatus({ verifiedAt: '2026-01-01', expiryDate: expiry }, new Date('2026-09-01'))).toBe('expired')
  })
})

describe('addMonths', () => {
  it('adds validity months to an issue date', () => {
    expect(addMonths('2026-01-15', 12)?.slice(0, 10)).toBe('2027-01-15')
  })
  it('returns null without months or date', () => {
    expect(addMonths('2026-01-15', null)).toBeNull()
    expect(addMonths(null, 12)).toBeNull()
  })
})

describe('daysUntil', () => {
  it('is positive before expiry, negative after', () => {
    expect(daysUntil('2026-06-28', NOW)).toBe(9)
    expect(daysUntil('2026-06-08', NOW)).toBeLessThan(0)
  })
  it('is null with no expiry', () => {
    expect(daysUntil(null, NOW)).toBeNull()
  })
})

describe('isUnder18 (guardian-flow age gate)', () => {
  it('treats a 10-year-old as a minor', () => {
    expect(isUnder18('2015-06-18', NOW)).toBe(true)
  })
  it('treats an adult as not a minor', () => {
    expect(isUnder18('1990-01-01', NOW)).toBe(false)
  })
  it('handles the 18th-birthday boundary (exactly 18 = adult)', () => {
    expect(isUnder18('2008-06-18', NOW)).toBe(false) // turns 18 today
    expect(isUnder18('2008-06-19', NOW)).toBe(true) // 18 tomorrow -> still 17
  })
})
