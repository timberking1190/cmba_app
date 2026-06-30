import { describe, expect, it } from 'vitest'

import { firstName, privacySafeName } from '../displayName'

describe('privacySafeName', () => {
  it('shows the full name for adults', () => {
    expect(privacySafeName({ fullName: 'Jordan Smith', isMinor: false })).toBe('Jordan Smith')
  })
  it('prefers the preferred name for adults', () => {
    expect(privacySafeName({ fullName: 'Jordan Smith', preferredName: 'Jay Smith', isMinor: false })).toBe('Jay Smith')
  })
  it('treats a missing isMinor flag as adult', () => {
    expect(privacySafeName({ fullName: 'Jordan Smith' })).toBe('Jordan Smith')
  })
  it('forces first name + last initial for minors', () => {
    expect(privacySafeName({ fullName: 'Jordan Smith', isMinor: true })).toBe('Jordan S.')
  })
  it('derives the minor name from the preferred name when present', () => {
    expect(privacySafeName({ fullName: 'Jordan Smith', preferredName: 'JJ Smith', isMinor: true })).toBe('JJ S.')
  })
  it('returns only the first name for a single-token minor name', () => {
    expect(privacySafeName({ preferredName: 'Jordan', isMinor: true })).toBe('Jordan')
  })
  it('uses a team handle for minors when provided', () => {
    expect(privacySafeName({ fullName: 'Jordan Smith', isMinor: true }, { teamHandle: 'Hawks #7' })).toBe('Hawks #7')
  })
  it('falls back to Player when a minor has no name', () => {
    expect(privacySafeName({ isMinor: true })).toBe('Player')
  })
})

describe('firstName', () => {
  it('takes the first token of the full name', () => {
    expect(firstName({ fullName: 'Jordan Smith' })).toBe('Jordan')
  })
  it('prefers the preferred name', () => {
    expect(firstName({ fullName: 'Jordan Smith', preferredName: 'JJ' })).toBe('JJ')
  })
  it('returns an empty string when no name is available', () => {
    expect(firstName({})).toBe('')
  })
})
