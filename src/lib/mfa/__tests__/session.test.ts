import { describe, expect, it } from 'vitest'

import { assuranceFor, decodeSid } from '../sessionPure'

function jwtWith(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`
}

describe('assuranceFor', () => {
  const meta = [
    { sid: 's1', aal: 'aal2', mfaAt: '2026-06-29T12:00:00Z', stepUpAt: '2026-06-29T12:01:00Z' },
    { sid: 's2', aal: 'aal1' },
  ]
  it('returns aal2 with timestamps for an elevated session', () => {
    expect(assuranceFor(meta, 's1')).toEqual({ aal: 'aal2', mfaAt: '2026-06-29T12:00:00Z', stepUpAt: '2026-06-29T12:01:00Z' })
  })
  it('returns aal1 for a non-elevated session', () => {
    expect(assuranceFor(meta, 's2').aal).toBe('aal1')
  })
  it('defaults to aal1 when the sid is unknown, missing, or there is no meta', () => {
    expect(assuranceFor(meta, 'nope').aal).toBe('aal1')
    expect(assuranceFor(meta, undefined).aal).toBe('aal1')
    expect(assuranceFor(null, 's1').aal).toBe('aal1')
  })
})

describe('decodeSid', () => {
  it('reads the sid claim from a Payload JWT without verifying', () => {
    expect(decodeSid(jwtWith({ id: 1, collection: 'users', sid: 'abc-123' }))).toBe('abc-123')
  })
  it('returns undefined when there is no sid, or the token is malformed/empty', () => {
    expect(decodeSid(jwtWith({ id: 1 }))).toBeUndefined()
    expect(decodeSid('not-a-jwt')).toBeUndefined()
    expect(decodeSid('')).toBeUndefined()
    expect(decodeSid(null)).toBeUndefined()
  })
})
