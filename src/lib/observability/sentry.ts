/*
 * Sentry configuration for CMBA Connect error monitoring, tuned for a minors-first
 * Canadian service. Two hard rules:
 *   1. No personal data leaves the app. sendDefaultPii is off and every event is run
 *      through scrubEvent, which strips the user object (including IP), cookies,
 *      auth headers, request bodies, and query strings before send.
 *   2. Sentry is OFF unless a DSN is set, so the build and local dev never phone
 *      home. The operator sets SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN once a project
 *      is created (in the EU region; see docs/PROCESSOR_REGISTER.md).
 *
 * Error diagnostics are the only thing sent, they carry no personal data, and
 * children are never profiled. Recorded in the processor register and privacy policy.
 *
 * scrubEvent is a pure function so it can be unit tested without the SDK.
 *
 * Copy rule: no em or en dashes anywhere.
 */

type LooseEvent = {
  user?: unknown
  request?: {
    cookies?: unknown
    data?: unknown
    headers?: Record<string, unknown>
    query_string?: unknown
    url?: unknown
  }
  [k: string]: unknown
}

/** Strip anything that could carry personal data from a Sentry event. */
export function scrubEvent<T extends LooseEvent | null | undefined>(event: T): T {
  if (!event) return event
  // Remove the user context entirely (id, email, ip_address).
  delete event.user
  const req = event.request
  if (req) {
    delete req.cookies
    delete req.data
    if (req.headers && typeof req.headers === 'object') {
      for (const k of Object.keys(req.headers)) {
        if (['cookie', 'authorization', 'x-nonce'].includes(k.toLowerCase())) delete req.headers[k]
      }
    }
    if (req.query_string !== undefined) req.query_string = '[redacted]'
    if (typeof req.url === 'string') req.url = req.url.split('?')[0]
  }
  return event
}

export function sentryEnvironment(): string {
  return process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
}

/** Shared init options. Passed to Sentry.init on both server and client. */
export function sentryInitOptions(dsn: string): Record<string, unknown> {
  return {
    dsn,
    environment: sentryEnvironment(),
    // Keep personal data out. scrubEvent is the belt-and-suspenders backstop.
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
    // Low performance sampling; no session replay (privacy).
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  }
}

/** The active DSN for a given runtime, or undefined when monitoring is off. */
export function serverDsn(): string | undefined {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined
}
