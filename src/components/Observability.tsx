'use client'

import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

import { sentryInitOptions } from '@/lib/observability/sentry'

/*
 * Client-side observability, mounted once in the root layout:
 *   - Sentry browser error monitoring, initialized only when a DSN is set, with the
 *     same PII scrubbing as the server (src/lib/observability/sentry.ts).
 *   - Vercel Web Analytics + Speed Insights (Web Vitals). Both are cookieless and
 *     aggregate, collect no personal data, and are a no-op off Vercel, so they are
 *     always safe to render.
 *
 * Copy rule: no em or en dashes anywhere.
 */
export function Observability() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (!dsn) return
    const w = window as unknown as { __sentryInited?: boolean }
    if (w.__sentryInited) return
    w.__sentryInited = true
    import('@sentry/nextjs')
      .then((Sentry) => Sentry.init(sentryInitOptions(dsn)))
      .catch(() => {})
  }, [])

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
