/*
 * Phase 2: bulk operations must show a scheduler exactly what they are about to
 * do, including who it affects and what it will refuse to touch, BEFORE it runs.
 */
import { describe, expect, it } from 'vitest'

import { invertChange, planBulk, type BulkTargetGame } from '../bulkOps'

const game = (over: Partial<BulkTargetGame> = {}): BulkTargetGame => ({
  id: 1,
  startAt: '2026-01-11T01:00:00.000Z', // 6:00 PM Sat Jan 10, Calgary
  status: 'scheduled',
  publishState: 'draft',
  homeTeamName: 'Excel U13 Boys Orange',
  awayTeamName: 'CoMBA BU13-1',
  homeTeamId: 10,
  awayTeamId: 11,
  venueName: 'Trico Centre',
  venueId: 20,
  divisionName: 'U13 Boys / A',
  ...over,
})

describe('planBulk publish and unpublish', () => {
  it('plans a publish and names the teams it affects', () => {
    const plan = planBulk('publish', [game(), game({ id: 2, homeTeamName: 'Okotoks GU13-2', awayTeamName: 'DMS U13' })])
    expect(plan.changes).toHaveLength(2)
    expect(plan.affectedTeams).toEqual(['CoMBA BU13-1', 'DMS U13', 'Excel U13 Boys Orange', 'Okotoks GU13-2'])
    expect(plan.headline).toContain('2 games will be put on the public site')
    expect(plan.headline).toContain('4 teams')
  })

  it('skips games that are already the way you are asking for, and says so', () => {
    const plan = planBulk('publish', [game({ publishState: 'published' })])
    expect(plan.changes).toHaveLength(0)
    expect(plan.skipped[0].skipped).toContain('Already on the public site')
    expect(plan.headline).toContain('Nothing would change')
  })

  it('publishes a finalized game, because publishing does not rewrite a result', () => {
    const plan = planBulk('publish', [game({ status: 'final' })])
    expect(plan.changes).toHaveLength(1)
  })
})

describe('planBulk refuses to quietly rewrite a result', () => {
  for (const action of ['cancel', 'postpone', 'move-date', 'move-venue'] as const) {
    it(`leaves a finalized game alone on ${action} and says why`, () => {
      const plan = planBulk(action, [game({ status: 'final' })], { newDate: '2026-02-01', newVenueId: 21, newVenueName: 'Glenmore' })
      expect(plan.changes).toHaveLength(0)
      expect(plan.skipped[0].skipped).toContain('already has a final result')
    })
  }

  it('leaves a forfeit alone too', () => {
    const plan = planBulk('cancel', [game({ status: 'forfeit' })])
    expect(plan.skipped).toHaveLength(1)
  })
})

describe('planBulk move-date keeps the time of day', () => {
  it('moves the date and keeps 6:00 PM at 6:00 PM', () => {
    const plan = planBulk('move-date', [game()], { newDate: '2026-01-17' })
    expect(plan.changes).toHaveLength(1)
    // 6:00 PM on Jan 17 in Calgary is 01:00 UTC on Jan 18.
    expect(plan.changes[0].patch?.startAt).toBe('2026-01-18T01:00:00.000Z')
    expect(plan.changes[0].summary).toContain('6:00 PM')
  })

  it('keeps the time correct across the daylight saving change', () => {
    // 6:00 PM MST in January, moved to July, must still be 6:00 PM MDT.
    const plan = planBulk('move-date', [game()], { newDate: '2026-07-11' })
    expect(plan.changes[0].patch?.startAt).toBe('2026-07-12T00:00:00.000Z')
  })

  it('refuses without a date and says what to do', () => {
    expect(planBulk('move-date', [game()]).error).toContain('Choose the new date first')
  })

  it('skips a game already on that date and time', () => {
    const plan = planBulk('move-date', [game()], { newDate: '2026-01-10' })
    expect(plan.skipped[0].skipped).toContain('Already on that date')
  })
})

describe('planBulk move-venue', () => {
  it('clears the court, because the old court is in the old building', () => {
    const plan = planBulk('move-venue', [game()], { newVenueId: 21, newVenueName: 'Glenmore Christian Academy' })
    expect(plan.changes[0].patch).toEqual({ venue: 21, court: null })
    expect(plan.changes[0].summary).toContain('from Trico Centre to Glenmore Christian Academy')
  })

  it('skips a game already at that venue', () => {
    const plan = planBulk('move-venue', [game()], { newVenueId: 20, newVenueName: 'Trico Centre' })
    expect(plan.skipped[0].skipped).toContain('Already at that venue')
  })
})

describe('planBulk guardrails', () => {
  it('refuses an empty selection with an instruction', () => {
    expect(planBulk('publish', []).error).toContain('Tick the games')
  })

  it('marks cancelling as the one to think twice about', () => {
    expect(planBulk('cancel', [game()]).irreversible).toBe(true)
    expect(planBulk('postpone', [game()]).irreversible).toBe(false)
    expect(planBulk('publish', [game()]).irreversible).toBe(false)
  })
})

describe('invertChange', () => {
  it('takes a publish back to draft', () => {
    const before = game({ publishState: 'draft' })
    const plan = planBulk('publish', [before])
    expect(invertChange(before, plan.changes[0]).publishState).toBe('draft')
  })

  it('puts a moved game back on its original date', () => {
    const before = game()
    const plan = planBulk('move-date', [before], { newDate: '2026-01-17' })
    expect(invertChange(before, plan.changes[0]).patch?.startAt).toBe(before.startAt)
  })

  it('puts a moved game back at its original venue', () => {
    const before = game()
    const plan = planBulk('move-venue', [before], { newVenueId: 21, newVenueName: 'Glenmore' })
    expect(invertChange(before, plan.changes[0]).patch).toEqual({ venue: 20, court: null })
  })

  it('restores the status a cancellation replaced', () => {
    const before = game({ status: 'scheduled' })
    const plan = planBulk('cancel', [before])
    expect(invertChange(before, plan.changes[0]).patch?.status).toBe('scheduled')
  })
})
