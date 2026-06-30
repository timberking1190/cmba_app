import { describe, expect, it } from 'vitest'

import { AUDIENCES, eligibleAudiences, pathwayAudienceFor, primaryAudience } from '../audience'

describe('pathwayAudienceFor', () => {
  it('returns coach for a coach', () => {
    expect(pathwayAudienceFor(['participant', 'coach'])).toBe('coach')
  })
  it('prefers coach over official when the user is both', () => {
    expect(pathwayAudienceFor(['official', 'coach'])).toBe('coach')
  })
  it('returns official for an official', () => {
    expect(pathwayAudienceFor(['official'])).toBe('official')
  })
  it('returns undefined for a plain participant', () => {
    expect(pathwayAudienceFor(['participant'])).toBeUndefined()
  })
  it('handles null/undefined roles', () => {
    expect(pathwayAudienceFor(null)).toBeUndefined()
    expect(pathwayAudienceFor(undefined)).toBeUndefined()
  })
})

describe('primaryAudience', () => {
  it('coach wins over official', () => {
    expect(primaryAudience(['official', 'coach'])).toBe('coach')
  })
  it('official next', () => {
    expect(primaryAudience(['official'])).toBe('official')
  })
  it('defaults a participant to athlete', () => {
    expect(primaryAudience(['participant'])).toBe('athlete')
  })
  it('defaults null/undefined roles to athlete', () => {
    expect(primaryAudience(null)).toBe('athlete')
    expect(primaryAudience(undefined)).toBe('athlete')
  })
})

describe('eligibleAudiences', () => {
  it('grants coach and official to a dual-role user', () => {
    expect(eligibleAudiences(['coach', 'official'])).toEqual(['coach', 'official'])
  })
  it('grants only coach to a coach', () => {
    expect(eligibleAudiences(['coach'])).toEqual(['coach'])
  })
  it('defaults a participant to athlete', () => {
    expect(eligibleAudiences(['participant'])).toEqual(['athlete'])
  })
  it('defaults empty/null roles to athlete', () => {
    expect(eligibleAudiences([])).toEqual(['athlete'])
    expect(eligibleAudiences(null)).toEqual(['athlete'])
  })
})

describe('AUDIENCES', () => {
  it('lists the four audiences in order', () => {
    expect(AUDIENCES.map((a) => a.value)).toEqual(['athlete', 'coach', 'official', 'parent'])
  })
})
