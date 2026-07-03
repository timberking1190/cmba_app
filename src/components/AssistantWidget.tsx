'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react'

interface Msg { role: 'user' | 'assistant'; content: string }

const GREETING: Msg = {
  role: 'assistant',
  content: "Hi! I'm the CMBA+ assistant. Ask me about your ID card, schedules, standings, rules, or how to use the site.",
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const res = await fetch('/api/v1/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING) }),
      })
      const data = (await res.json()) as { reply?: string; error?: string }
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || data.error || 'Sorry, please try again.' }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Network issue — please try again, or visit /contact.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open the CMBA+ assistant"
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-cmba-red text-white shadow-2xl transition-transform hover:bg-cmba-hot active:scale-95 lg:bottom-6 lg:right-6"
        >
          <MessageCircle size={26} />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="CMBA+ assistant"
          className="fixed inset-x-0 bottom-0 z-[60] flex h-[70vh] flex-col rounded-t-2xl border border-white/12 bg-cmba-black-card shadow-2xl lg:inset-x-auto lg:bottom-6 lg:right-6 lg:h-[32rem] lg:w-96 lg:rounded-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Sparkles size={18} className="text-cmba-red" />
              <span className="font-display text-sm font-bold uppercase tracking-wide">CMBA+ Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="flex h-9 w-9 items-center justify-center rounded-lg text-cmba-grey hover:bg-white/5 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === 'user' ? 'bg-cmba-red text-white' : 'bg-white/5 text-cmba-grey-light'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/5 px-3.5 py-2 text-cmba-grey-light"><Loader2 size={16} className="animate-spin" /></div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={1}
                placeholder="Ask a question…"
                className="max-h-24 min-h-[44px] flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-cmba-grey-mid focus:border-cmba-red focus:outline-none"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-cmba-red text-white transition-colors hover:bg-cmba-hot disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-cmba-grey-mid">AI can make mistakes. For account issues, use <Link href="/contact" className="underline">Contact</Link>.</p>
          </div>
        </div>
      )}
    </>
  )
}
