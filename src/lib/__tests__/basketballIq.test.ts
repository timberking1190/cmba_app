import { describe, expect, it } from 'vitest'

import { BASKETBALL_IQ_QUESTIONS, scoreIqAttempt, type IqQuestion } from '../basketballIqData'

describe('BASKETBALL_IQ_QUESTIONS', () => {
  it('every question has 4 options and a valid correctIndex', () => {
    for (const q of BASKETBALL_IQ_QUESTIONS) {
      expect(q.options).toHaveLength(4)
      expect(q.correctIndex).toBeGreaterThanOrEqual(0)
      expect(q.correctIndex).toBeLessThanOrEqual(3)
      expect(q.options[q.correctIndex]).toBeTruthy()
    }
  })
  it('has unique question ids', () => {
    const ids = BASKETBALL_IQ_QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

const q = (correctIndex: 0 | 1 | 2 | 3): IqQuestion => ({
  id: 'x', topic: 't', question: 'q', options: ['a', 'b', 'c', 'd'], correctIndex, ruleRef: 'r',
})

describe('scoreIqAttempt', () => {
  it('scores all-correct', () => {
    const qs = [q(0), q(1), q(2)]
    expect(scoreIqAttempt(qs, [0, 1, 2])).toEqual({ correct: 3, total: 3 })
  })
  it('scores partial and ignores wrong/blank answers', () => {
    const qs = [q(0), q(1), q(2)]
    expect(scoreIqAttempt(qs, [0, 9, null])).toEqual({ correct: 1, total: 3 })
  })
  it('scores zero for an empty answer set', () => {
    const qs = [q(0), q(1)]
    expect(scoreIqAttempt(qs, [])).toEqual({ correct: 0, total: 2 })
  })
})
