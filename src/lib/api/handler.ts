import { NextResponse } from 'next/server'

import type { Payload } from 'payload'

import { hashRequest, withIdempotency, type IdemResult } from './idempotency'

/*
 * Shared helper for /api/v1 mutations. Wraps the handler in the Idempotency-Key
 * dedupe, maps a thrown APIError to its status (so the collection hook gates
 * surface as 401/403/400), and never leaks an internal error message to the client.
 * The idempotency record is persisted only when run() completes, so a handler that
 * throws (for example a rejected rep gate) is safely retryable.
 */
/*
 * Map any thrown error to a SAFE client status and message. Only a Payload APIError
 * we intentionally threw (isPublic === true) gets its message passed through; every
 * other sub-500 error (ValidationError, a Postgres constraint, etc.) collapses to a
 * generic message so field names and schema detail never leak. 500s are generic.
 */
export function safeClientError(err: unknown): { status: number; message: string } {
  const e = err as { status?: number; isPublic?: boolean; message?: string }
  const status = typeof e.status === 'number' ? e.status : 500
  if (status >= 500) return { status: 500, message: 'Something went wrong. Please try again.' }
  if (e.isPublic === true && e.message) return { status, message: e.message }
  return { status: status >= 400 && status < 500 ? status : 400, message: 'Request rejected.' }
}

export async function mutationResponse(
  payload: Payload,
  req: Request,
  opts: { scope: string; userId: string; method: string; path: string; logical: unknown; run: () => Promise<IdemResult> },
): Promise<NextResponse> {
  const key = req.headers.get('idempotency-key')
  const requestHash = hashRequest(opts.method, opts.path, opts.logical)
  try {
    const result = await withIdempotency(payload, { key, scope: opts.scope, userId: opts.userId, requestHash, run: opts.run })
    return NextResponse.json(result.body, { status: result.statusCode })
  } catch (err) {
    const { status, message } = safeClientError(err)
    if (status >= 500) payload.logger.error(`[api] ${opts.path}: ${String(err)}`)
    return NextResponse.json({ error: message }, { status })
  }
}

export function numericId(id: string): number | null {
  const n = Number(id)
  return Number.isFinite(n) ? n : null
}
