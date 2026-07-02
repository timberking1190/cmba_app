import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { mintPassToken, verifyPassToken, TOKEN_TYP } from './token'

function keypair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  return {
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  }
}

const KID = 'k1'
const NOW = 1_800_000_000 // fixed clock (seconds)
const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')

describe('mint/verify round-trip', () => {
  it('verifies a freshly minted token and returns the exact D1 claims', () => {
    const kp = keypair()
    const token = mintPassToken({
      passSerial: 'serial-abc',
      jti: 'jti-1',
      channel: 'print',
      kid: KID,
      iat: NOW,
      exp: NOW + 500,
      privateKeyPem: kp.privateKeyPem,
    })
    const res = verifyPassToken(token, { resolvePublicKeyPem: () => kp.publicKeyPem, nowSeconds: NOW })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.claims).toEqual({
        iss: 'cmba',
        sub: 'serial-abc',
        jti: 'jti-1',
        iat: NOW,
        exp: NOW + 500,
        ch: 'print',
        v: 1,
      })
      expect(res.kid).toBe(KID)
    }
  })

  it('carries no PII — the compact payload has only the 7 fixed claims', () => {
    const kp = keypair()
    const token = mintPassToken({
      passSerial: 's',
      jti: 'j',
      channel: 'wallet',
      kid: KID,
      iat: NOW,
      exp: NOW + 1,
      privateKeyPem: kp.privateKeyPem,
    })
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    expect(Object.keys(claims).sort()).toEqual(['ch', 'exp', 'iat', 'iss', 'jti', 'sub', 'v'])
  })
})

describe('rejections', () => {
  it('rejects a tampered payload (signature no longer matches)', () => {
    const kp = keypair()
    const token = mintPassToken({
      passSerial: 'serial-abc',
      jti: 'j',
      channel: 'wallet',
      kid: KID,
      iat: NOW,
      exp: NOW + 1000,
      privateKeyPem: kp.privateKeyPem,
    })
    const [h, , s] = token.split('.')
    const forged = { iss: 'cmba', sub: 'ELSE', jti: 'j', iat: NOW, exp: NOW + 1000, ch: 'wallet', v: 1 }
    const tampered = `${h}.${enc(forged)}.${s}`
    const res = verifyPassToken(tampered, { resolvePublicKeyPem: () => kp.publicKeyPem, nowSeconds: NOW })
    expect(res).toEqual({ ok: false, reason: 'invalid_signature' })
  })

  it('rejects a token signed by a different key', () => {
    const signer = keypair()
    const other = keypair()
    const token = mintPassToken({
      passSerial: 's',
      jti: 'j',
      channel: 'wallet',
      kid: KID,
      iat: NOW,
      exp: NOW + 1000,
      privateKeyPem: signer.privateKeyPem,
    })
    const res = verifyPassToken(token, { resolvePublicKeyPem: () => other.publicKeyPem, nowSeconds: NOW })
    expect(res).toEqual({ ok: false, reason: 'invalid_signature' })
  })

  it('rejects alg:none / algorithm downgrade', () => {
    const kp = keypair()
    const header = { alg: 'none', kid: KID, typ: TOKEN_TYP }
    const claims = { iss: 'cmba', sub: 's', jti: 'j', iat: NOW, exp: NOW + 1000, ch: 'wallet', v: 1 }
    const token = `${enc(header)}.${enc(claims)}.deadbeef`
    const res = verifyPassToken(token, { resolvePublicKeyPem: () => kp.publicKeyPem, nowSeconds: NOW })
    expect(res).toEqual({ ok: false, reason: 'unsupported_alg' })
  })

  it('rejects an unexpected typ (checked before signature)', () => {
    const kp = keypair()
    const header = { alg: 'EdDSA', kid: KID, typ: 'JWT' }
    const claims = { iss: 'cmba', sub: 's', jti: 'j', iat: NOW, exp: NOW + 1000, ch: 'wallet', v: 1 }
    const token = `${enc(header)}.${enc(claims)}.whatever`
    const res = verifyPassToken(token, { resolvePublicKeyPem: () => kp.publicKeyPem, nowSeconds: NOW })
    expect(res).toEqual({ ok: false, reason: 'unsupported_typ' })
  })

  it('rejects an unknown kid before doing any crypto', () => {
    const kp = keypair()
    const token = mintPassToken({
      passSerial: 's',
      jti: 'j',
      channel: 'wallet',
      kid: KID,
      iat: NOW,
      exp: NOW + 1000,
      privateKeyPem: kp.privateKeyPem,
    })
    const res = verifyPassToken(token, { resolvePublicKeyPem: () => null, nowSeconds: NOW })
    expect(res).toEqual({ ok: false, reason: 'unknown_kid' })
  })

  it('rejects an expired token (and honors clock tolerance)', () => {
    const kp = keypair()
    const token = mintPassToken({
      passSerial: 's',
      jti: 'j',
      channel: 'wallet',
      kid: KID,
      iat: NOW - 100,
      exp: NOW - 10,
      privateKeyPem: kp.privateKeyPem,
    })
    expect(
      verifyPassToken(token, { resolvePublicKeyPem: () => kp.publicKeyPem, nowSeconds: NOW }).ok,
    ).toBe(false)
    const res = verifyPassToken(token, {
      resolvePublicKeyPem: () => kp.publicKeyPem,
      nowSeconds: NOW,
      clockToleranceSeconds: 30,
    })
    expect(res.ok).toBe(true)
  })

  it('rejects malformed input', () => {
    const kp = keypair()
    for (const bad of ['', 'a.b', 'a.b.c.d', 'not-a-token', '..']) {
      expect(
        verifyPassToken(bad, { resolvePublicKeyPem: () => kp.publicKeyPem, nowSeconds: NOW }).ok,
      ).toBe(false)
    }
  })
})
