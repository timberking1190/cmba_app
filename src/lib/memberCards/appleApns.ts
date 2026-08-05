/*
 * Member Cards — APNs push for Apple Wallet pass updates (Phase 2).
 *
 * When a member's card materially changes (revoke/reissue → jti rotation, status,
 * credentials, expiry) we send an EMPTY push to every device registered for that
 * pass; Wallet responds by calling our web service for the latest pass.
 *
 * Auth is token-based (JWT, ES256) built from the provisioned .p8 — NOT certificate
 * based. Two constraints from provisioning are baked in:
 *   - the key is topic-scoped to the pass type id → apns-topic = pass type id,
 *   - the key is PRODUCTION only → default host api.push.apple.com (a sandbox push
 *     would fail; there is deliberately no sandbox fallback path).
 *
 * The ES256 signature MUST be raw r||s (JOSE / ieee-p1363), not DER — the usual APNs
 * footgun. The network sender is injected so this is unit-testable without HTTP/2.
 */
import { createSign } from 'node:crypto'
import { connect as http2Connect } from 'node:http2'

import type { AppleWalletConfig } from './walletKeys'

const b64url = (buf: Buffer | string): string =>
  (Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'utf8')).toString('base64url')

const PROD_HOST = 'https://api.push.apple.com'
const SANDBOX_HOST = 'https://api.sandbox.push.apple.com'

export const apnsHost = (env: AppleWalletConfig['apnsEnvironment']): string =>
  env === 'sandbox' ? SANDBOX_HOST : PROD_HOST

/**
 * Mint an APNs auth JWT (ES256). Header { alg:ES256, kid }, claims { iss:teamId, iat }.
 * The signature is JOSE-encoded (64-byte r||s) as APNs requires. Reusable up to ~1h.
 */
export function mintApnsJwt(cfg: AppleWalletConfig, now: number = Math.floor(Date.now() / 1000)): string {
  const header = { alg: 'ES256', kid: cfg.apnsKeyId }
  const claims = { iss: cfg.teamId, iat: now }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`
  const signature = createSign('SHA256')
    .update(signingInput)
    .end()
    .sign({ key: cfg.apnsKeyPem, dsaEncoding: 'ieee-p1363' })
  return `${signingInput}.${b64url(signature)}`
}

export interface ApnsTarget {
  pushToken: string
  /** apple-registrations row id, so the caller can prune a dead token. */
  registrationId?: number
}

export interface ApnsResult {
  pushToken: string
  registrationId?: number
  status: number
  reason?: string
  /** 410 Gone / BadDeviceToken → the registration should be deleted. */
  shouldPrune: boolean
}

export interface ApnsSendRequest {
  host: string
  path: string
  headers: Record<string, string>
  body: string
}

export type ApnsSend = (req: ApnsSendRequest) => Promise<{ status: number; body: string }>

/** Real HTTP/2 sender against APNs. One short-lived session per batch. */
const http2Sender =
  (host: string): ApnsSend =>
  (req) =>
    new Promise((resolve, reject) => {
      const client = http2Connect(host)
      client.on('error', reject)
      const stream = client.request({ ':method': 'POST', ':path': req.path, ...req.headers })
      let data = ''
      let status = 0
      stream.setEncoding('utf8')
      stream.on('response', (h) => {
        status = Number(h[':status']) || 0
      })
      stream.on('data', (chunk) => {
        data += chunk
      })
      stream.on('end', () => {
        client.close()
        resolve({ status, body: data })
      })
      stream.on('error', (err) => {
        client.close()
        reject(err)
      })
      stream.end(req.body)
    })

/**
 * Push an empty pass-update to each target. Returns a per-target result; the caller
 * decides pruning (410) and logging. Never throws for a single failed token — a bad
 * token must not stop the batch.
 */
export async function pushPassUpdates(
  cfg: AppleWalletConfig,
  targets: ApnsTarget[],
  opts: { now?: number; send?: ApnsSend } = {},
): Promise<ApnsResult[]> {
  if (targets.length === 0) return []
  const host = apnsHost(cfg.apnsEnvironment)
  const jwt = mintApnsJwt(cfg, opts.now)
  const send = opts.send ?? http2Sender(host)
  const headers = { authorization: `bearer ${jwt}`, 'apns-topic': cfg.passTypeId, 'apns-expiration': '0' }
  const body = JSON.stringify({}) // Wallet update push carries an empty payload.

  const results: ApnsResult[] = []
  for (const t of targets) {
    try {
      const res = await send({ host, path: `/3/device/${t.pushToken}`, headers, body })
      let reason: string | undefined
      if (res.status !== 200) {
        try {
          reason = (JSON.parse(res.body) as { reason?: string }).reason
        } catch {
          /* non-JSON error body */
        }
      }
      results.push({
        pushToken: t.pushToken,
        registrationId: t.registrationId,
        status: res.status,
        reason,
        shouldPrune: res.status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered',
      })
    } catch (err) {
      results.push({
        pushToken: t.pushToken,
        registrationId: t.registrationId,
        status: 0,
        reason: err instanceof Error ? err.message : 'send_failed',
        shouldPrune: false,
      })
    }
  }
  return results
}
