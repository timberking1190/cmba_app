/*
 * Phase 1: what a bracket does when a game finals, forfeits, ties, or is
 * contested. These are the rules the brief asked to be defined and implemented.
 */
import { describe, expect, it } from 'vitest'

import { byeWinner, decideSeriesWinner, isBye, isPlayable, roundName, type BracketGameLike } from '../advance'

const HOME = 10
const AWAY = 11
const base: BracketGameLike = { status: 'scheduled', homeTeamId: HOME, awayTeamId: AWAY }

describe('decideSeriesWinner', () => {
  it('advances the higher score on a final', () => {
    const d = decideSeriesWinner({ ...base, status: 'final', homeScore: 60, awayScore: 52 })
    expect(d).toEqual({ kind: 'advance', winnerTeamId: HOME, because: 'They won the game.' })
  })

  it('advances the away team when they win', () => {
    const d = decideSeriesWinner({ ...base, status: 'final', homeScore: 40, awayScore: 55 })
    expect(d.kind === 'advance' && d.winnerTeamId).toBe(AWAY)
  })

  it('holds a tie, because a playoff game cannot end tied', () => {
    const d = decideSeriesWinner({ ...base, status: 'final', homeScore: 50, awayScore: 50 })
    expect(d.kind).toBe('hold')
    expect(d.because).toContain('cannot end tied')
  })

  it('holds a final with no score and says to add one', () => {
    const d = decideSeriesWinner({ ...base, status: 'final' })
    expect(d.kind).toBe('hold')
    expect(d.because).toContain('Add the score')
  })

  it('advances the team that did not forfeit', () => {
    const d = decideSeriesWinner({ ...base, status: 'forfeit', forfeit: { outcome: 'home_forfeit', forfeitingTeam: HOME } })
    expect(d.kind === 'advance' && d.winnerTeamId).toBe(AWAY)
  })

  it('advances the home team when the away team forfeits', () => {
    const d = decideSeriesWinner({ ...base, status: 'forfeit', forfeit: { outcome: 'away_forfeit', forfeitingTeam: AWAY } })
    expect(d.kind === 'advance' && d.winnerTeamId).toBe(HOME)
  })

  it('advances nobody on a double forfeit, and says a person must decide', () => {
    const d = decideSeriesWinner({ ...base, status: 'forfeit', forfeit: { outcome: 'double_forfeit', forfeitingTeam: null } })
    expect(d.kind).toBe('retract')
    expect(d.because).toContain('by hand')
  })

  it('advances nobody on a no contest', () => {
    const d = decideSeriesWinner({ ...base, status: 'forfeit', forfeit: { outcome: 'no_contest', forfeitingTeam: null } })
    expect(d.kind).toBe('retract')
    expect(d.because).toContain('by hand')
  })

  it('holds a forfeit that does not say who forfeited, and says how to fix it', () => {
    const d = decideSeriesWinner({ ...base, status: 'forfeit', forfeit: { outcome: 'home_forfeit', forfeitingTeam: null } })
    expect(d.kind).toBe('hold')
    expect(d.because).toContain('record who forfeited')
  })

  it('retracts an advancement while a result is contested', () => {
    const d = decideSeriesWinner({ ...base, status: 'contested', homeScore: 60, awayScore: 52 })
    expect(d.kind).toBe('retract')
    expect(d.because).toContain('contested')
  })

  it('retracts when a bracket game is cancelled or postponed', () => {
    expect(decideSeriesWinner({ ...base, status: 'cancelled' }).kind).toBe('retract')
    expect(decideSeriesWinner({ ...base, status: 'postponed' }).kind).toBe('retract')
  })

  it('holds a game that has not been played', () => {
    expect(decideSeriesWinner({ ...base, status: 'scheduled' }).kind).toBe('hold')
    expect(decideSeriesWinner({ ...base, status: 'reported' }).kind).toBe('hold')
  })

  it('holds when the matchup does not have both teams yet', () => {
    const d = decideSeriesWinner({ status: 'final', homeTeamId: HOME, awayTeamId: null, homeScore: 2, awayScore: 0 })
    expect(d.kind).toBe('advance') // the home team is known and won
    const e = decideSeriesWinner({ status: 'final', homeTeamId: null, awayTeamId: AWAY, homeScore: 2, awayScore: 0 })
    expect(e.kind).toBe('hold')
  })

  it('always explains itself in words a volunteer can act on', () => {
    const cases: BracketGameLike[] = [
      { ...base, status: 'final', homeScore: 50, awayScore: 50 },
      { ...base, status: 'contested' },
      { ...base, status: 'forfeit', forfeit: { outcome: 'double_forfeit' } },
      { ...base, status: 'scheduled' },
    ]
    for (const c of cases) {
      const d = decideSeriesWinner(c)
      expect(d.because.length).toBeGreaterThan(15)
      expect(d.because.endsWith('.')).toBe(true)
    }
  })
})

describe('byes', () => {
  it('recognises a matchup with only one team', () => {
    expect(isBye({ homeTeamId: HOME, awayTeamId: null })).toBe(true)
    expect(isBye({ homeTeamId: null, awayTeamId: AWAY })).toBe(true)
    expect(isBye({ homeTeamId: HOME, awayTeamId: AWAY })).toBe(false)
    expect(isBye({ homeTeamId: null, awayTeamId: null })).toBe(false)
  })

  it('advances the team that is present', () => {
    expect(byeWinner({ homeTeamId: HOME, awayTeamId: null })).toBe(HOME)
    expect(byeWinner({ homeTeamId: null, awayTeamId: AWAY })).toBe(AWAY)
    expect(byeWinner({ homeTeamId: HOME, awayTeamId: AWAY })).toBeNull()
  })

  it('only calls a matchup playable once both teams are known', () => {
    expect(isPlayable({ homeTeamId: HOME, awayTeamId: AWAY })).toBe(true)
    expect(isPlayable({ homeTeamId: HOME, awayTeamId: null })).toBe(false)
  })
})

describe('roundName', () => {
  it('names the rounds the way people say them', () => {
    expect(roundName(3, 3)).toBe('Final')
    expect(roundName(2, 3)).toBe('Semi finals')
    expect(roundName(1, 3)).toBe('Quarter finals')
    expect(roundName(1, 5)).toBe('Round 1')
    expect(roundName(1, 1)).toBe('Final')
  })
})
