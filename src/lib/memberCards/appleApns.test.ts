import { generateKeyPairSync, verify as cryptoVerify } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { apnsHost, mintApnsJwt, pushPassUpdates, type ApnsSend } from './appleApns'
import type { AppleWalletConfig } from './walletKeys'

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const p8Pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string

const cfg = {
  teamId: 'D433C7C7BQ',
  passTypeId: 'pass.ca.cmba.member',
  apnsKeyId: 'VJQB268XAC',
  apnsKeyPem: p8Pem,
  apnsEnvironment: 'production',
} as AppleWalletConfig

const decodeSeg = (jwt: string, i: number) => JSON.parse(Buffer.from(jwt.split('.')[i], 'base64url').toString('utf8'))

describe('appleApns', () => {
  it('targets the production host by default and sandbox only when asked', () => {
    expect(apnsHost('production')).toBe('https://api.push.apple.com')
    expect(apnsHost('sandbox')).toBe('https://api.sandbox.push.apple.com')
  })

  it('mints a valid ES256 JWT with a JOSE (r||s) signature', () => {
    const jwt = mintApnsJwt(cfg, 1_700_000_000)
    expect(decodeSeg(jwt, 0)).toEqual({ alg: 'ES256', kid: 'VJQB268XAC' })
    expect(decodeSeg(jwt, 1)).toEqual({ iss: 'D433C7C7BQ', iat: 1_700_000_000 })
    const [h, c, s] = jwt.split('.')
    // ieee-p1363 → 64-byte signature; DER verification would fail on it.
    const sig = Buffer.from(s, 'base64url')
    expect(sig.length).toBe(64)
    const ok = cryptoVerify('SHA256', Buffer.from(`${h}.${c}`), { key: pubPem, dsaEncoding: 'ieee-p1363' }, sig)
    expect(ok).toBe(true)
  })

  it('sends per-target, flags 410/Unregistered for pruning, and survives a thrown send', async () => {
    const send: ApnsSend = async (req) => {
      if (req.path.endsWith('/good')) return { status: 200, body: '' }
      if (req.path.endsWith('/gone')) return { status: 410, body: JSON.stringify({ reason: 'Unregistered' }) }
      throw new Error('connection reset')
    }
    const results = await pushPassUpdates(
      cfg,
      [
        { pushToken: 'good', registrationId: 1 },
        { pushToken: 'gone', registrationId: 2 },
        { pushToken: 'boom', registrationId: 3 },
      ],
      { now: 1, send },
    )
    expect(results.find((r) => r.pushToken === 'good')).toMatchObject({ status: 200, shouldPrune: false })
    expect(results.find((r) => r.pushToken === 'gone')).toMatchObject({ status: 410, reason: 'Unregistered', shouldPrune: true })
    expect(results.find((r) => r.pushToken === 'boom')).toMatchObject({ status: 0, shouldPrune: false })
  })

  it('passes apns-topic = pass type id and an empty body', async () => {
    let seen: { headers: Record<string, string>; body: string } | null = null
    const send: ApnsSend = async (req) => {
      seen = { headers: req.headers, body: req.body }
      return { status: 200, body: '' }
    }
    await pushPassUpdates(cfg, [{ pushToken: 'x' }], { now: 1, send })
    expect(seen!.headers['apns-topic']).toBe('pass.ca.cmba.member')
    expect(seen!.headers.authorization.startsWith('bearer ')).toBe(true)
    expect(seen!.body).toBe('{}')
  })
})
