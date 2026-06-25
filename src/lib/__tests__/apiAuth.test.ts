import { describe, expect, it } from 'vitest'

import { decideRefresh, generateToken, hashToken } from '../api/auth'

const NOW = new Date('2026-06-25T12:00:00Z')
const DAY = 86400000
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY).toISOString()

describe('decideRefresh', () => {
  it('rotates a fresh, unrevoked, unexpired token', () => {
    expect(decideRefresh({ expiresAt: inDays(30) }, NOW)).toBe('rotate')
  })

  it('flags a revoked token as a reuse attack', () => {
    expect(decideRefresh({ revoked: true, expiresAt: inDays(30) }, NOW)).toBe('reuse-detected')
  })

  it('flags an already-rotated token (replacedBy set) as a reuse attack', () => {
    expect(decideRefresh({ replacedBy: 'abc', expiresAt: inDays(30) }, NOW)).toBe('reuse-detected')
  })

  it('reports an expired token as expired', () => {
    expect(decideRefresh({ expiresAt: inDays(-1) }, NOW)).toBe('expired')
  })

  it('reports a missing record as invalid', () => {
    expect(decideRefresh(null, NOW)).toBe('invalid')
  })
})

describe('hashToken / generateToken', () => {
  it('hashes deterministically and never returns the plaintext', () => {
    const h = hashToken('secret-token')
    expect(h).toBe(hashToken('secret-token'))
    expect(h).not.toBe('secret-token')
    expect(h).toHaveLength(64) // sha256 hex
  })

  it('generates unique high-entropy tokens', () => {
    const a = generateToken()
    const b = generateToken()
    expect(a).not.toBe(b)
    expect(a).toHaveLength(64)
  })
})
