import { generateKeyPairSync, createVerify } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  buildGenericClass,
  buildGenericObject,
  buildSaveUrl,
  buildSaveUrlInline,
  defaultClassId,
  getAccessToken,
  objectId,
  signRs256Jwt,
} from './googleWallet'
import type { GoogleServiceAccount, GoogleWalletConfig } from './walletKeys'

// A throwaway RSA keypair standing in for the service-account key.
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string

const sa: GoogleServiceAccount = { client_email: 'signer@cmba-wallet.iam.gserviceaccount.com', private_key: privPem }
const cfg: GoogleWalletConfig = { issuerId: '3388000000023180302', serviceAccount: sa, classId: null, demoMode: true }

const decodeSeg = (jwt: string, i: number) => JSON.parse(Buffer.from(jwt.split('.')[i], 'base64url').toString('utf8'))

describe('googleWallet — signing', () => {
  it('signRs256Jwt produces a verifiable RS256 JWS', () => {
    const jwt = signRs256Jwt({ hello: 'world' }, privPem)
    const [h, c, s] = jwt.split('.')
    expect(decodeSeg(jwt, 0)).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(decodeSeg(jwt, 1)).toEqual({ hello: 'world' })
    const ok = createVerify('RSA-SHA256').update(`${h}.${c}`).verify(pubPem, Buffer.from(s, 'base64url'))
    expect(ok).toBe(true)
  })

  it('buildSaveUrl references the object by id under the save host', () => {
    const url = buildSaveUrl(cfg, 'issuer.serial', { now: 1_700_000_000 })
    expect(url.startsWith('https://pay.google.com/gp/v/save/')).toBe(true)
    const jwt = url.slice('https://pay.google.com/gp/v/save/'.length)
    const claims = decodeSeg(jwt, 1)
    expect(claims.aud).toBe('google')
    expect(claims.typ).toBe('savetowallet')
    expect(claims.payload.genericObjects).toEqual([{ id: 'issuer.serial' }])
  })

  it('buildSaveUrlInline embeds the full class + object', () => {
    const obj = buildGenericObject({
      classId: defaultClassId(cfg.issuerId),
      objectId: objectId(cfg.issuerId, 'abc'),
      memberNumber: 'CMBA-00042',
      displayName: 'Sam Coach',
      roleLabel: 'Coach',
      season: '2026-27',
      token: 'TOKEN',
      logoUri: 'https://x/logo.png',
    })
    const url = buildSaveUrlInline(cfg, obj, { now: 1 })
    const claims = decodeSeg(url.split('/save/')[1], 1)
    expect(claims.payload.genericClasses).toHaveLength(1)
    expect(claims.payload.genericObjects[0].barcode.value).toBe('TOKEN')
  })
})

describe('googleWallet — payloads + ids', () => {
  it('derives stable ids', () => {
    expect(defaultClassId('123')).toBe('123.cmba_member')
    expect(objectId('123', 'aa-bb.cc')).toBe('123.aa-bb.cc')
    expect(objectId('123', 'weird/slash id')).toBe('123.weirdslashid')
  })

  it('buildGenericClass is minimal + stable', () => {
    expect(buildGenericClass('123.cmba_member')).toEqual({ id: '123.cmba_member', enableSmartTap: false })
  })

  it('buildGenericObject carries QR = token + member fields', () => {
    const obj = buildGenericObject({
      classId: '123.cmba_member',
      objectId: '123.abc',
      memberNumber: 'CMBA-00042',
      displayName: 'Sam Coach',
      roleLabel: 'Coach',
      season: '2026-27',
      token: 'THE_TOKEN',
      logoUri: 'https://x/logo.png',
      photoUri: 'https://x/photo.jpg',
    }) as {
      state: string
      barcode: Record<string, unknown>
      heroImage: { sourceUri: { uri: string } }
    }
    expect(obj.state).toBe('ACTIVE')
    expect(obj.barcode).toMatchObject({ type: 'QR_CODE', value: 'THE_TOKEN', alternateText: 'CMBA-00042' })
    expect(obj.heroImage.sourceUri.uri).toBe('https://x/photo.jpg')
  })
})

describe('googleWallet — access token', () => {
  it('exchanges the SA assertion for an access token', async () => {
    let sentAssertion = ''
    const fetchImpl = (async (_url: string | URL, init?: RequestInit) => {
      const body = init!.body as URLSearchParams
      sentAssertion = body.get('assertion') || ''
      return new Response(JSON.stringify({ access_token: 'demo-access-token', expires_in: 3600 }), { status: 200 })
    }) as unknown as typeof fetch
    const token = await getAccessToken({ ...sa, client_email: 'unique-token-test@cmba.iam' }, { now: 42, fetchImpl })
    expect(token).toBe('demo-access-token')
    // The assertion is a valid RS256 JWT scoped to the wallet issuer.
    const claims = decodeSeg(sentAssertion, 1)
    expect(claims.scope).toContain('wallet_object.issuer')
    expect(claims.iat).toBe(42)
  })
})
