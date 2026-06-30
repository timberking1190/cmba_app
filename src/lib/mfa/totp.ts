import * as OTPAuth from 'otpauth'

/*
 * Stage C / S1 — TOTP (authenticator app) second factor, on top of otpauth.
 *
 * Replay protection: verifyTotp returns the absolute 30s time-step the token
 * belongs to. The caller persists it as `lastStep` and must reject any token whose
 * step is <= the stored lastStep, so a code cannot be reused inside its validity
 * window (or replayed at all). A window of 1 tolerates +/- one step of clock skew.
 */

const ISSUER = 'CMBA Connect'
const PERIOD = 30
const DIGITS = 6
const ALGORITHM = 'SHA1' // RFC 6238 default; what every authenticator app expects

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32
}

function totpFor(base32: string, label?: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: label ?? 'account',
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(base32),
  })
}

/** otpauth:// provisioning URI for the QR code shown once at enrollment. */
export function totpUri(base32: string, accountLabel: string): string {
  return totpFor(base32, accountLabel).toString()
}

export function currentStep(now: number = Date.now()): number {
  return Math.floor(now / 1000 / PERIOD)
}

/**
 * Verify a token with replay protection. Returns the absolute time-step the token
 * matched (to be stored as the new lastStep), or null if invalid OR already used
 * (step <= lastStep).
 */
export function verifyTotp(
  base32: string,
  token: string,
  lastStep: number,
  now: number = Date.now(),
  window = 1,
): number | null {
  const clean = (token || '').replace(/\s/g, '')
  if (!/^\d{6}$/.test(clean)) return null
  const delta = totpFor(base32).validate({ token: clean, timestamp: now, window })
  if (delta === null) return null
  const step = currentStep(now) + delta
  if (step <= lastStep) return null // replay / reuse
  return step
}
