'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, UserSquare2 } from 'lucide-react'

/*
 * MemberTypeToggles — a member self-selects their type(s): Participant, Coach,
 * Official, Parent/Spectator. Each type carries its own ID-card requirements. Sends
 * only the self-service roles; the server sanitizeSelfRoles guard preserves any
 * admin-assigned roles and blocks privilege escalation, so this is safe.
 */
const OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: 'participant', label: 'Player / Participant', hint: 'Play in CMBA programs.' },
  { value: 'coach', label: 'Coach', hint: 'Requires record check, Safe Sport, and coach training for a verified card.' },
  { value: 'official', label: 'Official / Referee', hint: 'Officiate games.' },
  { value: 'parent', label: 'Parent / Spectator', hint: 'Guardian or supporter — ID card only.' },
]

export function MemberTypeToggles({ userId, currentRoles }: { userId: number | string; currentRoles: string[] }) {
  const router = useRouter()
  const initial = new Set(currentRoles.filter((r) => OPTIONS.some((o) => o.value === r)))
  const [selected, setSelected] = useState<Set<string>>(initial)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const toggle = (v: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
    setMsg(null)
  }

  async function save() {
    const roles = [...selected]
    if (roles.length === 0) {
      setMsg('Choose at least one member type.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roles }),
      })
      if (!res.ok) {
        setMsg('Could not update your member types.')
        return
      }
      setMsg('Member types updated. Your card requirements now match your selection.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border border-white/12 bg-cmba-black-card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-white">
        <UserSquare2 size={14} className="text-cmba-red" /> Member types
      </h2>
      <p className="mb-4 text-xs text-cmba-grey-mid">Choose how you take part. Each type sets your ID-card requirements.</p>
      <div className="space-y-2">
        {OPTIONS.map((o) => {
          const on = selected.has(o.value)
          return (
            <button
              key={o.value}
              onClick={() => toggle(o.value)}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                on ? 'border-cmba-red bg-cmba-red/10' : 'border-white/12 hover:border-white/25'
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  on ? 'border-cmba-red bg-cmba-red text-white' : 'border-white/30'
                }`}
              >
                {on && <span className="text-[10px] leading-none">✓</span>}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">{o.label}</span>
                <span className="block text-xs text-cmba-grey-mid">{o.hint}</span>
              </span>
            </button>
          )
        })}
      </div>
      {msg && <p className="mt-3 text-xs text-cmba-grey-light">{msg}</p>}
      <button
        onClick={save}
        disabled={busy}
        className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 bg-cmba-red px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-cmba-hot active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {busy ? 'Saving…' : 'Save member types'}
      </button>
    </section>
  )
}
