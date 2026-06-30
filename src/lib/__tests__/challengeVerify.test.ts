import { describe, expect, it } from 'vitest'

import { canVerifyChallenge } from '../gamification/challengeVerify'

describe('canVerifyChallenge', () => {
  it('an admin can verify any submission (even with no team)', () => {
    expect(canVerifyChallenge({ isAdmin: true, submissionTeamId: null, coachTeamIds: [] })).toBe(true)
    expect(canVerifyChallenge({ isAdmin: true, submissionTeamId: 7, coachTeamIds: [] })).toBe(true)
  })

  it('a verified coach of the submission team can verify', () => {
    expect(canVerifyChallenge({ isAdmin: false, submissionTeamId: 7, coachTeamIds: [3, 7, 9] })).toBe(true)
  })

  it('a coach of a DIFFERENT team cannot verify', () => {
    expect(canVerifyChallenge({ isAdmin: false, submissionTeamId: 7, coachTeamIds: [3, 9] })).toBe(false)
  })

  it('a non-admin cannot verify a submission with no team', () => {
    expect(canVerifyChallenge({ isAdmin: false, submissionTeamId: null, coachTeamIds: [3, 7] })).toBe(false)
    expect(canVerifyChallenge({ isAdmin: false, submissionTeamId: undefined, coachTeamIds: [3, 7] })).toBe(false)
  })

  it('matches team ids across string/number types', () => {
    expect(canVerifyChallenge({ isAdmin: false, submissionTeamId: '7', coachTeamIds: [7] })).toBe(true)
    expect(canVerifyChallenge({ isAdmin: false, submissionTeamId: 7, coachTeamIds: ['7'] })).toBe(true)
  })

  it('a coach with no verified coach teams cannot verify', () => {
    expect(canVerifyChallenge({ isAdmin: false, submissionTeamId: 7, coachTeamIds: [] })).toBe(false)
  })
})
