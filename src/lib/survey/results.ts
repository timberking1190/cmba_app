/*
 * Pure aggregation of survey responses into member-safe results. Text answers are
 * reduced to a count only (never the raw text), so publishing results to members can
 * never expose what an individual wrote. Rating and choice answers become aggregate
 * distributions. Pure so it is unit testable without a database.
 *
 * Copy rule: no em or en dashes anywhere.
 */

export type SurveyQuestion = {
  key: string
  prompt: string
  type: 'rating' | 'choice' | 'text'
  options?: Array<{ label: string }> | null
}
export type SurveyAnswer = { key: string; value?: string | null }
export type ResponseLike = { answers?: SurveyAnswer[] | null }

export type QuestionAggregate = {
  key: string
  prompt: string
  type: 'rating' | 'choice' | 'text'
  count: number
  average?: number | null
  distribution?: Record<string, number>
}

export function aggregateResponses(
  questions: SurveyQuestion[],
  responses: ResponseLike[],
): { total: number; questions: QuestionAggregate[] } {
  const byKey = new Map<string, string[]>()
  for (const r of responses) {
    for (const a of r.answers ?? []) {
      if (!a?.key) continue
      const arr = byKey.get(a.key) ?? []
      if (a.value != null && String(a.value).trim() !== '') arr.push(String(a.value))
      byKey.set(a.key, arr)
    }
  }

  const out: QuestionAggregate[] = questions.map((q) => {
    const values = byKey.get(q.key) ?? []
    if (q.type === 'rating') {
      const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      let sum = 0
      let n = 0
      for (const v of values) {
        const num = Number(v)
        if (Number.isInteger(num) && num >= 1 && num <= 5) {
          dist[String(num)]++
          sum += num
          n++
        }
      }
      return { key: q.key, prompt: q.prompt, type: 'rating', count: n, average: n ? Math.round((sum / n) * 10) / 10 : null, distribution: dist }
    }
    if (q.type === 'choice') {
      const dist: Record<string, number> = {}
      for (const opt of q.options ?? []) dist[opt.label] = 0
      let n = 0
      for (const v of values) {
        if (v in dist) {
          dist[v]++
          n++
        }
      }
      return { key: q.key, prompt: q.prompt, type: 'choice', count: n, distribution: dist }
    }
    // text: count only, never the raw text (privacy).
    return { key: q.key, prompt: q.prompt, type: 'text', count: values.length }
  })

  return { total: responses.length, questions: out }
}
