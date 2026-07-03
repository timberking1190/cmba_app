import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { clientIp } from '@/lib/memberCards/verifyRoute'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Fast, low-cost model for a support chatbot (latest Claude Haiku).
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TURNS = 12
const MAX_CHARS = 1500

const SYSTEM = `You are the CMBA+ assistant for the Calgary Minor Basketball Association platform (cmbaplatform.vercel.app). You help members, coaches, referees, and parents use the site and understand CMBA programs. Be concise, friendly, and practical — 2 to 4 sentences.

You can point people to these pages: /account (account + ID card), /account/card (digital member ID card), /scan (coach-verification scanner — for league officials), /rules, /calendar (schedule), /standings, /coach, /ref, /parent, /faq, /contact.

Digital member ID cards: every member gets one from their account; coaches' cards carry a verification QR gated on their record check, Safe Sport, and coach training. Members choose their type(s) (Player, Coach, Official, Parent) on their account page and upload a required photo.

Never invent CMBA fees, policies, dates, or schedules you don't actually know — if unsure, say so and point to /contact or the relevant page. For account or registration problems you can't solve, direct them to /contact. Do not give medical, legal, or safety rulings.`

interface Msg { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { messages?: unknown }
  const raw = Array.isArray(body.messages) ? body.messages : []
  const messages: Msg[] = raw
    .filter((m): m is Msg => !!m && typeof (m as Msg).content === 'string' && ((m as Msg).role === 'user' || (m as Msg).role === 'assistant'))
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Send a message.' }, { status: 400 })
  }

  // Rate-limit by IP (the assistant costs money; keep it cheap-proof).
  const payload = await getPayloadClient()
  const ip = clientIp(req) ?? 'unknown'
  const rl = await checkRateLimit(payload, { bucket: 'assistant', subject: ip, limit: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ reply: 'You are sending messages quickly — please wait a moment and try again.' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      reply:
        "The AI assistant isn't switched on yet. In the meantime: your ID card is at /account/card, schedules at /calendar, standings at /standings, and you can reach a person at /contact.",
      unconfigured: true,
    })
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system: SYSTEM, messages }),
    })
    if (!res.ok) {
      return NextResponse.json({ reply: "I couldn't reach the assistant just now. Try again, or visit /contact." })
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
    const reply = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim()
    return NextResponse.json({ reply: reply || 'Sorry, I did not catch that — could you rephrase?' })
  } catch {
    return NextResponse.json({ reply: "Something went wrong reaching the assistant. Please try again, or visit /contact." })
  }
}
