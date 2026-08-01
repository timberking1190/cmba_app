import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/*
 * Stage C / S1 — application-layer encryption for the most sensitive secrets
 * (today: TOTP shared secrets). AES-256-GCM (authenticated) with a 32-byte key
 * from TOTP_ENC_KEY, which is separate from PAYLOAD_SECRET and treated as a
 * managed key (rotating it invalidates existing TOTP enrollments). Output layout
 * is base64( iv(12) || authTag(16) || ciphertext ). Tampering fails the auth tag
 * and throws on decrypt, never returning forged plaintext.
 *
 * authTagLength is stated explicitly on both sides. GCM accepts truncated tags
 * (Node allows 4, 8, and 12 through 16 bytes), and a shorter tag is materially
 * easier to forge. The layout here always slices exactly 16 bytes, so a short tag
 * could not be supplied anyway, but pinning the length means Node enforces that
 * invariant rather than it resting on the slice arithmetic staying correct.
 *
 * 16 is the GCM default, so this changes NO output and every secret already
 * encrypted keeps decrypting. That is covered by a test.
 */
const AUTH_TAG_BYTES = 16

function key(): Buffer {
  const b64 = process.env.TOTP_ENC_KEY
  if (!b64) throw new Error('TOTP_ENC_KEY is not set')
  const k = Buffer.from(b64, 'base64')
  if (k.length !== 32) throw new Error('TOTP_ENC_KEY must decode to 32 bytes')
  return k
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv, { authTagLength: AUTH_TAG_BYTES })
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decryptSecret(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64')
  if (buf.length < 28) throw new Error('ciphertext too short')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 12 + AUTH_TAG_BYTES)
  const ct = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key(), iv, { authTagLength: AUTH_TAG_BYTES })
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
