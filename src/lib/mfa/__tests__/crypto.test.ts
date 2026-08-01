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

/*
 * BACKWARD COMPATIBILITY after pinning authTagLength.
 *
 * Real members already have TOTP secrets encrypted in production by the previous
 * implementation, which called createCipheriv WITHOUT an explicit authTagLength.
 * If pinning it changed the format, every one of those members would be locked
 * out of two factor. These tests encrypt exactly the way the old code did and
 * prove the current code still reads it.
 */
describe('authTagLength pinning is format compatible', () => {
  const RAW_KEY = Buffer.alloc(32, 7)

  /** Byte for byte what the previous implementation did. */
  function encryptTheOldWay(plaintext: string): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createCipheriv, randomBytes } = require('crypto')
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', RAW_KEY, iv)
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64')
  }

  it('decrypts a secret written by the PREVIOUS implementation', () => {
    // If this fails, everyone already enrolled in two factor is locked out.
    const secret = 'JBSWY3DPEHPK3PXP'
    expect(decryptSecret(encryptTheOldWay(secret))).toBe(secret)
  })

  it('emits the identical layout, iv(12) + tag(16) + ciphertext', () => {
    const now = Buffer.from(encryptSecret('x'), 'base64')
    const before = Buffer.from(encryptTheOldWay('x'), 'base64')
    expect(now.length).toBe(before.length)
    expect(now.length).toBe(12 + 16 + 1)
  })

  it('rejects a tampered authentication tag', () => {
    const buf = Buffer.from(encryptSecret('JBSWY3DPEHPK3PXP'), 'base64')
    buf[12] ^= 0xff // first byte of the tag
    expect(() => decryptSecret(buf.toString('base64'))).toThrow()
  })

  it('rejects input too short to hold an iv and a tag', () => {
    expect(() => decryptSecret(Buffer.alloc(20).toString('base64'))).toThrow(/too short/)
  })
})
