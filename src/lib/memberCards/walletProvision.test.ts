import { describe, expect, it } from 'vitest'

import { applePassAuthToken, validThruLabel, verifyAppleAuthToken, WalletProvisionError } from './walletProvision'

describe('walletProvision — Apple auth token', () => {
  it('is deterministic per (secret, serial) and unguessable across serials', () => {
    const a = applePassAuthToken('secret', 'serial-1')
    expect(applePassAuthToken('secret', 'serial-1')).toBe(a)
    expect(applePassAuthToken('secret', 'serial-2')).not.toBe(a)
    expect(applePassAuthToken('other', 'serial-1')).not.toBe(a)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('verifies only the exact token (constant-time, length-safe)', () => {
    const token = applePassAuthToken('secret', 'serial-1')
    expect(verifyAppleAuthToken('secret', 'serial-1', token)).toBe(true)
    expect(verifyAppleAuthToken('secret', 'serial-1', token.slice(0, -1) + '0')).toBe(false)
    expect(verifyAppleAuthToken('secret', 'serial-1', 'short')).toBe(false)
    expect(verifyAppleAuthToken('secret', 'serial-1', null)).toBe(false)
    expect(verifyAppleAuthToken('secret', 'serial-2', token)).toBe(false)
  })
})

describe('walletProvision — misc', () => {
  it('validThruLabel formats a Mon YYYY label', () => {
    // 2027-08-15T00:00:00Z
    expect(validThruLabel(Math.floor(Date.UTC(2027, 7, 15) / 1000))).toMatch(/2027/)
  })

  it('WalletProvisionError carries a machine-readable code', () => {
    const err = new WalletProvisionError('not_scannable', 'nope')
    expect(err.code).toBe('not_scannable')
    expect(err).toBeInstanceOf(Error)
  })
})
