import { createPrivateKey, generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { buildPublicKeyResolver, getActiveSigningKey, isSigningConfigured, normalizePem } from './keys'
import { mintPassToken, verifyPassToken } from './token'

function pems() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  return {
    pub: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    priv: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  }
}

describe('signing key resolution', () => {
  it('resolves the active key + verify map from the JSON form', () => {
    const a = pems()
    const b = pems()
    const env = {
      MEMBERCARD_SIGNING_KID: 'k2',
      MEMBERCARD_SIGNING_PRIVATE_KEY: b.priv,
      MEMBERCARD_SIGNING_PUBLIC_KEYS: JSON.stringify({ k1: a.pub, k2: b.pub }),
    }

    expect(getActiveSigningKey(env)).toEqual({ kid: 'k2', privateKeyPem: b.priv })
    const resolve = buildPublicKeyResolver(env)
    expect(resolve('k1')).toBe(a.pub) // retired-but-still-verifiable key survives rotation
    expect(resolve('k2')).toBe(b.pub)
    expect(resolve('nope')).toBeNull()
    expect(isSigningConfigured(env)).toBe(true)
  })

  it('supports the single-key fallback form', () => {
    const a = pems()
    const env = {
      MEMBERCARD_SIGNING_KID: 'k1',
      MEMBERCARD_SIGNING_PRIVATE_KEY: a.priv,
      MEMBERCARD_SIGNING_PUBLIC_KEY: a.pub,
    }
    expect(buildPublicKeyResolver(env)('k1')).toBe(a.pub)
    expect(isSigningConfigured(env)).toBe(true)
  })

  it('returns null / not-configured when keys are absent (dev)', () => {
    const env = {}
    expect(getActiveSigningKey(env)).toBeNull()
    expect(isSigningConfigured(env)).toBe(false)
    expect(buildPublicKeyResolver(env)('k1')).toBeNull()
  })

  it('tolerates malformed public-keys JSON', () => {
    const a = pems()
    const env = {
      MEMBERCARD_SIGNING_KID: 'k1',
      MEMBERCARD_SIGNING_PRIVATE_KEY: a.priv,
      MEMBERCARD_SIGNING_PUBLIC_KEY: a.pub,
      MEMBERCARD_SIGNING_PUBLIC_KEYS: '{not json',
    }
    expect(buildPublicKeyResolver(env)('k1')).toBe(a.pub)
  })
})

describe('normalizePem (ERR_OSSL_UNSUPPORTED fix)', () => {
  it('leaves a clean PEM byte-identical', () => {
    const { priv } = pems()
    expect(normalizePem(priv)).toBe(priv)
  })

  it('restores real newlines from an escaped-\\n env value so the key parses', () => {
    const { priv } = pems()
    const escaped = priv.replace(/\n/g, '\\n') // how env stores often mangle multi-line PEMs
    expect(() => createPrivateKey({ key: escaped, format: 'pem' })).toThrow() // broken as-is
    expect(() => createPrivateKey({ key: normalizePem(escaped), format: 'pem' })).not.toThrow()
  })

  it('strips a single pair of wrapping quotes', () => {
    const { priv } = pems()
    expect(() => createPrivateKey({ key: normalizePem(`"${priv}"`), format: 'pem' })).not.toThrow()
  })

  it('end-to-end: an escaped-\\n env key still mints + verifies a pass token', () => {
    const { pub, priv } = pems()
    const env = {
      MEMBERCARD_SIGNING_KID: 'k',
      MEMBERCARD_SIGNING_PRIVATE_KEY: priv.replace(/\n/g, '\\n'),
      MEMBERCARD_SIGNING_PUBLIC_KEY: pub.replace(/\n/g, '\\n'),
    }
    expect(isSigningConfigured(env)).toBe(true)
    const key = getActiveSigningKey(env)!
    const iat = 1_700_000_000
    const token = mintPassToken({ passSerial: 's1', jti: 'j1', channel: 'wallet', kid: 'k', iat, exp: iat + 3600, privateKeyPem: key.privateKeyPem })
    const res = verifyPassToken(token, { resolvePublicKeyPem: buildPublicKeyResolver(env), nowSeconds: iat })
    expect(res.ok).toBe(true)
  })
})
