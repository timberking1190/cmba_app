import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getClientIp,
  hashIp,
  honeypotTripped,
  isTurnstileEnabled,
  verifyTurnstile,
  HONEYPOT_HEADER,
} from '../botChallenge'

function headers(init: Record<string, string>): Headers {
  return new Headers(init)
}

afterEach(() => {
  delete process.env.TURNSTILE_SECRET
  vi.restoreAllMocks()
})

describe('honeypotTripped', () => {
  it('trips when the hidden field carries any value', () => {
    expect(honeypotTripped(headers({ [HONEYPOT_HEADER]: 'hp' }))).toBe(true)
    expect(honeypotTripped(headers({ [HONEYPOT_HEADER]: 'timing' }))).toBe(true)
  })
  it('passes when empty or absent', () => {
    expect(honeypotTripped(headers({ [HONEYPOT_HEADER]: '' }))).toBe(false)
    expect(honeypotTripped(headers({}))).toBe(false)
  })
})

describe('getClientIp', () => {
  it('takes the first hop of x-forwarded-for', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7')
  })
  it('falls back to x-real-ip then unknown', () => {
    expect(getClientIp(headers({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2')
    expect(getClientIp(headers({}))).toBe('unknown')
  })
})

describe('hashIp', () => {
  it('is deterministic, non-reversible-looking, and never the raw IP', () => {
    const ip = '203.0.113.7'
    const a = hashIp(ip)
    const b = hashIp(ip)
    expect(a).toBe(b)
    expect(a).not.toContain(ip)
    expect(a).toMatch(/^[0-9a-f]{40}$/)
    expect(hashIp('203.0.113.8')).not.toBe(a)
  })
})

describe('verifyTurnstile', () => {
  it('passes through (challenge disabled) when no secret is set', async () => {
    expect(isTurnstileEnabled()).toBe(false)
    expect(await verifyTurnstile(null, '1.2.3.4')).toBe(true)
  })

  it('fails closed on a missing token when enabled', async () => {
    process.env.TURNSTILE_SECRET = 'secret'
    expect(isTurnstileEnabled()).toBe(true)
    expect(await verifyTurnstile(null, '1.2.3.4')).toBe(false)
  })

  it('honours the siteverify result when enabled', async () => {
    process.env.TURNSTILE_SECRET = 'secret'
    const ok = { json: async () => ({ success: true }) } as Response
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok)
    expect(await verifyTurnstile('token', '1.2.3.4')).toBe(true)

    const bad = { json: async () => ({ success: false }) } as Response
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(bad)
    expect(await verifyTurnstile('token', '1.2.3.4')).toBe(false)
  })

  it('fails closed when siteverify errors', async () => {
    process.env.TURNSTILE_SECRET = 'secret'
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))
    expect(await verifyTurnstile('token', '1.2.3.4')).toBe(false)
  })
})
