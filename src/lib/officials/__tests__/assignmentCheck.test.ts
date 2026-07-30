/*
 * REPRO + rules for item 6: "Blocked official 7: Could not assign."
 *
 * The reported failure was a single catch-all message plus a database id. Every
 * test here pins one specific, named reason, and asserts the official's name is
 * in the sentence and their id is not.
 */
import { describe, expect, it } from 'vitest'

import { evaluateAssignment, saveFailedOutcome, type AssignmentInput } from '../assignmentCheck'

const GAME = {
  id: 100,
  label: 'Sat Jan 10, 6:00 PM, Excel U13 Boys Orange vs CoMBA BU13-1',
  startAt: '2026-01-11T01:00:00.000Z',
  requiredRampLevel: 'none',
}

const base: AssignmentInput = {
  officialId: 7,
  officialName: 'Casey Morgan',
  active: true,
  rampLevel: 'level2',
  maxGamesPerDay: 4,
  game: GAME,
  existing: [],
  windowMinutes: 75,
}

const other = (label: string, startAt: string, gameId = 200) => ({ gameId, label, startAt })

describe('item 6 repro: every assignment failure has a specific, named reason', () => {
  it('never identifies the official by database id', () => {
    const outcomes = [
      evaluateAssignment({ ...base, active: false }),
      evaluateAssignment({ ...base, existing: [{ ...other('x', GAME.startAt, 100), isSameGame: true }] }),
      evaluateAssignment({ ...base, existing: [other('Sat Jan 10, 6:30 PM, Okotoks vs DMS', '2026-01-11T01:30:00.000Z')] }),
      evaluateAssignment({ ...base, maxGamesPerDay: 1, existing: [other('Sat Jan 10, 9:00 AM, A vs B', '2026-01-10T16:00:00.000Z')] }),
      evaluateAssignment({ ...base, rampLevel: 'level1', game: { ...GAME, requiredRampLevel: 'level3' } }),
      saveFailedOutcome(7, 'Casey Morgan'),
    ]
    for (const o of outcomes) {
      expect(o.message).toContain('Casey Morgan')
      expect(o.message).not.toMatch(/\bofficial 7\b/i)
      expect(o.message).not.toMatch(/Could not assign\.$/)
    }
  })

  it('names the overlapping game on a time conflict, and offers the override', () => {
    const o = evaluateAssignment({
      ...base,
      existing: [other('Sat Jan 10, 6:30 PM, Okotoks GU13-2 vs DMS U13', '2026-01-11T01:30:00.000Z')],
    })
    expect(o.severity).toBe('blocked')
    expect(o.reason).toBe('TIME_CONFLICT')
    expect(o.overridable).toBe(true)
    expect(o.message).toContain('Okotoks GU13-2 vs DMS U13')
  })

  it('lets an admin force through a time conflict but still says what was accepted', () => {
    const o = evaluateAssignment({
      ...base,
      force: true,
      existing: [other('Sat Jan 10, 6:30 PM, Okotoks GU13-2 vs DMS U13', '2026-01-11T01:30:00.000Z')],
    })
    expect(o.severity).toBe('warning')
    expect(o.message).toContain('Okotoks GU13-2 vs DMS U13')
  })

  it('does not call a non overlapping game on the same day a conflict', () => {
    const o = evaluateAssignment({ ...base, existing: [other('Sat Jan 10, 9:00 AM, A vs B', '2026-01-10T16:00:00.000Z')] })
    expect(o.severity).toBe('ok')
  })

  it('reports over the maximum games per day as a warning with the real numbers', () => {
    const o = evaluateAssignment({
      ...base,
      maxGamesPerDay: 2,
      existing: [other('9:00 AM game', '2026-01-10T16:00:00.000Z', 201), other('11:00 AM game', '2026-01-10T18:00:00.000Z', 202)],
    })
    expect(o.severity).toBe('warning')
    expect(o.reason).toBe('OVER_MAX_PER_DAY')
    expect(o.message).toContain('3 games')
    expect(o.message).toContain('maximum of 2')
  })

  it('reports a certification level below the division as a warning naming both levels', () => {
    const o = evaluateAssignment({ ...base, rampLevel: 'level1', game: { ...GAME, requiredRampLevel: 'level3' } })
    expect(o.severity).toBe('warning')
    expect(o.reason).toBe('RAMP_BELOW_DIVISION')
    expect(o.message).toContain('level 1')
    expect(o.message).toContain('level 3')
  })

  it('blocks an official already on this game and says how to change their role', () => {
    const o = evaluateAssignment({ ...base, existing: [{ ...other('this game', GAME.startAt, 100), isSameGame: true }] })
    expect(o.severity).toBe('blocked')
    expect(o.reason).toBe('ALREADY_ASSIGNED')
    expect(o.message).toContain('Remove the existing assignment')
  })

  it('blocks an inactive official and says what unlocks it', () => {
    const o = evaluateAssignment({ ...base, active: false })
    expect(o.severity).toBe('blocked')
    expect(o.reason).toBe('OFFICIAL_INACTIVE')
    expect(o.message).toContain('Set them active')
  })

  it('separates a save failure from a rule failure', () => {
    const o = saveFailedOutcome(7, 'Casey Morgan')
    expect(o.reason).toBe('SAVE_FAILED')
    expect(o.message).toContain('Nothing was changed')
  })

  it('assigns cleanly when nothing is wrong', () => {
    expect(evaluateAssignment(base).severity).toBe('ok')
  })
})
