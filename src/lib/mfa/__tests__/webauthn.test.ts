import { afterEach, describe, expect, it } from 'vitest'

import { authOptions, expectedOrigins, regOptions, rpID } from '../webauthn'

afterEach(() => {
  delete process.env.WEBAUTHN_RP_ID
  delete process.env.WEBAUTHN_ORIGINS
})

describe('webauthn config (origin gating)', () => {
  it('rpID defaults to localhost and honours the env', () => {
    expect(rpID()).toBe('localhost')
    process.env.WEBAUTHN_RP_ID = 'cmbaplatform.vercel.app'
    expect(rpID()).toBe('cmbaplatform.vercel.app')
  })

  it('expectedOrigins parses the comma allowlist (preview hosts excluded unless listed)', () => {
    expect(expectedOrigins()).toEqual(['http://localhost:3000'])
    process.env.WEBAUTHN_ORIGINS = 'https://cmbaplatform.vercel.app, https://cmba.ab.ca'
    expect(expectedOrigins()).toEqual(['https://cmbaplatform.vercel.app', 'https://cmba.ab.ca'])
  })
})

describe('webauthn ceremony options', () => {
  it('regOptions binds the challenge to the rpID and excludes existing credentials', async () => {
    process.env.WEBAUTHN_RP_ID = 'cmbaplatform.vercel.app'
    const o = await regOptions({ userId: 7, userName: 'a@b.ca', exclude: [{ id: 'abc' }] })
    expect(typeof o.challenge).toBe('string')
    expect(o.rp.id).toBe('cmbaplatform.vercel.app')
    expect(o.excludeCredentials?.[0]?.id).toBe('abc')
    expect(o.authenticatorSelection?.userVerification).toBe('preferred')
  })

  it('authOptions scopes the request to the allowed credentials', async () => {
    const o = await authOptions([{ id: 'cred-1' }])
    expect(typeof o.challenge).toBe('string')
    expect(o.allowCredentials?.[0]?.id).toBe('cred-1')
  })
})
