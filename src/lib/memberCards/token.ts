/*
 * Member Cards — pass verification token (D1).
 *
 * The QR payload is a compact JWS, Ed25519 (EdDSA). Header exactly
 *   { "alg":"EdDSA", "kid":"<key-id>", "typ":"cmba-pass+jwt" }
 * Claims exactly (NO PII, ever):
 *   { iss:"cmba", sub:<pass_serial>, jti:<uuid>, iat, exp, ch:"wallet"|"print", v:1 }
 *
 * The signature primitive is Node's Ed25519 (`node:crypto`) — we do NOT hand-roll
 * crypto; this module only does the JOSE compact serialization + STRICT structural
 * validation around it. There is deliberately no `alg:"none"` path and no algorithm
 * agility: verification hard-fails anything that is not EdDSA with our exact `typ`.
 *
 * This module is stateless and knows nothing about revocation. Currency
 * (single-active-jti), pass status, and live credential evaluation are enforced by
 * the /verify route against the database — authenticity here, verdict there.
 */
import { createPrivateKey, createPublicKey, sign as edSign, verify as edVerify } from 'node:crypto'
import type { KeyObject } from 'node:crypto'

export const TOKEN_TYP = 'cmba-pass+jwt'
export const TOKEN_ALG = 'EdDSA'
export const TOKEN_ISS = 'cmba'
export const TOKEN_VERSION = 1

export type PassChannel = 'wallet' | 'print'

export interface PassTokenClaims {
  iss: typeof TOKEN_ISS
  sub: string // pass serial_number
  jti: string // the single-active token id checked against passes.current_jti
  iat: number // seconds since epoch
  exp: number // seconds since epoch
  ch: PassChannel
  v: typeof TOKEN_VERSION
}

export interface MintInput {
  passSerial: string
  jti: string
  channel: PassChannel
  kid: string
  /** Issued-at, seconds since epoch. Pass an explicit clock — do not read Date here. */
  iat: number
  /** Expiry, seconds since epoch. Season-long: ~13mo wallet / ~14mo print (D1). */
  exp: number
  privateKeyPem: string
}

/** Reasons verification can fail. Structural/crypto only — DB verdicts live elsewhere. */
export type VerifyFailure =
  | 'malformed'
  | 'invalid_signature'
  | 'unsupported_alg'
  | 'unsupported_typ'
  | 'unknown_kid'
  | 'bad_claims'
  | 'wrong_issuer'
  | 'unsupported_version'
  | 'token_expired'

export type VerifyResult =
  | { ok: true; claims: PassTokenClaims; kid: string }
  | { ok: false; reason: VerifyFailure }

interface JoseHeader {
  alg: string
  kid: string
  typ: string
}

const b64uEncode = (buf: Buffer | string): string =>
  (Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'utf8')).toString('base64url')

const b64uDecode = (s: string): Buffer => Buffer.from(s, 'base64url')

const jsonBytes = (value: unknown): Buffer => Buffer.from(JSON.stringify(value), 'utf8')

function privateKey(pem: string): KeyObject {
  const key = createPrivateKey({ key: pem, format: 'pem' })
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error('member-card signing key is not Ed25519')
  }
  return key
}

function publicKey(pem: string): KeyObject {
  const key = createPublicKey({ key: pem, format: 'pem' })
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error('member-card verifying key is not Ed25519')
  }
  return key
}

/**
 * Mint a compact JWS pass token. Claims are fixed to the D1 shape; `iat`/`exp` are
 * caller-supplied (seconds) so the caller owns the clock and TTL policy.
 */
