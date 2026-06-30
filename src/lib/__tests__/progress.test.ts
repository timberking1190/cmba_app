import { describe, expect, it } from 'vitest'

import { COACH_BADGES, REF_BADGES, getLevelForXP, type Badge } from '../gamification'
import { dedupeBadgesById, summarizeProgress } from '../gamification/progress'

describe('summarizeProgress', () => {
  it('maps XP onto the level ladder', () => {
    const lvl = getLevelForXP(600)
    const p = summarizeProgress({ completedStages: 0, xp: 600, audience: 'coach' })
    expect(p.xp).toBe(600)
    expect(p.level).toBe(lvl.level)
    expect(p.levelTitle).toBe(lvl.title)
    expect(p.nextLevelXp).toBe(lvl.nextLevelXp)
    expect(p.progress).toBe(lvl.progress)
  })

  it('awards coach badges positionally by completed stages', () => {
    const p = summarizeProgress({ completedStages: 3, xp: 0, audience: 'coach' })
    expect(p.earnedBadges).toEqual(COACH_BADGES.slice(0, 3))
    expect(p.lockedBadges).toEqual(COACH_BADGES.slice(3))
  })

  it('uses the referee badge set for officials', () => {
    const p = summarizeProgress({ completedStages: 2, xp: 0, audience: 'official' })
    expect(p.earnedBadges).toEqual(REF_BADGES.slice(0, 2))
  })

  it('defaults to the coach badge set when audience is undefined', () => {
    const p = summarizeProgress({ completedStages: 1, xp: 0 })
    expect(p.earnedBadges).toEqual(COACH_BADGES.slice(0, 1))
  })

  it('clamps earned badges to the badge set size', () => {
    const p = summarizeProgress({ completedStages: 999, xp: 0, audience: 'coach' })
    expect(p.earnedBadges).toHaveLength(COACH_BADGES.length)
    expect(p.lockedBadges).toHaveLength(0)
    expect(p.completedStages).toBe(999)
  })
})

describe('dedupeBadgesById', () => {
  const b = (id: string): Badge => ({ id, name: id, icon: '', description: '' })

  it('keeps first occurrence and drops later duplicates', () => {
    const out = dedupeBadgesById([b('first-whistle'), b('safe-sport'), b('first-whistle')])
    expect(out.map((x) => x.id)).toEqual(['first-whistle', 'safe-sport'])
  })

  it('is a no-op for already-unique lists', () => {
    const input = [b('a'), b('b'), b('c')]
    expect(dedupeBadgesById(input).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('handles an empty list', () => {
    expect(dedupeBadgesById([])).toEqual([])
  })
})
