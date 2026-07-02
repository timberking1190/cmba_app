import { describe, expect, it } from 'vitest'

import { aggregateResponses, type SurveyQuestion } from '../survey/results'
import { siteSearch } from '../search/site'

describe('aggregateResponses', () => {
  const questions: SurveyQuestion[] = [
    { key: 'q1', prompt: 'Rate the season', type: 'rating' },
    { key: 'q2', prompt: 'Best part', type: 'choice', options: [{ label: 'Coaching' }, { label: 'Refs' }] },
    { key: 'q3', prompt: 'Anything else', type: 'text' },
  ]

  it('aggregates ratings into a distribution and average', () => {
    const agg = aggregateResponses(questions, [
      { answers: [{ key: 'q1', value: '5' }] },
      { answers: [{ key: 'q1', value: '3' }] },
      { answers: [{ key: 'q1', value: '9' }] }, // invalid, ignored
    ])
    const q1 = agg.questions.find((q) => q.key === 'q1')!
    expect(q1.count).toBe(2)
    expect(q1.average).toBe(4)
    expect(q1.distribution).toMatchObject({ '5': 1, '3': 1 })
    expect(agg.total).toBe(3)
  })

  it('counts only known choice options', () => {
    const agg = aggregateResponses(questions, [
      { answers: [{ key: 'q2', value: 'Coaching' }] },
      { answers: [{ key: 'q2', value: 'Coaching' }] },
      { answers: [{ key: 'q2', value: 'Parking' }] }, // not an option, ignored
    ])
    const q2 = agg.questions.find((q) => q.key === 'q2')!
    expect(q2.distribution).toEqual({ Coaching: 2, Refs: 0 })
    expect(q2.count).toBe(2)
  })

  it('never exposes raw text answers, only a count', () => {
    const agg = aggregateResponses(questions, [
      { answers: [{ key: 'q3', value: 'the refs were great' }] },
      { answers: [{ key: 'q3', value: '' }] }, // empty, not counted
    ])
    const q3 = agg.questions.find((q) => q.key === 'q3')!
    expect(q3.count).toBe(1)
    expect(JSON.stringify(q3)).not.toContain('refs were great')
  })
})

describe('siteSearch', () => {
  const payload = {
    find: async ({ collection }: { collection: string }) => {
      if (collection === 'pages') return { docs: [{ title: 'Concussion Policy', slug: 'concussion' }] }
      if (collection === 'teams') return { docs: [{ name: 'Thunder U12' }] }
      if (collection === 'venues') return { docs: [{ name: 'Genesis Centre' }] }
      return { docs: [] }
    },
  }

  it('returns nothing for a too-short query', async () => {
    const res = await siteSearch(payload, 'a')
    expect(res.count).toBe(0)
    expect(res.results).toEqual([])
  })

  it('groups CMS pages, teams, and venues with the right links', async () => {
    const res = await siteSearch(payload, 'concussion')
    expect(res.results.some((r) => r.type === 'page' && r.url === '/concussion')).toBe(true)
    expect(res.results.some((r) => r.type === 'team' && r.url === '/standings')).toBe(true)
    expect(res.results.some((r) => r.type === 'venue' && r.url === '/schedule')).toBe(true)
    // Never searches members.
    expect(res.results.some((r) => (r.type as string) === 'user')).toBe(false)
  })
})
