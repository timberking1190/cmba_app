import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/*
 * Stage C / S1 — application-layer encryption for the most sensitive secrets
 * (today: TOTP shared secrets). AES-256-GCM (authenticated) with a 32-byte key
 * from TOTP_ENC_KEY, which is separate from PAYLOAD_SECRET and treated as a
 * managed key (rotating it invalidates existing TOTP enrollments). Output layout
 * is base64( iv(12) || authTag(16) || ciphertext ). Tampering fails the auth tag
 * and throws on decrypt, never returning forged plaintext.
 */

function key(): Buffer {
  const b64 = process.env.TOTP_ENC_KEY
  if (!b64) throw new Error('TOTP_ENC_KEY is not set')
  const k = Buffer.from(b64, 'base64')
  if (k.length !== 32) throw new Error('TOTP_ENC_KEY must decode to 32 bytes')
  return k
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decryptSecret(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64')
  if (buf.length < 28) throw new Error('ciphertext too short')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ct = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
