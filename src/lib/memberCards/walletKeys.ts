/*
 * Member Cards — Apple + Google Wallet credential resolution (Phase 2).
 *
 * Sibling to keys.ts (which resolves the Ed25519 *token* signing key). This resolves
 * the wallet-issuance material: the Apple PassKit signing cert (.p12) + WWDR
 * intermediate + APNs auth key, and the Google Wallet issuer + service-account key.
 *
 * Non-negotiables:
 *  - Secrets live in env ONLY (never the repo). Binary material (p12, WWDR .cer, APNs
 *    .p8, Google SA JSON) is base64-encoded in env.
 *  - Resolution is a pure function of an injected env map, so it is unit-testable and a
 *    route can fail LOUDLY (listing exactly what is missing) rather than emitting an
 *    unsigned or corrupt pass.
 *  - The APNs key from provisioning is topic-scoped + PRODUCTION only — the default
 *    environment here is 'production', matching that constraint (api.push.apple.com).
 *  - Google starts in DEMO MODE. `googleDemoMode` defaults true and is only false when
 *    MEMBERCARD_GOOGLE_DEMO_MODE is explicitly "false", so a public save button can
 *    never ship live by omission.
 */

export type Env = Record<string, string | undefined>

// ---------------------------------------------------------------------------
// Apple Wallet
// ---------------------------------------------------------------------------

export interface AppleWalletConfig {
  teamId: string
  passTypeId: string
  /** DER/PKCS#12 bytes (cert + private key), password-protected. */
  p12: Buffer
  p12Password: string
  /** Apple WWDR G4 intermediate, DER (.cer) bytes. */
  wwdr: Buffer
  apnsKeyId: string
  /** APNs auth key (.p8) PEM text. */
  apnsKeyPem: string
  apnsEnvironment: 'production' | 'sandbox'
  /** Secret used to HMAC the per-pass PassKit web-service authenticationToken. */
  authSecret: string
}

const decodeBase64 = (v: string): Buffer => Buffer.from(v, 'base64')

// The non-secret identifiers are stable, public-in-every-pass values, so they default
// in code (env still overrides). Only the SECRET material must be set in the host env —
// this removes the "forgot to set an identifier var in Vercel" footgun (.env.example is
// NOT loaded in production).
const DEFAULT_APPLE_TEAM_ID = 'D433C7C7BQ'
const DEFAULT_APPLE_PASS_TYPE_ID = 'pass.ca.cmba.member'
const DEFAULT_APPLE_APNS_KEY_ID = 'VJQB268XAC'

/** Missing SECRET-var names for Apple (identifiers default in code). */
export function missingAppleVars(env: Env = process.env): string[] {
  const required = [
    'MEMBERCARD_APPLE_P12_BASE64',
    'MEMBERCARD_APPLE_P12_PASSWORD',
    'MEMBERCARD_APPLE_WWDR_BASE64',
    'MEMBERCARD_APPLE_APNS_KEY_BASE64',
  ]
  const missing = required.filter((k) => !env[k])
  // Auth secret may fall back to PAYLOAD_SECRET, so it is only "missing" when both are.
  if (!env.MEMBERCARD_APPLE_AUTH_SECRET && !env.PAYLOAD_SECRET) missing.push('MEMBERCARD_APPLE_AUTH_SECRET (or PAYLOAD_SECRET)')
  return missing
}

export function isAppleWalletConfigured(env: Env = process.env): boolean {
  return missingAppleVars(env).length === 0
}

/** Resolve Apple config, or null when not fully configured (no throw). */
export function getAppleWalletConfig(env: Env = process.env): AppleWalletConfig | null {
  if (!isAppleWalletConfigured(env)) return null
  const apnsEnv = (env.MEMBERCARD_APPLE_APNS_ENVIRONMENT ?? 'production').toLowerCase()
  return {
    teamId: env.MEMBERCARD_APPLE_TEAM_ID || DEFAULT_APPLE_TEAM_ID,
    passTypeId: env.MEMBERCARD_APPLE_PASS_TYPE_ID || DEFAULT_APPLE_PASS_TYPE_ID,
    p12: decodeBase64(env.MEMBERCARD_APPLE_P12_BASE64!),
    p12Password: env.MEMBERCARD_APPLE_P12_PASSWORD!,
    wwdr: decodeBase64(env.MEMBERCARD_APPLE_WWDR_BASE64!),
    apnsKeyId: env.MEMBERCARD_APPLE_APNS_KEY_ID || DEFAULT_APPLE_APNS_KEY_ID,
    apnsKeyPem: decodeBase64(env.MEMBERCARD_APPLE_APNS_KEY_BASE64!).toString('utf8'),
    apnsEnvironment: apnsEnv === 'sandbox' ? 'sandbox' : 'production',
    authSecret: env.MEMBERCARD_APPLE_AUTH_SECRET || env.PAYLOAD_SECRET!,
  }
}

