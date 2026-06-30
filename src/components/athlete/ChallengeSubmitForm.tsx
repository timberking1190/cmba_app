'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/*
 * Athlete logs a challenge result. POSTs to /api/v1/challenge-submissions (cookie
 * session). The submission lands unverified and earns fun-only participation XP; a
 * coach of the selected team verifies it for the meaningful XP. A team is required
 * so the submission is always coach-verifiable. router.refresh() re-renders the
 * server "My submissions" list after a successful log.
 */
export function ChallengeSubmitForm({ challengeId, teams }: { challengeId: number; teams: { id: number; name: string }[] }) {
  const router = useRouter()
  const [result, setResult] = useState('')
  const [team, setTeam] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'saving') return
    if (!team) {
      setState('error')
      setMsg('Pick your team so a coach can verify it.')
      return
    }
    setState('saving')
    setMsg('')
    try {
      const res = await fetch('/api/v1/challenge-submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({ challenge: challengeId, team: Number(team), result: result || undefined }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setState('error')
        setMsg(data.error || 'Could not log your result. Please try again.')
        return
      }
      setState('done')
      setMsg('Logged. Your coach can verify it.')
      router.refresh()
    } catch {
      setState('error')
      setMsg('Network error. Please try again.')
    }
  }

  if (teams.length === 0) return <p className="text-xs text-cmba-grey-mid font-mono mt-2">Logging opens once teams are set up for the season.</p>
  if (state === 'done') return <p className="text-xs text-green-400 font-mono mt-2">{msg}</p>

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">Your result</span>
        <input value={result} onChange={(e) => setResult(e.target.value)} placeholder="e.g. 18/25"
          className="bg-cmba-black border border-white/15 focus:border-cmba-red text-white text-sm px-2 py-1.5 outline-none w-36" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">Your team (required, so a coach can verify)</span>
        <select value={team} onChange={(e) => setTeam(e.target.value)} required
          className="bg-cmba-black border border-white/15 focus:border-cmba-red text-white text-sm px-2 py-1.5 outline-none w-48">
          <option value="">Select your team…</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <button type="submit" disabled={state === 'saving'}
        className="bg-cmba-red hover:bg-cmba-hot disabled:opacity-50 text-white font-display font-bold text-xs uppercase tracking-wider px-4 py-2 transition-colors">
        {state === 'saving' ? 'Logging…' : 'Log result'}
      </button>
      {state === 'error' && <span className="text-xs text-red-400 font-mono w-full">{msg}</span>}
    </form>
  )
}
