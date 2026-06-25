import type { Payload } from 'payload'

/*
 * Durable, serverless-safe rate limiting. In-memory counters do not survive across
 * ephemeral serverless instances, so hits are recorded as rows and counted within
 * the window. The threshold check is a pure function for unit testing; the server
 * wrapper does the I/O. On a store error the limiter FAILS OPEN (logs and allows)
 * so an infrastructure blip never blocks a rep from reporting a real score.
 */

export function decideRateLimit(hitsInWindow: number, limit: number): { ok: boolean } {
  return { ok: hitsInWindow < limit }
}

export async function checkRateLimit(
  payload: Payload,
  opts: { bucket: string; subject: string; limit: number; windowMs: number; now?: Date },
): Promise<{ ok: boolean; retryAfter?: number }> {
  const { bucket, subject, limit, windowMs, now = new Date() } = opts
  const since = new Date(now.getTime() - windowMs).toISOString()

  let count = 0
  try {
    const res = await payload.count({
      collection: 'rate-limit-hits',
      where: { and: [{ bucket: { equals: bucket } }, { subject: { equals: subject } }, { at: { greater_than_equal: since } }] },
      overrideAccess: true,
    })
    count = res.totalDocs
  } catch (err) {
    payload.logger.error(`Rate limit read failed (allowing): ${String(err)}`)
    return { ok: true }
  }

  if (!decideRateLimit(count, limit).ok) {
    return { ok: false, retryAfter: Math.ceil(windowMs / 1000) }
  }

  try {
    await payload.create({ collection: 'rate-limit-hits', overrideAccess: true, data: { bucket, subject, at: now.toISOString() } })
  } catch (err) {
    payload.logger.error(`Rate limit write failed: ${String(err)}`)
  }
  return { ok: true }
}
