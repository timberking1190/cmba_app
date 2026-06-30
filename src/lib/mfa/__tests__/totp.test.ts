import { describe, expect, it } from 'vitest'
import * as OTPAuth from 'otpauth'

import { currentStep, generateTotpSecret, totpUri, verifyTotp } from '../totp'

// Generate a valid token for a secret at a given timestamp, the way an app would.
function tokenAt(base32: string, ts: number): string {
  return new OTPAuth.TOTP({
    issuer: 'CMBA Connect',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32),
  }).generate({ timestamp: ts })
}

const NOW = 1_900_000_000_000 // fixed ms timestamp

describe('TOTP', () => {
  it('generates a 32-char base32 secret and an otpauth URI', () => {
    const secret = generateTotpSecret()
    expect(secret).toMatch(/^[A-Z2-7]{32}$/)
    expect(totpUri(secret, 'pat@example.com')).toMatch(/^otpauth:\/\/totp\//)
  })

  it('accepts a valid token and returns a step greater than lastStep', () => {
    const secret = generateTotpSecret()
    const token = tokenAt(secret, NOW)
    const step = verifyTotp(secret, token, 0, NOW)
    expect(step).not.toBeNull()
    expect(step!).toBe(currentStep(NOW))
  })

  it('rejects replay: the same code with lastStep already at that step', () => {
    const secret = generateTotpSecret()
    const token = tokenAt(secret, NOW)
    const step = verifyTotp(secret, token, 0, NOW)!
    // Second use with lastStep advanced to `step` must fail.
    expect(verifyTotp(secret, token, step, NOW)).toBeNull()
  })

  it('rejects a wrong / malformed token', () => {
    const secret = generateTotpSecret()
    expect(verifyTotp(secret, '000000', 0, NOW)).toBeNull() // (overwhelmingly) wrong
    expect(verifyTotp(secret, 'abcdef', 0, NOW)).toBeNull()
    expect(verifyTotp(secret, '12345', 0, NOW)).toBeNull() // too short
  })

  it('tolerates one step of clock skew (window) but advances the floor', () => {
    const secret = generateTotpSecret()
    const prevToken = tokenAt(secret, NOW - 30_000) // previous step
    const step = verifyTotp(secret, prevToken, 0, NOW)
    expect(step).toBe(currentStep(NOW) - 1)
  })
})
