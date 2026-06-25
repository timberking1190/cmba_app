import { describe, expect, it } from 'vitest'

import { decideIdempotency, hashRequest } from '../api/idempotency'

describe('decideIdempotency', () => {
  it('runs when there is no existing record', () => {
    expect(decideIdempotency(null, 'u1', 'h1')).toEqual({ action: 'run' })
  })

  it('replays the stored response for the same key, user, and body', () => {
    const existing = { userId: 'u1', requestHash: 'h1', statusCode: 201, responseBody: { ok: true } }
    expect(decideIdempotency(existing, 'u1', 'h1')).toEqual({ action: 'replay', statusCode: 201, responseBody: { ok: true } })
  })

  it('rejects the same key from a different user with 403', () => {
    const existing = { userId: 'u1', requestHash: 'h1' }
    expect(decideIdempotency(existing, 'u2', 'h1')).toMatchObject({ action: 'error', statusCode: 403 })
  })

  it('rejects the same key with a different request body with 409', () => {
    const existing = { userId: 'u1', requestHash: 'h1' }
    expect(decideIdempotency(existing, 'u1', 'h2')).toMatchObject({ action: 'error', statusCode: 409 })
  })
})

describe('hashRequest', () => {
  it('is stable regardless of object key order (same logical body, same hash)', () => {
    const a = hashRequest('POST', '/x', { homeScore: 50, awayScore: 48 })
    const b = hashRequest('POST', '/x', { awayScore: 48, homeScore: 50 })
    expect(a).toBe(b)
  })

  it('differs when the logical body differs', () => {
    const a = hashRequest('POST', '/x', { homeScore: 50, awayScore: 48 })
    const b = hashRequest('POST', '/x', { homeScore: 51, awayScore: 48 })
    expect(a).not.toBe(b)
  })

  it('differs when the path differs', () => {
    expect(hashRequest('POST', '/a', { s: 1 })).not.toBe(hashRequest('POST', '/b', { s: 1 }))
  })
})
