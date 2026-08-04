'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, RotateCcw } from 'lucide-react'

import { trackEvent } from '@/lib/observability/events'

/* The answer key is NOT sent to the client; scoring is server-side. */
type Q = { id: string; topic: string; question: string; options: string[] }

export function BasketballIqQuiz({ quizId, questions }: { quizId: string; questions: Q[] }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean } | null>(null)
  const [msg, setMsg] = useState('')

  const answered = answers.filter((a) => a !== null).length

  function choose(qi: number, oi: number) {
    setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))
  }

  async function submit() {
    if (state === 'saving') return
    if (answered < questions.length) {
      setState('error')
      setMsg(`Answer all ${questions.length} questions first (${answered}/${questions.length} done).`)
      return
    }
    setState('saving')
    setMsg('')
    try {
      const res = await fetch('/api/v1/quiz-attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({ quizId, answers }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; score?: number; total?: number; passed?: boolean }
      if (!res.ok) {
        setState('error')
        setMsg(data.error || 'Could not submit. Please try again.')
        return
      }
      setResult({ score: data.score ?? 0, total: data.total ?? questions.length, passed: Boolean(data.passed) })
      setState('done')
      // Anonymous, aggregate engagement signal (pass flag only, no user identifier).
      trackEvent('quiz_completed', { passed: Boolean(data.passed) })
      router.refresh()
    } catch {
      setState('error')
      setMsg('Network error. Please try again.')
    }
  }

  function retake() {
    setAnswers(questions.map(() => null))
    setResult(null)
    setMsg('')
    setState('idle')
  }

  if (state === 'done' && result) {
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0
    return (
      <div className="bg-cmba-black-card border border-white/12 p-6 text-center">
        <CheckCircle2 size={32} className={result.passed ? 'text-green-400 mx-auto' : 'text-orange-400 mx-auto'} />
        <div className="font-display font-black text-2xl text-white mt-2">{result.score} / {result.total} ({pct}%)</div>
        <p className={`text-sm mt-1 ${result.passed ? 'text-green-400' : 'text-orange-400'}`}>
          {result.passed ? 'Passed! Nice basketball IQ.' : 'Not quite, study up and try again.'}
        </p>
        <button onClick={retake} className="mt-4 inline-flex items-center gap-2 border border-white/20 hover:border-cmba-red text-white font-display font-bold text-xs uppercase tracking-wider px-4 py-2 transition-colors">
          <RotateCcw size={14} /> Retake
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => (
        <div key={q.id} className="bg-cmba-black-card border border-white/12 p-5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-cmba-red mb-1">{q.topic}</div>
          <div className="font-display font-bold text-white text-sm mb-3">{qi + 1}. {q.question}</div>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <label key={oi} className={`flex items-center gap-2 cursor-pointer text-sm px-3 py-2 border transition-colors ${answers[qi] === oi ? 'border-cmba-red bg-cmba-red/10 text-white' : 'border-white/12 text-cmba-grey-light hover:border-white/30'}`}>
                <input type="radio" name={q.id} checked={answers[qi] === oi} onChange={() => choose(qi, oi)} className="accent-cmba-red" />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3 sticky bottom-2">
        <button onClick={submit} disabled={state === 'saving'}
          className="bg-cmba-red hover:bg-cmba-hot disabled:opacity-50 text-white font-display font-bold text-sm uppercase tracking-wider px-6 py-3 transition-colors">
          {state === 'saving' ? 'Scoring…' : `Submit (${answered}/${questions.length})`}
        </button>
        {state === 'error' && <span className="text-sm text-red-400 font-mono">{msg}</span>}
      </div>
    </div>
  )
}
