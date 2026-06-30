import { afterEach, describe, expect, it, vi } from 'vitest'

import { isPwned, sha1Upper, suffixIsPwned } from '../hibp'

afterEach(() => vi.restoreAllMocks())

describe('sha1Upper', () => {
  it('hashes deterministically to uppercase hex (known vector for "password")', () => {
    // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    expect(sha1Upper('password')).toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8')
  })
})

describe('suffixIsPwned', () => {
  const suffix = '1E4C9B93F3F0682250B6CF8331B7EE68FD8' // 35 chars after the 5-char prefix
  it('matches a suffix with a non-zero count', () => {
    expect(suffixIsPwned(`${suffix}:42\nOTHER:1`, suffix)).toBe(true)
  })
  it('treats a padding row (count 0) as not pwned', () => {
    expect(suffixIsPwned(`${suffix}:0`, suffix)).toBe(false)
  })
  it('is case-insensitive and ignores unrelated rows', () => {
    expect(suffixIsPwned(`${suffix.toLowerCase()}:7`, suffix)).toBe(true)
    expect(suffixIsPwned(`AAAA:9\nBBBB:9`, suffix)).toBe(false)
  })
})

describe('isPwned', () => {
  it('reports a breached password and sends only the 5-char prefix (k-anonymity)', async () => {
    const hash = sha1Upper('password')
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:1337`,
    } as Response)
    expect(await isPwned('password')).toBe(true)
    // The request URL must contain ONLY the prefix, never the full hash/suffix.
    const url = String(spy.mock.calls[0]![0])
    expect(url).toContain(prefix)
    expect(url).not.toContain(suffix)
  })

  it('allows a password whose suffix is absent from the range', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:3',
    } as Response)
    expect(await isPwned('a-very-unlikely-passphrase-9281')).toBe(false)
  })

  it('fails open on a non-OK response and on a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response)
    expect(await isPwned('password')).toBe(false)
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('timeout'))
    expect(await isPwned('password')).toBe(false)
  })
})