export function mintPassToken(input: MintInput): string {
  const header: JoseHeader = { alg: TOKEN_ALG, kid: input.kid, typ: TOKEN_TYP }
  const claims: PassTokenClaims = {
    iss: TOKEN_ISS,
    sub: input.passSerial,
    jti: input.jti,
    iat: input.iat,
    exp: input.exp,
    ch: input.channel,
    v: TOKEN_VERSION,
  }
  const signingInput = `${b64uEncode(jsonBytes(header))}.${b64uEncode(jsonBytes(claims))}`
  const signature = edSign(null, Buffer.from(signingInput, 'ascii'), privateKey(input.privateKeyPem))
  return `${signingInput}.${b64uEncode(signature)}`
}

function parseHeader(segment: string): JoseHeader | null {
  try {
    const parsed = JSON.parse(b64uDecode(segment).toString('utf8')) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const h = parsed as Record<string, unknown>
    if (typeof h.alg !== 'string' || typeof h.kid !== 'string' || typeof h.typ !== 'string') return null
    return { alg: h.alg, kid: h.kid, typ: h.typ }
  } catch {
    return null
  }
}

function parseClaims(segment: string): PassTokenClaims | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(b64uDecode(segment).toString('utf8'))
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const c = parsed as Record<string, unknown>
  if (
    typeof c.iss !== 'string' ||
    typeof c.sub !== 'string' ||
    typeof c.jti !== 'string' ||
    typeof c.iat !== 'number' ||
    typeof c.exp !== 'number' ||
    (c.ch !== 'wallet' && c.ch !== 'print') ||
    typeof c.v !== 'number'
  ) {
    return null
  }
  return {
    iss: c.iss as typeof TOKEN_ISS,
    sub: c.sub,
    jti: c.jti,
    iat: c.iat,
    exp: c.exp,
    ch: c.ch,
    v: c.v as typeof TOKEN_VERSION,
  }
}

export interface VerifyOptions {
  /** Resolve a `kid` to its SPKI PEM. Return null/undefined for an unknown key. */
  resolvePublicKeyPem: (kid: string) => string | null | undefined
  /** Current time, seconds since epoch — caller owns the clock. */
  nowSeconds: number
  /** Clock-skew grace on expiry, seconds. Default 0. */
  clockToleranceSeconds?: number
}

/**
 * Verify a compact JWS pass token: strict structure, EdDSA-only, exact typ, known
 * kid, valid signature, correct issuer/version, and not expired. Does NOT check
 * revocation / single-active-jti / credential status — that is the DB's job.
 */
export function verifyPassToken(compact: string, opts: VerifyOptions): VerifyResult {
  if (typeof compact !== 'string') return { ok: false, reason: 'malformed' }
  const parts = compact.split('.')
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) return { ok: false, reason: 'malformed' }
  const [headerSeg, claimsSeg, sigSeg] = parts

  const header = parseHeader(headerSeg)
  if (!header) return { ok: false, reason: 'malformed' }
  if (header.alg !== TOKEN_ALG) return { ok: false, reason: 'unsupported_alg' }
  if (header.typ !== TOKEN_TYP) return { ok: false, reason: 'unsupported_typ' }

  const pem = opts.resolvePublicKeyPem(header.kid)
  if (!pem) return { ok: false, reason: 'unknown_kid' }

  let signatureValid = false
  try {
    signatureValid = edVerify(
      null,
      Buffer.from(`${headerSeg}.${claimsSeg}`, 'ascii'),
      publicKey(pem),
      b64uDecode(sigSeg),
    )
  } catch {
    return { ok: false, reason: 'invalid_signature' }
  }
  if (!signatureValid) return { ok: false, reason: 'invalid_signature' }

  const claims = parseClaims(claimsSeg)
  if (!claims) return { ok: false, reason: 'bad_claims' }
  if (claims.iss !== TOKEN_ISS) return { ok: false, reason: 'wrong_issuer' }
  if (claims.v !== TOKEN_VERSION) return { ok: false, reason: 'unsupported_version' }

  const tolerance = opts.clockToleranceSeconds ?? 0
  if (claims.exp + tolerance < opts.nowSeconds) return { ok: false, reason: 'token_expired' }

  return { ok: true, claims, kid: header.kid }
}
