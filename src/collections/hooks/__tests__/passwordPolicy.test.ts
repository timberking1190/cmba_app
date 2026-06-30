import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Replace the breached-password check so the policy logic is tested without network.
vi.mock('../../../lib/security/hibp', () => ({ isPwned: vi.fn() }))

import { validatePassword } from '../passwordPolicy'
import { isPwned } from '../../../lib/security/hibp'

const mockedIsPwned = vi.mocked(isPwned)
const req = { payload: { logger: { warn: () => {} } } } as never

async function run(data: Record<string, unknown>) {
  return (validatePassword as unknown as (a: { data: unknown; req: unknown }) => Promise<unknown>)({ data, req })
}

// ValidationError puts the per-field message in error.data.errors[].message
// (error.message is the generic wrapper). Return the field message, or '' if it resolved.
async function reason(data: Record<string, unknown>): Promise<string> {
  try {
    await run(data)
    return ''
  } catch (e) {
    const err = e as { data?: { errors?: { message?: string }[] }; message?: string }
    return err?.data?.errors?.[0]?.message ?? err?.message ?? ''
  }
}

beforeEach(() => mockedIsPwned.mockResolvedValue(false))
afterEach(() => vi.clearAllMocks())

describe('validatePassword', () => {
  it('is a no-op when no password is present (profile edit)', async () => {
    await expect(run({ fullName: 'Pat Coach' })).resolves.toBeDefined()
    expect(mockedIsPwned).not.toHaveBeenCalled() // never reaches the breach check
  })

  it('rejects passwords shorter than 12 characters', async () => {
    expect(await reason({ password: 'Short1!' })).toMatch(/at least 12/i)
  })

  it('rejects passwords longer than 128 characters', async () => {
    expect(await reason({ password: 'a'.repeat(129) })).toMatch(/at most 128/i)
  })

  it('accepts a long passphrase with any characters when not breached', async () => {
    await expect(run({ password: 'correct horse battery staple river' })).resolves.toBeDefined()
  })

  it('rejects a password equal to the email or name (contextual blocklist)', async () => {
    expect(await reason({ password: 'pat@example.com', email: 'pat@example.com' })).toMatch(/name or email/i)
    expect(await reason({ password: 'jordan rivera', fullName: 'Jordan Rivera' })).toMatch(/name or email/i)
  })

  it('rejects a breached password', async () => {
    mockedIsPwned.mockResolvedValue(true)
    expect(await reason({ password: 'a-sufficiently-long-but-pwned-1' })).toMatch(/data breach/i)
  })

  it('enforces NO composition rules (a long all-lowercase passphrase is fine)', async () => {
    await expect(run({ password: 'all lowercase words only here' })).resolves.toBeDefined()
  })
})
