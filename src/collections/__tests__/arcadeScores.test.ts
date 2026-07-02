import { afterEach, describe, expect, it, vi } from 'vitest'

import { ArcadeScores } from '../ArcadeScores'

/*
 * Server-side gate tests for the arcade leaderboard. These call the collection's
 * beforeValidate hook directly with a mocked Payload request, proving the SERVER
 * rejects abuse even when the client is bypassed entirely (no browser involved).
 * The payload store is mocked so nothing touches a real database.
 */

type CountResult = { totalDocs: number }

function mockReq(opts: { headers?: Record<string, string>; count?: number } = {}) {
  const count = opts.count ?? 0
  return {
    user: undefined,
    headers: new Headers(opts.headers ?? {}),
    payload: {
      count: vi.fn(async (): Promise<CountResult> => ({ totalDocs: count })),
      create: vi.fn(async () => ({})),
      logger: { error: vi.fn() },
    },
  }
}

const hook = ArcadeScores.hooks!.beforeValidate![0] as unknown as (args: {
  req: ReturnType<typeof mockReq>
  data: Record<string, unknown>
  operation: string
}) => Promise<unknown>

const call = (data: Record<string, unknown>, req = mockReq()) =>
  hook({ req, data, operation: 'create' })

afterEach(() => {
  delete process.env.TURNSTILE_SECRET
  vi.restoreAllMocks()
})

describe('ArcadeScores server gate', () => {
  it('accepts a clean name (no throw)', async () => {
    await expect(call({ name: 'SWISH', score: 7 })).resolves.toBeUndefined()
  })

  it('rejects an explicit name even though the client is bypassed', async () => {
    await expect(call({ name: 'FUCK', score: 7 })).rejects.toThrow(/another name/i)
  })

  it('rejects leetspeak evasion server-side', async () => {
    await expect(call({ name: 'SH1T', score: 3 })).rejects.toThrow()
  })

  it('rejects a tripped honeypot', async () => {
    await expect(call({ name: 'ACE', score: 1 }, mockReq({ headers: { 'x-cmba-hp': 'hp' } }))).rejects.toThrow(
      /rejected/i,
    )
  })

  it('rate limits when the per-IP window is full', async () => {
    await expect(call({ name: 'ACE', score: 1 }, mockReq({ count: 9999 }))).rejects.toThrow(/too many/i)
  })

  it('requires a Turnstile token when the challenge is enabled', async () => {
    process.env.TURNSTILE_SECRET = 'test-secret'
    // No x-cmba-turnstile header -> verifyTurnstile returns false without a network call.
    await expect(call({ name: 'ACE', score: 1 })).rejects.toThrow(/bot challenge/i)
  })
})

describe('ArcadeScores read access (only public, non-hidden rows)', () => {
  const read = ArcadeScores.access!.read as (args: { req: { user: unknown } }) => unknown

  it('restricts anonymous reads to non-hidden entries', () => {
    const result = read({ req: { user: undefined } })
    expect(result).toEqual({ hidden: { not_equals: true } })
  })
})
