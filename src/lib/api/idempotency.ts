import { createHash } from 'crypto'

import type { Payload, Where } from 'payload'

/*
 * Idempotency-Key handling so a score report or confirm retried from a weak gym
 * connection is never double counted. The DECISION is a pure function so it is
 * unit-testable without a database; the server wrapper does the I/O.
 *
 * Rules: a blank key is a 400. The same (key, scope) from a DIFFERENT user is a
 * 403. The same key with a DIFFERENT logical body is a 409. The same key and body
 * replays the stored response WITHOUT running again. The (key, scope) unique index
 * means a concurrent race inserts exactly once and the loser replays the winner.
 */

export type IdemRecord = {
  userId?: string | null
  requestHash?: string | null
  statusCode?: number | null
  responseBody?: unknown
}

export type IdemDecision =
  | { action: 'run' }
  | { action: 'replay'; statusCode: number; responseBody: unknown }
  | { action: 'error'; statusCode: 403 | 409; message: string }

export function decideIdempotency(
  existing: IdemRecord | null | undefined,
  userId: string,
  requestHash: string,
): IdemDecision {
  if (!existing) return { action: 'run' }
  if ((existing.userId ?? '') !== userId) {
    return { action: 'error', statusCode: 403, message: 'This idempotency key belongs to a different user.' }
  }
  if ((existing.requestHash ?? '') !== requestHash) {
    return { action: 'error', statusCode: 409, message: 'This idempotency key was used for a different request.' }
  }
  return { action: 'replay', statusCode: existing.statusCode ?? 200, responseBody: existing.responseBody }
}

/*
 * Deterministic, key-order-independent JSON stringify so the requestHash is stable
 * across clients and re-encodes. Only the STABLE LOGICAL fields are hashed (passed
 * in by the caller), never the raw multipart envelope.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const keys = Object.keys(value as Record<string, unknown>).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(',')}}`
}

export function hashRequest(method: string, path: string, logical: unknown): string {
  return createHash('sha256').update(`${method} ${path} ${stableStringify(logical)}`).digest('hex')
}

export type IdemResult = { statusCode: number; body: unknown }

/*
 * Server wrapper. Reads the (key, scope) record, decides, and either replays,
 * errors, or runs the handler and persists its response. A store outage fails
 * closed with a 503 (a score must never be silently accepted twice). run() must
 * resolve only after its own transaction has committed.
 */
export async function withIdempotency(
  payload: Payload,
  opts: { key: string | null | undefined; scope: string; userId: string; requestHash: string; run: () => Promise<IdemResult> },
): Promise<IdemResult> {
  const { key, scope, userId, requestHash, run } = opts
  if (!key) return { statusCode: 400, body: { error: 'An Idempotency-Key header is required for this request.' } }

  const where: Where = { and: [{ key: { equals: key } }, { scope: { equals: scope } }] }

  let existing: IdemRecord | null
  try {
    const res = await payload.find({ collection: 'idempotency-keys', where, limit: 1, overrideAccess: true })
    existing = (res.docs[0] as IdemRecord) ?? null
  } catch (err) {
    payload.logger.error(`Idempotency store read failed: ${String(err)}`)
    return { statusCode: 503, body: { error: 'The request store is temporarily unavailable. Please try again.' } }
  }

  const decision = decideIdempotency(existing, userId, requestHash)
  if (decision.action === 'replay') return { statusCode: decision.statusCode, body: decision.responseBody }
  if (decision.action === 'error') return { statusCode: decision.statusCode, body: { error: decision.message } }

  const result = await run()

  try {
    await payload.create({
      collection: 'idempotency-keys',
      overrideAccess: true,
      data: { key, scope, userId, requestHash, statusCode: result.statusCode, responseBody: result.body as Record<string, unknown>, createdAt: new Date().toISOString() },
    })
  } catch {
    // A concurrent winner already inserted (unique key+scope). Replay theirs.
    try {
      const res = await payload.find({ collection: 'idempotency-keys', where, limit: 1, overrideAccess: true })
      const w = res.docs[0] as IdemRecord | undefined
      if (w) return { statusCode: w.statusCode ?? result.statusCode, body: w.responseBody ?? result.body }
    } catch {
      /* fall through to return the freshly computed result */
    }
  }
  return result
}
