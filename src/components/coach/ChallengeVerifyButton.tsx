'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/*
 * Coach/admin verifies one challenge submission. POSTs to the coach-verify route,
 * which authorizes (verified coach of the team, or admin) server-side and grants
 * the meaningful XP. On success router.refresh() drops the row from the pending
 * list and updates the count; a failed auth shows the reason.
 */
export function ChallengeVerifyButton({ submissionId }: { submissionId: number }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function verify() {
    if (state === 'saving' || state === 'done') return
    setState('saving')
    setMsg('')
    try {
      const res = await fetch(`/api/v1/challenge-submissions/${submissionId}/verify`, {
        method: 'POST',
        headers: { 'idempotency-key': crypto.randomUUID() },
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setState('error')
        setMsg(data.error || 'Could not verify.')
        return
      }
      setState('done')
      router.refresh()
    } catch {
      setState('error')
      setMsg('Network error.')
    }
  }

  if (state === 'done') return <span className="font-mono text-xs text-green-400 uppercase">Verified ✓</span>

  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={verify} disabled={state === 'saving'}
        className="bg-cmba-red hover:bg-cmba-hot disabled:opacity-50 text-white font-display font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 transition-colors">
        {state === 'saving' ? 'Verifying…' : 'Verify'}
      </button>
      {state === 'error' && <span className="text-[11px] text-red-400 font-mono">{msg}</span>}
    </span>
  )
}
