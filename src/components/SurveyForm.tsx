'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

/*
 * Season survey form. Renders one input per question (rating 1 to 5, multiple choice,
 * or short text) and POSTs to the respond API. One response per member is enforced
 * server-side; on success we refresh so the page shows the thank-you and, if the
 * survey publishes them, the aggregate results.
 *
 * Copy rule: no em or en dashes anywhere.
 */
export type FormQuestion = { key: string; prompt: string; type: 'rating' | 'choice' | 'text'; options?: Array<{ label: string }> }

export function SurveyForm({ surveyId, questions }: { surveyId: string; questions: FormQuestion[] }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const set = (key: string, value: string) => setAnswers((prev) => ({ ...prev, [key]: value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'saving') return
    const payload = Object.entries(answers)
      .filter(([, v]) => v !== '')
      .map(([key, value]) => ({ key, value }))
    if (payload.length === 0) {
      setState('error')
      setMsg('Please answer at least one question.')
      return
    }
    setState('saving')
    setMsg('')
    try {
      const res = await fetch(`/api/v1/surveys/${surveyId}/respond`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setState('error')
        setMsg(data.error || 'Could not submit. Please try again.')
        return
      }
      router.refresh()
    } catch {
      setState('error')
      setMsg('Network error. Please try again.')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {questions.map((q) => (
        <fieldset key={q.key} className="bg-cmba-black-card border border-white/12 p-5">
          <legend className="font-display font-bold text-sm text-white mb-3">{q.prompt}</legend>
          {q.type === 'rating' && (
            <div className="flex gap-2" role="radiogroup" aria-label={q.prompt}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={answers[q.key] === String(n)}
                  onClick={() => set(q.key, String(n))}
                  className={`w-10 h-10 font-mono text-sm border transition-colors ${answers[q.key] === String(n) ? 'bg-cmba-red border-cmba-red text-white' : 'border-white/15 text-cmba-grey-light hover:border-cmba-red/50'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          {q.type === 'choice' && (
            <div className="space-y-2">
              {(q.options ?? []).map((o) => (
                <label key={o.label} className="flex items-center gap-2 text-sm text-cmba-grey-light cursor-pointer">
                  <input type="radio" name={q.key} value={o.label} checked={answers[q.key] === o.label} onChange={() => set(q.key, o.label)} className="accent-cmba-red" />
                  {o.label}
                </label>
              ))}
            </div>
          )}
          {q.type === 'text' && (
            <textarea
              value={answers[q.key] ?? ''}
              onChange={(e) => set(q.key, e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full bg-cmba-black-surface border border-white/15 focus:border-cmba-red/50 outline-none p-3 text-sm text-cmba-grey-light"
              placeholder="Your answer"
            />
          )}
        </fieldset>
      ))}

      {msg && <p className={`text-sm ${state === 'error' ? 'text-red-400' : 'text-cmba-grey'}`}>{msg}</p>}

      <button type="submit" disabled={state === 'saving'} className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-red-dark disabled:opacity-60 text-white font-mono text-xs uppercase tracking-wider px-6 py-3 transition-colors">
        <CheckCircle2 size={14} aria-hidden="true" /> {state === 'saving' ? 'Submitting' : 'Submit'}
      </button>
    </form>
  )
}
