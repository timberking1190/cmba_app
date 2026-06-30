import type { Payload } from 'payload'

/*
 * Channel abstraction for member notifications. Today it sends email (via the
 * caller's composer) after honoring the relevant preference. It is push-ready:
 * once native push ships, this is the single place to also fan out to
 * Users.pushDevices with the SAME PII-free payload, so email-now / push-later is
 * one call site. Transactional notices bypass the preference check.
 */
type NotifyUser = { email?: string | null; notificationPrefs?: Record<string, unknown> | null } | null | undefined

export async function notifyUser(
  payload: Payload,
  user: NotifyUser,
  opts: { prefKey?: string; transactional?: boolean; send: (toEmail: string) => Promise<void> },
): Promise<boolean> {
  const email = user?.email
  if (!email) return false
  if (!opts.transactional && opts.prefKey && user?.notificationPrefs?.[opts.prefKey] === false) return false
  await opts.send(email)
  // push-ready: when native push ships, fan out to user.pushDevices here with the
  // same PII-free payload. payload is intentionally available for that.
  void payload
  return true
}
