import { describe, expect, it } from 'vitest'

import { computeStreakFromDays, dayKey } from '../gamification/streaks'

describe('dayKey', () => {
  it('returns the UTC date portion', () => {
    expect(dayKey('2026-06-30T23:30:00.000Z')).toBe('2026-06-30')
  })
})

describe('computeStreakFromDays', () => {
  it('returns zeros for no activity', () => {
    expect(computeStreakFromDays([], '2026-06-30')).toEqual({ currentStreakDays: 0, longestStreakDays: 0, lastActiveDay: null })
  })

  it('counts a current run ending today', () => {
    const r = computeStreakFromDays(['2026-06-28', '2026-06-29', '2026-06-30'], '2026-06-30')
    expect(r.currentStreakDays).toBe(3)
    expect(r.longestStreakDays).toBe(3)
    expect(r.lastActiveDay).toBe('2026-06-30')
  })

  it('counts a current run ending yesterday (still alive)', () => {
    const r = computeStreakFromDays(['2026-06-28', '2026-06-29'], '2026-06-30')
    expect(r.currentStreakDays).toBe(2)
  })

  it('treats a gap before today as a broken streak (current 0) but keeps longest', () => {
    const r = computeStreakFromDays(['2026-06-20', '2026-06-21', '2026-06-22'], '2026-06-30')
    expect(r.currentStreakDays).toBe(0)
    expect(r.longestStreakDays).toBe(3)
    expect(r.lastActiveDay).toBe('2026-06-22')
  })

  it('ignores duplicate days and finds the longest historical run', () => {
    const r = computeStreakFromDays(
      ['2026-06-01', '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-10', '2026-06-29', '2026-06-30'],
      '2026-06-30',
    )
    expect(r.longestStreakDays).toBe(4) // Jun 1-4
    expect(r.currentStreakDays).toBe(2) // Jun 29-30
  })

  it('handles a single active day today', () => {
    expect(computeStreakFromDays(['2026-06-30'], '2026-06-30')).toMatchObject({ currentStreakDays: 1, longestStreakDays: 1 })
  })

  it('handles a month boundary correctly', () => {
    const r = computeStreakFromDays(['2026-05-31', '2026-06-01', '2026-06-02'], '2026-06-02')
    expect(r.currentStreakDays).toBe(3)
  })
})
