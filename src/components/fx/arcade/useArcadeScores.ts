import { useCallback, useEffect, useState } from 'react'

/*
 * Client hook for the shared arcade leaderboard. Reads the public top scores and
 * submits new ones through the Payload REST collection, which runs the
 * authoritative server gates (honeypot + rate limit + Turnstile + name filter) in
 * its beforeValidate hook. The client never decides whether a score or name is
 * allowed; it only shows instant feedback and relays the server's verdict.
 */
export interface ArcadeScore {
  id: number
  name: string
  score: number
  createdAt: string
}

const GAME = 'freethrow'

export interface SubmitInput {
  name: string
  score: number
  honeypot?: string // any non-empty value marks the request for server rejection
}

export interface SubmitResult {
  ok: boolean
  id?: number
  error?: string
}

function readTurnstileToken(): string {
  if (typeof window === 'undefined') return ''
  return (window as unknown as { __cmbaTurnstileToken?: string }).__cmbaTurnstileToken || ''
}

export function useArcadeScores(limit = 10) {
  const [scores, setScores] = useState<ArcadeScore[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        'where[game][equals]': GAME,
        'where[hidden][not_equals]': 'true',
        sort: '-score',
        limit: String(limit),
        depth: '0',
      })
      const res = await fetch(`/api/arcade-scores?${qs.toString()}`, { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error('load failed')
      const data = (await res.json()) as { docs?: Array<Record<string, unknown>> }
      const docs = (data.docs || []).map((d) => ({
        id: Number(d.id),
        name: String(d.name ?? ''),
        score: Number(d.score ?? 0),
        createdAt: String(d.createdAt ?? ''),
      }))
      setScores(docs)
    } catch {
      // Leave the last-known list in place; the UI shows an offline note if empty.
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const submit = useCallback(async (input: SubmitInput): Promise<SubmitResult> => {
    try {
      const res = await fetch('/api/arcade-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cmba-hp': input.honeypot ? 'hp' : '',
          'x-cmba-turnstile': readTurnstileToken(),
        },
        body: JSON.stringify({ name: input.name, score: input.score, game: GAME }),
      })
      const body = (await res.json().catch(() => ({}))) as { doc?: { id?: number }; errors?: Array<{ message?: string }> }
      if (!res.ok) {
        const message = body.errors?.[0]?.message || 'Could not submit. Try again.'
        return { ok: false, error: message }
      }
      await refresh()
      return { ok: true, id: body.doc?.id }
    } catch {
      return { ok: false, error: 'Network error. Try again.' }
    }
  }, [refresh])

  const report = useCallback(async (id: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/arcade/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  return { scores, loading, refresh, submit, report }
}