/** Throwing resolver for route/hook use — names exactly which vars are missing. */
export function requireAppleWalletConfig(env: Env = process.env): AppleWalletConfig {
  const cfg = getAppleWalletConfig(env)
  if (!cfg) {
    throw new Error(`Apple Wallet is not configured — missing: ${missingAppleVars(env).join(', ')}`)
  }
  if (cfg.p12.length === 0) throw new Error('MEMBERCARD_APPLE_P12_BASE64 decoded to empty bytes')
  if (cfg.wwdr.length === 0) throw new Error('MEMBERCARD_APPLE_WWDR_BASE64 decoded to empty bytes')
  if (!cfg.apnsKeyPem.includes('PRIVATE KEY')) throw new Error('MEMBERCARD_APPLE_APNS_KEY_BASE64 is not a PEM .p8 key')
  return cfg
}

// ---------------------------------------------------------------------------
// Google Wallet
// ---------------------------------------------------------------------------

export interface GoogleServiceAccount {
  client_email: string
  private_key: string
  token_uri?: string
}

export interface GoogleWalletConfig {
  issuerId: string
  serviceAccount: GoogleServiceAccount
  /** Wallet class id, e.g. `<issuerId>.cmba_member`. Null until the class is created. */
  classId: string | null
  /** True until publishing access is granted; gates the public save button. */
  demoMode: boolean
}

/** DEMO MODE unless explicitly disabled — never ship a live save button by omission. */
export function googleDemoMode(env: Env = process.env): boolean {
  return (env.MEMBERCARD_GOOGLE_DEMO_MODE ?? 'true').toLowerCase() !== 'false'
}

const DEFAULT_GOOGLE_ISSUER_ID = '3388000000023180302'

/** Missing SECRET-var names for Google (issuer id defaults in code). */
export function missingGoogleVars(env: Env = process.env): string[] {
  return ['MEMBERCARD_GOOGLE_SERVICE_ACCOUNT_KEY_BASE64'].filter((k) => !env[k])
}

function parseServiceAccount(b64: string): GoogleServiceAccount | null {
  try {
    const parsed = JSON.parse(decodeBase64(b64).toString('utf8')) as Partial<GoogleServiceAccount>
    if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') return null
    return { client_email: parsed.client_email, private_key: parsed.private_key, token_uri: parsed.token_uri }
  } catch {
    return null
  }
}

export function isGoogleWalletConfigured(env: Env = process.env): boolean {
  return missingGoogleVars(env).length === 0 && parseServiceAccount(env.MEMBERCARD_GOOGLE_SERVICE_ACCOUNT_KEY_BASE64!) != null
}

export function getGoogleWalletConfig(env: Env = process.env): GoogleWalletConfig | null {
  if (missingGoogleVars(env).length > 0) return null
  const sa = parseServiceAccount(env.MEMBERCARD_GOOGLE_SERVICE_ACCOUNT_KEY_BASE64!)
  if (!sa) return null
  return {
    issuerId: env.MEMBERCARD_GOOGLE_ISSUER_ID || DEFAULT_GOOGLE_ISSUER_ID,
    serviceAccount: sa,
    classId: env.MEMBERCARD_GOOGLE_CLASS_ID || null,
    demoMode: googleDemoMode(env),
  }
}

export function requireGoogleWalletConfig(env: Env = process.env): GoogleWalletConfig {
  const cfg = getGoogleWalletConfig(env)
  if (!cfg) {
    const missing = missingGoogleVars(env)
    throw new Error(
      `Google Wallet is not configured — ${missing.length ? `missing: ${missing.join(', ')}` : 'MEMBERCARD_GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is not valid base64 JSON'}`,
    )
  }
  return cfg
}
