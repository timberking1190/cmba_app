'use client'

/*
 * Route group error boundary for the whole public and member site. Any error
 * thrown while rendering a (frontend) page that does not have its own error.tsx
 * bubbles up here, so a failed or slow fetch shows a friendly, on brand recovery
 * screen with a retry and a safe path home instead of a blank screen.
 *
 * Copy rule: no em or en dashes anywhere.
 */

import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { captureClientError } from '@/lib/observability/events'

export default function FrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('frontend error boundary:', error)
    // Report to Sentry when monitoring is enabled (no-op otherwise).
    captureClientError(error)
  }, [error])

  return <ErrorState reset={reset} />
}
