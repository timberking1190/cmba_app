import { describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

import { awardXp, deriveXpStats, isBadgeEarned, type BadgeEarnContext } from '../gamification/engine'

describe('deriveXpStats', () => {
  it('sums total and verified XP and counts verified events by kind', () => {
    const stats = deriveXpStats([
      { amount: 100, verified: true, kind: 'challenge' },
      { amount: 50, verified: false, kind: 'challenge' },
      { amount: 30, verified: true, kind: 'quiz' },
      { amount: 20, verified: true, kind: 'challenge' },
    ])
    expect(stats.totalXp).toBe(200)
    expect(stats.verifiedXp).toBe(150)
    expect(stats.verifiedCountByKind).toEqual({ challenge: 2, quiz: 1 })
  })

  it('treats missing amount/verified as zero/false', () => {
    const stats = deriveXpStats([{ kind: 'login' }, { amount: 10, kind: 'login' }])
    expect(stats.totalXp).toBe(10)
    expect(stats.verifiedXp).toBe(0)
    expect(stats.verifiedCountByKind).toEqual({})
  })

  it('returns zeros for no events', () => {
    expect(deriveXpStats([])).toEqual({ totalXp: 0, verifiedXp: 0, verifiedCountByKind: {} })
  })
})

const ctx = (over: Partial<BadgeEarnContext> = {}): BadgeEarnContext => ({
  totalXp: 0,
  verifiedXp: 0,
  verifiedCountByKind: {},
  currentStreakDays: 0,
  ...over,
})

describe('isBadgeEarned', () => {
  it('xp_threshold uses total XP when verification is not required', () => {
    const badge = { earnKind: 'xp_threshold' as const, earnConfig: { threshold: 200 }, verificationRequired: false }
    expect(isBadgeEarned(badge, ctx({ totalXp: 200, verifiedXp: 0 }))).toBe(true)
    expect(isBadgeEarned(badge, ctx({ totalXp: 199 }))).toBe(false)
  })

  it('xp_threshold uses VERIFIED XP when verification is required', () => {
    const badge = { earnKind: 'xp_threshold' as const, earnConfig: { threshold: 200 }, verificationRequired: true }
    // 500 total but only 100 verified -> not earned
    expect(isBadgeEarned(badge, ctx({ totalXp: 500, verifiedXp: 100 }))).toBe(false)
    expect(isBadgeEarned(badge, ctx({ totalXp: 500, verifiedXp: 200 }))).toBe(true)
  })

  it('streak_threshold compares the current streak', () => {
    const badge = { earnKind: 'streak_threshold' as const, earnConfig: { threshold: 7 }, verificationRequired: false }
    expect(isBadgeEarned(badge, ctx({ currentStreakDays: 7 }))).toBe(true)
    expect(isBadgeEarned(badge, ctx({ currentStreakDays: 6 }))).toBe(false)
  })

  it('verified_count compares the verified count for the configured source key', () => {
    const badge = { earnKind: 'verified_count' as const, earnConfig: { threshold: 3, sourceKey: 'challenge' }, verificationRequired: true }
    expect(isBadgeEarned(badge, ctx({ verifiedCountByKind: { challenge: 3 } }))).toBe(true)
    expect(isBadgeEarned(badge, ctx({ verifiedCountByKind: { challenge: 2, quiz: 9 } }))).toBe(false)
  })

  it('does not auto-evaluate pathway_stage / recognition / manual badges', () => {
    for (const earnKind of ['pathway_stage', 'recognition', 'manual'] as const) {
      expect(isBadgeEarned({ earnKind, earnConfig: { threshold: 0 }, verificationRequired: false }, ctx({ totalXp: 9999 }))).toBe(false)
    }
  })

  it('treats a missing threshold as 0 (earned)', () => {
    const badge = { earnKind: 'xp_threshold' as const, earnConfig: {}, verificationRequired: false }
    expect(isBadgeEarned(badge, ctx({ totalXp: 0 }))).toBe(true)
  })
})

describe('awardXp trust invariant', () => {
  // A payload whose create() must never be reached: the invariant is checked first.
  const guardPayload = { create: () => { throw new Error('create should not be reached') } } as unknown as Payload

  it('rejects a verified event marked fun_only', async () => {
    await expect(
      awardXp(guardPayload, { user: 1, kind: 'challenge', amount: 10, verified: true, counts: 'fun_only', dedupeKey: 'k1' }),
    ).rejects.toThrow(/contradicts/)
  })

  it('rejects a meaningful event that is not verified', async () => {
    await expect(
      awardXp(guardPayload, { user: 1, kind: 'challenge', amount: 10, verified: false, counts: 'meaningful', dedupeKey: 'k2' }),
    ).rejects.toThrow(/contradicts/)
  })
})
