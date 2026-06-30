import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { decryptSecret, encryptSecret } from '../crypto'

const KEY = Buffer.alloc(32, 7).toString('base64') // deterministic 32-byte test key

let prev: string | undefined
beforeAll(() => {
  prev = process.env.TOTP_ENC_KEY
  process.env.TOTP_ENC_KEY = KEY
})
afterAll(() => {
  if (prev === undefined) delete process.env.TOTP_ENC_KEY
  else process.env.TOTP_ENC_KEY = prev
})

describe('AES-256-GCM secret encryption', () => {
  it('round-trips a secret', () => {
    const secret = 'JBSWY3DPEHPK3PXP'
    expect(decryptSecret(encryptSecret(secret))).toBe(secret)
  })

  it('produces different ciphertext each time (random IV)', () => {
    const a = encryptSecret('same')
    const b = encryptSecret('same')
    expect(a).not.toBe(b)
    expect(decryptSecret(a)).toBe('same')
    expect(decryptSecret(b)).toBe('same')
  })

  it('rejects tampered ciphertext (auth tag fails)', () => {
    const enc = encryptSecret('tamper-me')
    const buf = Buffer.from(enc, 'base64')
    buf[buf.length - 1] ^= 0x01 // flip a ciphertext byte
    expect(() => decryptSecret(buf.toString('base64'))).toThrow()
  })

  it('throws when the key is missing or wrong length', () => {
    const saved = process.env.TOTP_ENC_KEY
    process.env.TOTP_ENC_KEY = ''
    expect(() => encryptSecret('x')).toThrow(/TOTP_ENC_KEY/)
    process.env.TOTP_ENC_KEY = Buffer.alloc(16, 1).toString('base64') // 16 bytes, too short
    expect(() => encryptSecret('x')).toThrow(/32 bytes/)
    process.env.TOTP_ENC_KEY = saved
  })
})
