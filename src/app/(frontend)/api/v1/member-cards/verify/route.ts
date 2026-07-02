import { NextResponse } from 'next/server'

import { canScan } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { buildPublicKeyResolver } from '@/lib/memberCards/keys'
import { loadRequirementMatrix } from '@/lib/memberCards/issuance'
import { verifyPassToken } from '@/lib/memberCards/token'
import { decideQrVerdict } from '@/lib/memberCards/verify'
import {
  clientIp,
  ensureScannerDevice,
  loadScannedPassBySerial,
  recordScan,
  verdictBody,
} from '@/lib/memberCards/verifyRoute'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/*
 * POST /api/v1/member-cards/verify (D1/D2/D20/D24) — the scanner's QR verdict.
 * Online-only, server-authoritative. Gated on canScan + a registered, non-revoked
 * device (x-device-id) + a rate limit. Verifies the token signature, resolves the
 * pass, applies the single-active-jti + live requirement evaluation, records an
 * append-only scan, and returns a display-safe verdict.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!canScan(user)) return NextResponse.json({ error: 'Not authorized to scan' }, { status: 403 })

  const deviceId = req.headers.get('x-device-id')
  if (!deviceId) return NextResponse.json({ error: 'Missing x-device-id' }, { status: 400 })

  const device = await ensureScannerDevice(payload, Number(user.id), deviceId, req.headers.get('user-agent'))
  if (device === 'revoked') return NextResponse.json({ error: 'Device revoked' }, { status: 403 })

  const rl = await checkRateLimit(payload, { bucket: 'mc-verify', subject: String(user.id), limit: 50, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json(
      { result: 'rate_limited', cleared: false, serialFallback: false, message: 'Too many scans — slow down and retry' },
      { status: 429 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as { token?: unknown; venueId?: unknown; gameId?: unknown; clientUuid?: unknown }
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const nowSeconds = Math.floor(Date.now() / 1000)
  const verified = verifyPassToken(token, { resolvePublicKeyPem: buildPublicKeyResolver(), nowSeconds })
  const tokenInput = verified.ok
    ? ({ ok: true as const, jti: verified.claims.jti, passSerial: verified.claims.sub })
    : ({ ok: false as const, reason: verified.reason })

  const pass = verified.ok ? await loadScannedPassBySerial(payload, verified.claims.sub) : null
  const matrixRows = await loadRequirementMatrix(payload)
  const verdict = decideQrVerdict({ token: tokenInput, pass, ctx: { requirementRows: matrixRows, now: new Date() } })

  await recordScan(payload, {
    clientUuid: typeof body.clientUuid === 'string' ? body.clientUuid : null,
    scannedBy: Number(user.id),
    deviceId,
    venueId: numOrNull(body.venueId),
    gameId: numOrNull(body.gameId),
    jti: verdict.jti ?? null,
    memberId: verdict.member ? Number(verdict.member.id) : null,
    result: verdict.result,
    method: 'qr',
    ip: clientIp(req),
    deviceInfo: req.headers.get('user-agent'),
  })

  return NextResponse.json(verdictBody(verdict))
}
