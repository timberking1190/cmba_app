/*
 * Member Cards — Google Wallet issuance (Phase 2).
 *
 * A CMBA member card is a Google Wallet Generic pass. This module:
 *  1. mints an OAuth access token for the service account (RS256 JWT bearer grant),
 *  2. upserts the Generic *class* (the shared template — created from code so its
 *     definition lives in the repo, not hand-made in the console),
 *  3. upserts a per-member Generic *object* carrying the QR = pass token,
 *  4. builds the signed "Add to Google Wallet" save JWT / link.
 *
 * The QR value is the SAME Ed25519 pass token the scanner already verifies (token.ts),
 * so Google Wallet cards flow through /verify unchanged. Signing uses node:crypto
 * (RS256) — no hand-rolled primitives. Payload builders are pure + exported for tests.
 *
 * DEMO MODE: objects only render for accounts registered as test accounts in the
 * Wallet Console until publishing access is granted. Callers gate the public save
 * button on `config.demoMode` (see walletKeys.googleDemoMode).
 */
import { createSign } from 'node:crypto'

import type { GoogleServiceAccount, GoogleWalletConfig } from './walletKeys'

const WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1'
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/wallet_object.issuer'
const SAVE_BASE = 'https://pay.google.com/gp/v/save/'

const b64url = (buf: Buffer | string): string =>
  (Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'utf8')).toString('base64url')

function rs256(signingInput: string, privateKeyPem: string): string {
  return b64url(createSign('RSA-SHA256').update(signingInput).end().sign(privateKeyPem))
}

/** Sign a compact RS256 JWS with the given claims + header. */
export function signRs256Jwt(claims: Record<string, unknown>, privateKeyPem: string): string {
  const header = { alg: 'RS256', typ: 'JWT' }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`
  return `${signingInput}.${rs256(signingInput, privateKeyPem)}`
}

// ---------------------------------------------------------------------------
// OAuth: service-account access token (JWT bearer grant)
// ---------------------------------------------------------------------------

interface CachedToken {
  token: string
  expEpoch: number
}
const tokenCache = new Map<string, CachedToken>()

/**
 * Mint (and briefly cache) an OAuth access token for the service account. `now` is
 * injectable for tests; caching keys on the SA email so a rotation invalidates cleanly.
 */
export async function getAccessToken(
  sa: GoogleServiceAccount,
  opts: { now?: number; fetchImpl?: typeof fetch } = {},
): Promise<string> {
  const now = opts.now ?? Math.floor(Date.now() / 1000)
  const cached = tokenCache.get(sa.client_email)
  if (cached && cached.expEpoch - 30 > now) return cached.token

  const tokenUri = sa.token_uri || DEFAULT_TOKEN_URI
  const assertion = signRs256Jwt(
    { iss: sa.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 },
    sa.private_key,
  )
  const doFetch = opts.fetchImpl ?? fetch
  const res = await doFetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text().catch(() => '')}`)
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('Google token exchange returned no access_token')
  tokenCache.set(sa.client_email, { token: json.access_token, expEpoch: now + (json.expires_in ?? 3600) })
  return json.access_token
}

// ---------------------------------------------------------------------------
// Class / object payloads (pure)
// ---------------------------------------------------------------------------

/** Default class id for the CMBA member card under an issuer. */
export const defaultClassId = (issuerId: string): string => `${issuerId}.cmba_member`
/** Per-pass object id — issuer-scoped + the pass serial (alphanumerics/._- only). */
export const objectId = (issuerId: string, serial: string): string => `${issuerId}.${serial.replace(/[^\w.-]/g, '')}`

const CMBA_RED = '#EB1C24'

export function buildGenericClass(classId: string): Record<string, unknown> {
  return {
    id: classId,
    // Generic passes carry their presentation on the object; the class is the shared
    // template + grouping. Kept minimal + stable so PATCH is a no-op across issuance.
    enableSmartTap: false,
  }
}

export interface GoogleObjectInput {
  classId: string
  objectId: string
  memberNumber: string
  displayName: string
  roleLabel: string
  season: string
  /** Ed25519 pass token — the QR the scanner verifies. */
  token: string
  /** Absolute https logo URL (Google fetches it; base64 not allowed). */
  logoUri: string
  photoUri?: string | null
}

