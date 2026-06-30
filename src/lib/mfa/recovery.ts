import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto'

/*
 * Stage C / S1 — one-time recovery codes for enrolled users who lose their
 * authenticator. Codes are short (about 50 bits), below the NIST 112-bit
 * look-up-secret threshold, so they are salted + PBKDF2 hashed (not bare SHA-256)
 * and compared in constant time. Single use; regenerating replaces the whole set.
 */

const CODE_COUNT = 10
const PBKDF2_ITERATIONS = 100_000
const KEYLEN = 32
// Crockford base32 (no I, L, O, U) to avoid ambiguous characters.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function genCode(): string {
  const bytes = randomBytes(10)
  let s = ''
  for (const b of bytes) s += ALPHABET[b % 32]
  return `${s.slice(0, 5)}-${s.slice(5, 10)}`
}

export function generateRecoveryCodes(count = CODE_COUNT): string[] {
  return Array.from({ length: count }, genCode)
}

/** Normalize for hashing: strip spaces/dashes, uppercase (display form is cosmetic). */
export function normalizeCode(code: string): string {
  return (code || '').replace(/[\s-]/g, '').toUpperCase()
}

export function hashRecoveryCode(code: string, salt?: string): { hash: string; salt: string } {
  const s = salt ?? randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(normalizeCode(code), s, PBKDF2_ITERATIONS, KEYLEN, 'sha256').toString('hex')
  return { hash, salt: s }
}

export function verifyRecoveryCode(code: string, hash: string, salt: string): boolean {
  if (!hash || !salt) return false
  const computed = hashRecoveryCode(code, salt).hash
  const a = Buffer.from(computed, 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
