import { describe, expect, it } from 'vitest'

import {
  canTransition,
  checkActorMayConfirm,
  checkActorMayReport,
  effectsOf,
  isFinalized,
  nextStatusForReport,
  type Actor,
} from '../gameStateMachine'

const rep: Actor = { isAdmin: false, isSuperAdmin: false, isVerifiedRepOfGame: true }
const stranger: Actor = { isAdmin: false, isSuperAdmin: false, isVerifiedRepOfGame: false }
const clubAdmin: Actor = { isAdmin: true, isSuperAdmin: false, isVerifiedRepOfGame: false }
const superAdmin: Actor = { isAdmin: true, isSuperAdmin: true, isVerifiedRepOfGame: false }

describe('canTransition', () => {
  it('lets a verified rep report a scheduled game but not a stranger', () => {
    expect(canTransition('scheduled', 'reported', rep)).toBe(true)
    expect(canTransition('scheduled', 'reported', stranger)).toBe(false)
  })

  it('lets a rep confirm reported to final and dispute to contested', () => {
    expect(canTransition('reported', 'final', rep)).toBe(true)
    expect(canTransition('reported', 'contested', rep)).toBe(true)
  })

  it('only an admin moves contested to final', () => {
    expect(canTransition('contested', 'final', rep)).toBe(false)
    expect(canTransition('contested', 'final', clubAdmin)).toBe(true)
  })

  it('only an admin postpones, cancels, or forfeits', () => {
    expect(canTransition('scheduled', 'postponed', rep)).toBe(false)
    expect(canTransition('scheduled', 'cancelled', clubAdmin)).toBe(true)
    expect(canTransition('scheduled', 'forfeit', clubAdmin)).toBe(true)
  })

  it('a finalized game can only be edited by a super admin', () => {
    expect(canTransition('final', 'contested', clubAdmin)).toBe(false)
    expect(canTransition('final', 'contested', superAdmin)).toBe(true)
    expect(canTransition('forfeit', 'cancelled', clubAdmin)).toBe(false)
    expect(canTransition('forfeit', 'cancelled', superAdmin)).toBe(true)
  })

  it('never allows a no-op transition', () => {
    expect(canTransition('final', 'final', superAdmin)).toBe(false)
    expect(canTransition('scheduled', 'scheduled', clubAdmin)).toBe(false)
  })
})

describe('isFinalized and effectsOf', () => {
  it('marks final and forfeit as finalized', () => {
    expect(isFinalized('final')).toBe(true)
    expect(isFinalized('forfeit')).toBe(true)
    expect(isFinalized('reported')).toBe(false)
  })

  it('recomputes when ENTERING the final set', () => {
    expect(effectsOf('reported', 'final').recompute).toBe(true)
    expect(effectsOf('contested', 'forfeit').recompute).toBe(true)
  })

  it('recomputes when LEAVING the final set (un-finalize removes the game)', () => {
    expect(effectsOf('final', 'cancelled').recompute).toBe(true)
    expect(effectsOf('forfeit', 'postponed').recompute).toBe(true)
    expect(effectsOf('final', 'contested').recompute).toBe(true)
  })

  it('does not recompute for non-final transitions', () => {
    expect(effectsOf('scheduled', 'reported').recompute).toBe(false)
    expect(effectsOf('reported', 'contested').recompute).toBe(false)
  })

  it('flags a contested transition for escalation', () => {
    expect(effectsOf('reported', 'contested').escalateContested).toBe(true)
    expect(effectsOf('reported', 'final').escalateContested).toBe(false)
  })
})

describe('nextStatusForReport (dual entry)', () => {
  const home = { submittedForTeamId: 1, homeScore: 50, awayScore: 48 }
  const awayMatch = { submittedForTeamId: 2, homeScore: 50, awayScore: 48 }
  const awayMismatch = { submittedForTeamId: 2, homeScore: 51, awayScore: 48 }

  it('stays reported when only one side has reported', () => {
    expect(nextStatusForReport([], home)).toBe('reported')
  })
  it('auto-finals when both sides match', () => {
    expect(nextStatusForReport([home], awayMatch)).toBe('final')
  })
  it('goes contested when both sides disagree', () => {
    expect(nextStatusForReport([home], awayMismatch)).toBe('contested')
  })
  it('does not match a second report from the SAME side', () => {
    const homeAgain = { submittedForTeamId: 1, homeScore: 50, awayScore: 48 }
    expect(nextStatusForReport([home], homeAgain)).toBe('reported')
  })
})

describe('checkActorMayReport', () => {
  it('allows a verified rep of a team in the game', () => {
    expect(checkActorMayReport({ verifiedTeamIds: [1], homeTeamId: 1, awayTeamId: 2, submittedForTeamId: 1 }).ok).toBe(true)
  })
  it('rejects reporting for a team not in the game', () => {
    expect(checkActorMayReport({ verifiedTeamIds: [9], homeTeamId: 1, awayTeamId: 2, submittedForTeamId: 9 }).ok).toBe(false)
  })
  it('rejects a non-rep reporting for a team in the game', () => {
    expect(checkActorMayReport({ verifiedTeamIds: [2], homeTeamId: 1, awayTeamId: 2, submittedForTeamId: 1 }).ok).toBe(false)
  })
})

describe('checkActorMayConfirm', () => {
  const base = { homeTeamId: 1, awayTeamId: 2, reportSubmittedForTeamId: 1, reportSubmittedById: 100 }

  it('allows the opposing-team rep who did not file the report', () => {
    const r = checkActorMayConfirm({ ...base, verifiedTeamIds: [2], confirmingUserId: 200 })
    expect(r.ok).toBe(true)
  })
  it('blocks the original reporter from confirming their own report', () => {
    const r = checkActorMayConfirm({ ...base, verifiedTeamIds: [2], confirmingUserId: 100 })
    expect(r.ok).toBe(false)
  })
  it('blocks a rep who only holds the SAME side as the report', () => {
    const r = checkActorMayConfirm({ ...base, verifiedTeamIds: [1], confirmingUserId: 200 })
    expect(r.ok).toBe(false)
  })
  it('routes a dual-membership user (reps both teams) to an admin', () => {
    const r = checkActorMayConfirm({ ...base, verifiedTeamIds: [1, 2], confirmingUserId: 200 })
    expect(r.ok).toBe(false)
  })
})
