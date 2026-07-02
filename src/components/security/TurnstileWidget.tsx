'use client'

import { useEffect, useRef } from 'react'

/*
 * Shared Cloudflare Turnstile widget for public, unauthenticated forms (arcade
 * score submit, /game-report, signup). Renders only when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured; otherwise it is a no-op and the
 * server treats the challenge as disabled (verifyTurnstile returns true when no
 * TURNSTILE_SECRET is set). The solved token is stashed on
 * window.__cmbaTurnstileToken, which every submit path reads and sends as the
 * x-cmba-turnstile header. The strict CSP already allows challenges.cloudflare.com
 * whenever the site key is present.
 */
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

declare global {
  interface Window {
    __cmbaTurnstileToken?: string
    __cmbaTurnstileCb?: (token: string) => void
    __cmbaTurnstileExpiredCb?: () => void
  }
}

export function TurnstileWidget({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || typeof window === 'undefined') return

    window.__cmbaTurnstileCb = (token: string) => {
      window.__cmbaTurnstileToken = token
    }
    window.__cmbaTurnstileExpiredCb = () => {
      window.__cmbaTurnstileToken = ''
    }

    // Load the Turnstile script once; it auto-renders any .cf-turnstile element.
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const s = document.createElement('script')
      s.src = SCRIPT_SRC
      s.async = true
      s.defer = true
      document.head.appendChild(s)
    }

    return () => {
      window.__cmbaTurnstileToken = ''
    }
  }, [siteKey])

  if (!siteKey) return null

  return (
    <div
      ref={ref}
      className={`cf-turnstile ${className ?? ''}`}
      data-sitekey={siteKey}
      data-theme="dark"
      data-size="flexible"
      data-callback="__cmbaTurnstileCb"
      data-expired-callback="__cmbaTurnstileExpiredCb"
    />
  )
}
