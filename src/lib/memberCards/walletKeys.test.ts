import { describe, expect, it } from 'vitest'

import {
  getAppleWalletConfig,
  getGoogleWalletConfig,
  googleDemoMode,
  isAppleWalletConfigured,
  isGoogleWalletConfigured,
  missingAppleVars,
  requireAppleWalletConfig,
  requireGoogleWalletConfig,
  type Env,
} from './walletKeys'

const b64 = (s: string): string => Buffer.from(s, 'utf8').toString('base64')

// A stand-in for the .p8 contents. Must contain "PRIVATE KEY" (what requireAppleWallet
// Config checks) but deliberately NOT a real PEM header, so secret scanners don't flag it.
const APNS_PEM = 'TEST FAKE PRIVATE KEY (not real key material)'

const fullAppleEnv = (): Env => ({
  MEMBERCARD_APPLE_TEAM_ID: 'D433C7C7BQ',
  MEMBERCARD_APPLE_PASS_TYPE_ID: 'pass.ca.cmba.member',
  MEMBERCARD_APPLE_P12_BASE64: b64('fake-p12-bytes'),
  MEMBERCARD_APPLE_P12_PASSWORD: 'secret',
  MEMBERCARD_APPLE_WWDR_BASE64: b64('fake-wwdr'),
  MEMBERCARD_APPLE_APNS_KEY_ID: 'VJQB268XAC',
  MEMBERCARD_APPLE_APNS_KEY_BASE64: b64(APNS_PEM),
  PAYLOAD_SECRET: 'payload-secret',
})

const googleSA = JSON.stringify({ client_email: 'cmba-wallet-signer@cmba-wallet.iam.gserviceaccount.com', private_key: 'KEY' })

describe('walletKeys — Apple', () => {
  it('reports missing SECRET vars precisely and is not configured', () => {
    expect(isAppleWalletConfigured({})).toBe(false)
    expect(missingAppleVars({})).toContain('MEMBERCARD_APPLE_P12_BASE64')
  })

  it('defaults the non-secret identifiers when only secrets are set', () => {
    const env: Env = {
      MEMBERCARD_APPLE_P12_BASE64: b64('p12'),
      MEMBERCARD_APPLE_P12_PASSWORD: 'pw',
      MEMBERCARD_APPLE_WWDR_BASE64: b64('wwdr'),
      MEMBERCARD_APPLE_APNS_KEY_BASE64: b64(APNS_PEM),
      PAYLOAD_SECRET: 's',
    }
    expect(isAppleWalletConfigured(env)).toBe(true)
    const cfg = getAppleWalletConfig(env)!
    expect(cfg.teamId).toBe('D433C7C7BQ')
    expect(cfg.passTypeId).toBe('pass.ca.cmba.member')
    expect(cfg.apnsKeyId).toBe('VJQB268XAC')
  })

  it('resolves + decodes a full Apple env, defaulting APNs to production', () => {
    const env = fullAppleEnv()
    expect(isAppleWalletConfigured(env)).toBe(true)
    const cfg = getAppleWalletConfig(env)!
    expect(cfg.teamId).toBe('D433C7C7BQ')
    expect(cfg.p12.toString('utf8')).toBe('fake-p12-bytes')
    expect(cfg.wwdr.toString('utf8')).toBe('fake-wwdr')
    expect(cfg.apnsKeyPem).toContain('PRIVATE KEY')
    expect(cfg.apnsEnvironment).toBe('production')
    expect(cfg.authSecret).toBe('payload-secret') // falls back to PAYLOAD_SECRET
  })

  it('falls back on auth secret and honours an explicit sandbox flag', () => {
    const env = { ...fullAppleEnv(), MEMBERCARD_APPLE_AUTH_SECRET: 'dedicated', MEMBERCARD_APPLE_APNS_ENVIRONMENT: 'sandbox' }
    const cfg = getAppleWalletConfig(env)!
    expect(cfg.authSecret).toBe('dedicated')
    expect(cfg.apnsEnvironment).toBe('sandbox')
  })

  it('requireAppleWalletConfig throws when the APNs key is not a PEM', () => {
    const env = { ...fullAppleEnv(), MEMBERCARD_APPLE_APNS_KEY_BASE64: b64('not-a-pem') }
    expect(() => requireAppleWalletConfig(env)).toThrow(/not a PEM/)
  })

  it('auth secret is only missing when BOTH it and PAYLOAD_SECRET are absent', () => {
    const env = fullAppleEnv()
    delete env.PAYLOAD_SECRET
    expect(missingAppleVars(env).some((m) => m.includes('AUTH_SECRET'))).toBe(true)
  })
})

describe('walletKeys — Google', () => {
  it('defaults to DEMO MODE unless explicitly disabled', () => {
    expect(googleDemoMode({})).toBe(true)
    expect(googleDemoMode({ MEMBERCARD_GOOGLE_DEMO_MODE: 'true' })).toBe(true)
    expect(googleDemoMode({ MEMBERCARD_GOOGLE_DEMO_MODE: 'false' })).toBe(false)
  })

  it('parses a base64 service-account key', () => {
    const env: Env = { MEMBERCARD_GOOGLE_ISSUER_ID: '3388000000023180302', MEMBERCARD_GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: b64(googleSA) }
    expect(isGoogleWalletConfigured(env)).toBe(true)
    const cfg = getGoogleWalletConfig(env)!
    expect(cfg.issuerId).toBe('3388000000023180302')
    expect(cfg.serviceAccount.client_email).toContain('cmba-wallet-signer')
    expect(cfg.demoMode).toBe(true)
    expect(cfg.classId).toBeNull()
  })

  it('defaults the issuer id when only the SA key is set', () => {
    const env: Env = { MEMBERCARD_GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: b64(googleSA) }
    expect(isGoogleWalletConfigured(env)).toBe(true)
    expect(getGoogleWalletConfig(env)!.issuerId).toBe('3388000000023180302')
  })

  it('is not configured when the SA JSON is malformed', () => {
    const env: Env = { MEMBERCARD_GOOGLE_ISSUER_ID: 'x', MEMBERCARD_GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: b64('{not json') }
    expect(isGoogleWalletConfigured(env)).toBe(false)
    expect(() => requireGoogleWalletConfig(env)).toThrow(/not valid base64 JSON/)
  })
})
