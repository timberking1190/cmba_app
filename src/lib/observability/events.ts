import { track } from '@vercel/analytics'

/*
 * Product analytics for the member-value features, via Vercel Web Analytics.
 * Privacy-respecting by construction: Vercel Web Analytics is cookieless and
 * aggregate, and we attach NO user identifier, so children are never profiled and
 * events cannot be tied back to a person. Keep event props to non-personal enums
 * (a skill name, a quiz slug), never a name, email, or id.
 *
 * All calls are guarded and no-op when analytics is not loaded (local dev, or a
 * deploy without Vercel Analytics enabled), so nothing here can break a page.
 *
 * Copy rule: no em or en dashes anywhere.
 */

export type MemberEvent =
  | 'challenge_submitted'
  | 'quiz_completed'
  | 'score_reported'
  | 'score_confirmed'
  | 'cert_uploaded'

type EventProps = Record<string, string | number | boolean>

export function trackEvent(name: MemberEvent, props?: EventProps): void {
  try {
    track(name, props)
  } catch {
    // Analytics not available; ignore.
  }
}

/*
 * Report a caught client error to Sentry when monitoring is enabled. Dynamically
 * imported so the SDK is only pulled in when a DSN is configured, and guarded so a
 * failure here never masks the original error.
 */
export function captureClientError(error: unknown): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  import('@sentry/nextjs')
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {})
}