export function buildGenericObject(input: GoogleObjectInput): Record<string, unknown> {
  return {
    id: input.objectId,
    classId: input.classId,
    state: 'ACTIVE',
    logo: { sourceUri: { uri: input.logoUri }, contentDescription: { defaultValue: { language: 'en', value: 'CMBA+' } } },
    cardTitle: { defaultValue: { language: 'en', value: 'CMBA+ Member' } },
    subheader: { defaultValue: { language: 'en', value: input.roleLabel } },
    header: { defaultValue: { language: 'en', value: input.displayName } },
    hexBackgroundColor: CMBA_RED,
    barcode: { type: 'QR_CODE', value: input.token, alternateText: input.memberNumber },
    textModulesData: [
      { id: 'member_number', header: 'Member No.', body: input.memberNumber },
      { id: 'season', header: 'Season', body: input.season },
    ],
    ...(input.photoUri ? { heroImage: { sourceUri: { uri: input.photoUri } } } : {}),
  }
}

// ---------------------------------------------------------------------------
// REST upserts
// ---------------------------------------------------------------------------

async function walletApi(
  path: string,
  method: string,
  accessToken: string,
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<Response> {
  return fetchImpl(`${WALLET_API}/${path}`, {
    method,
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** GET → create-if-404 → else PUT. Idempotent; returns the resource id. */
async function upsert(
  resource: 'genericClass' | 'genericObject',
  id: string,
  payload: Record<string, unknown>,
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const existing = await walletApi(`${resource}/${encodeURIComponent(id)}`, 'GET', accessToken, undefined, fetchImpl)
  if (existing.status === 404) {
    const created = await walletApi(resource, 'POST', accessToken, payload, fetchImpl)
    if (!created.ok) throw new Error(`Google ${resource} create failed (${created.status}): ${await created.text().catch(() => '')}`)
    return id
  }
  if (!existing.ok) throw new Error(`Google ${resource} read failed (${existing.status}): ${await existing.text().catch(() => '')}`)
  const updated = await walletApi(`${resource}/${encodeURIComponent(id)}`, 'PUT', accessToken, payload, fetchImpl)
  if (!updated.ok) throw new Error(`Google ${resource} update failed (${updated.status}): ${await updated.text().catch(() => '')}`)
  return id
}

/** Ensure the shared Generic class exists. Returns the class id used. */
export async function ensureGoogleClass(
  cfg: GoogleWalletConfig,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<string> {
  const classId = cfg.classId || defaultClassId(cfg.issuerId)
  const token = await getAccessToken(cfg.serviceAccount, opts)
  return upsert('genericClass', classId, buildGenericClass(classId), token, opts.fetchImpl ?? fetch)
}

/** Upsert the per-member object. Returns its object id. */
export async function upsertGoogleObject(
  cfg: GoogleWalletConfig,
  input: Omit<GoogleObjectInput, 'classId' | 'objectId'> & { serial: string },
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<string> {
  const classId = cfg.classId || defaultClassId(cfg.issuerId)
  const oid = objectId(cfg.issuerId, input.serial)
  const token = await getAccessToken(cfg.serviceAccount, opts)
  const payload = buildGenericObject({ ...input, classId, objectId: oid })
  return upsert('genericObject', oid, payload, token, opts.fetchImpl ?? fetch)
}

// ---------------------------------------------------------------------------
// Save link
// ---------------------------------------------------------------------------

/** Signed "Add to Google Wallet" URL that adds the object (referenced by id). */
export function buildSaveUrl(
  cfg: GoogleWalletConfig,
  objectResourceId: string,
  opts: { now?: number } = {},
): string {
  const now = opts.now ?? Math.floor(Date.now() / 1000)
  const jwt = signRs256Jwt(
    {
      iss: cfg.serviceAccount.client_email,
      aud: 'google',
      typ: 'savetowallet',
      iat: now,
      payload: { genericObjects: [{ id: objectResourceId }] },
    },
    cfg.serviceAccount.private_key,
  )
  return `${SAVE_BASE}${jwt}`
}

/**
 * Save URL that INLINES the full class + object, so Google creates them on save. Used as
 * a fallback when the server-side upsert can't reach the API (e.g. a fresh demo issuer).
 */
export function buildSaveUrlInline(
  cfg: GoogleWalletConfig,
  fullObject: Record<string, unknown>,
  opts: { now?: number } = {},
): string {
  const now = opts.now ?? Math.floor(Date.now() / 1000)
  const classId = cfg.classId || defaultClassId(cfg.issuerId)
  const jwt = signRs256Jwt(
    {
      iss: cfg.serviceAccount.client_email,
      aud: 'google',
      typ: 'savetowallet',
      iat: now,
      payload: { genericClasses: [buildGenericClass(classId)], genericObjects: [fullObject] },
    },
    cfg.serviceAccount.private_key,
  )
  return `${SAVE_BASE}${jwt}`
}
