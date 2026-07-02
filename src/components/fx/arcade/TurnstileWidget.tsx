'use client'

import { useEffect, useRef } from 'react'

/*
 * Cloudflare Turnstile widget for arcade score submission. Renders only when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured (otherwise it is a no-op and the
 * server treats the challenge as disabled). The token is stashed on
 * window.__cmbaTurnstileToken, which the submit path reads and sends as the
 * x-cmba-turnstile header, matching the existing site convention. The CSP already
 * allows challenges.cloudflare.com when the site key is present.
 */
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

declare global {
  interface Window {
    __cmbaTurnstileToken?: string
    __cmbaArcadeTurnstileCb?: (token: string) => void
    __cmbaArcadeTurnstileExpiredCb?: () => void
  }
}

export function TurnstileWidget({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || typeof window === 'undefined') return

    window.__cmbaArcadeTurnstileCb = (token: string) => {
      window.__cmbaTurnstileToken = token
    }
    window.__cmbaArcadeTurnstileExpiredCb = () => {
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
      data-callback="__cmbaArcadeTurnstileCb"
      data-expired-callback="__cmbaArcadeTurnstileExpiredCb"
    />
  )
}
