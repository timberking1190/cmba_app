import * as Sentry from '@sentry/nextjs'

import { sentryInitOptions, serverDsn } from '@/lib/observability/sentry'

/*
 * Next.js instrumentation hook. Initializes Sentry for the Node and Edge server
 * runtimes ONLY when a DSN is configured, so builds and local dev never phone home.
 * We init here (rather than via withSentryConfig) to keep next.config unchanged and
 * the build path low-risk; source-map upload can be added later by the operator.
 *
 * Copy rule: no em or en dashes anywhere.
 */
export async function register(): Promise<void> {
  const dsn = serverDsn()
  if (!dsn) return
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(sentryInitOptions(dsn))
  }
}

// Captures errors thrown in nested React Server Components (no-op when Sentry is off).
export const onRequestError = Sentry.captureRequestError
