import { describe, expect, it } from 'vitest'

import { reminderBucketFor } from '../reminders'

const NOW = new Date('2026-06-18T12:00:00Z')
const DAY = 86400000
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY).toISOString()

describe('reminderBucketFor', () => {
  it('fires at exactly 60 / 30 / 7 days', () => {
    expect(reminderBucketFor(inDays(60), NOW)).toBe('60')
    expect(reminderBucketFor(inDays(30), NOW)).toBe('30')
    expect(reminderBucketFor(inDays(7), NOW)).toBe('7')
  })
  it('fires "lapsed" on the day of expiry', () => {
    expect(reminderBucketFor(new Date(NOW.getTime() + 3 * 3600000).toISOString(), NOW)).toBe('lapsed')
  })
  it('does not fire on off-threshold days (no daily spam)', () => {
    expect(reminderBucketFor(inDays(45), NOW)).toBeNull()
    expect(reminderBucketFor(inDays(8), NOW)).toBeNull()
    expect(reminderBucketFor(inDays(90), NOW)).toBeNull()
  })
  it('does not fire for already-lapsed (handled once at lapse)', () => {
    expect(reminderBucketFor(inDays(-5), NOW)).toBeNull()
  })
  it('returns null with no expiry', () => {
    expect(reminderBucketFor(null, NOW)).toBeNull()
  })
})
