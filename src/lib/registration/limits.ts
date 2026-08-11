/*
 * Registration rate limits, tunable without a code change.
 *
 * These were hardcoded at 5 per IP per hour and 50 per hour globally, which is
 * safe for a closed system and actively harmful on a launch day. Both numbers
 * fail CLOSED: a family that trips them sees an error and, as far as they are
 * concerned, the association's registration is broken.
 *
 * The global cap was the dangerous one. CMBA runs 589 teams, which implies
 * thousands of registrations. At 50 per hour it takes days of perfect
 * utilisation to register the association once, so the cap would have throttled
 * the real launch while looking healthy on every dashboard.
 *
 * Note that this is NOT the primary bot defence and should not be treated as
 * one. Turnstile is enforced on sign-up whenever TURNSTILE_SECRET is set, and a
 * challenge every caller must pass beats a global counter that cannot tell a
 * family from a bot. The per-IP limit is the real control against a single
 * source; the global limit is a backstop against a catastrophic distributed
 * event, so it should be generous enough that only such an event reaches it.
 *
 * Both are env-overridable so they can be widened on launch day without a code
 * change. A malformed, zero or negative value falls back to the default rather
 * than accidentally disabling the limit or setting it to zero, which would
 * refuse every registration.
 */

export const DEFAULT_REGISTER_IP_LIMIT = 20
export const DEFAULT_REGISTER_GLOBAL_LIMIT = 2000

export function parseLimit(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback
  const trimmed = raw.trim()
  if (trimmed === '') return fallback
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n <= 0) return fallback
  return n
}

/*
 * Per-IP, per-hour. Sized so a household registering several children plus
 * parent accounts cannot trip it, and so a shared connection (a community
 * centre, a school, an ISP using CGNAT) carrying a handful of families does not
 * either. The old value of 5 was hit exactly by one family with three children
 * and two parents.
 */
export function registrationIpLimit(): number {
  return parseLimit(process.env.REGISTER_RATE_LIMIT_IP, DEFAULT_REGISTER_IP_LIMIT)
}

/* Global, per-hour. A backstop, not the bot defence. See the note above. */
export function registrationGlobalLimit(): number {
  return parseLimit(process.env.REGISTER_RATE_LIMIT_GLOBAL, DEFAULT_REGISTER_GLOBAL_LIMIT)
}
