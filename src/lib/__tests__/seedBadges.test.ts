import { describe, expect, it } from 'vitest'

import { COACH_BADGES, REF_BADGES } from '../gamification'
import { buildBadgeSeeds } from '../gamification/seedBadges'

describe('buildBadgeSeeds', () => {
  const seeds = buildBadgeSeeds()

  it('projects every legacy coach and ref badge', () => {
    expect(seeds).toHaveLength(COACH_BADGES.length + REF_BADGES.length)
  })

  it('produces unique slugs', () => {
    const slugs = seeds.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('produces unique externalIds for idempotent upsert', () => {
    const ids = seeds.map((s) => s.externalId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('seed:'))).toBe(true)
  })

  it('tags coach badges with the coach audience and ref badges with official', () => {
    const coach = seeds.filter((s) => s.slug.startsWith('first-whistle'))[0]
    expect(coach.audience).toEqual(['coach'])
    const ref = seeds.filter((s) => s.slug === 'first-call')[0]
    expect(ref.audience).toEqual(['official'])
  })

  it('marks streak badges fun-only (no verification) and pathway badges verified', () => {
    const warrior = seeds.find((s) => s.slug === 'week-warrior')
    expect(warrior?.earnKind).toBe('streak_threshold')
    expect(warrior?.verificationRequired).toBe(false)

    const firstWhistle = seeds.find((s) => s.slug === 'first-whistle')
    expect(firstWhistle?.earnKind).toBe('pathway_stage')
    expect(firstWhistle?.verificationRequired).toBe(true)
  })

  it('gives streak badges their day threshold so they never award at zero', () => {
    expect(seeds.find((s) => s.slug === 'week-warrior')?.earnConfig?.threshold).toBe(7)
    expect(seeds.find((s) => s.slug === 'month-streak')?.earnConfig?.threshold).toBe(30)
    expect(seeds.find((s) => s.slug === 'week-warrior-ref')?.earnConfig?.threshold).toBe(7)
    expect(seeds.find((s) => s.slug === 'month-streak-ref')?.earnConfig?.threshold).toBe(30)
    // every streak badge has a positive threshold
    for (const s of seeds.filter((x) => x.earnKind === 'streak_threshold')) {
      expect(s.earnConfig?.threshold ?? 0).toBeGreaterThan(0)
    }
  })

  it('leaves pathway badges without an earnConfig threshold (engine ignores them)', () => {
    expect(seeds.find((s) => s.slug === 'first-whistle')?.earnConfig).toBeUndefined()
  })

  it('carries the icon and description through unchanged', () => {
    const src = COACH_BADGES[0]
    const seed = seeds.find((s) => s.slug === src.id)
    expect(seed?.icon).toBe(src.icon)
    expect(seed?.name).toBe(src.name)
    expect(seed?.description).toBe(src.description)
  })
})
