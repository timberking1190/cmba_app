import { NextResponse } from 'next/server'

import { canScan } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { loadRequirementMatrix } from '@/lib/memberCards/issuance'
import { decideSerialVerdict } from '@/lib/memberCards/verify'
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
 * POST /api/v1/member-cards/verify-serial (D17) — manual serial-lookup fallback for a
 * damaged/unscannable QR. Skips signature + jti steps BY DESIGN but runs the SAME live
 * requirement evaluation; tighter rate limit (10/min); disabled via member-card-config;
 * verdict is always flagged serialFallback so the banner says "check photo ID
 * carefully". Never available offline. Logged with method:'serial'.
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

  const rl = await checkRateLimit(payload, { bucket: 'mc-verify-serial', subject: String(user.id), limit: 10, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json(
      { result: 'rate_limited', cleared: false, serialFallback: true, message: 'Too many lookups — slow down and retry' },
      { status: 429 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as { serial?: unknown; venueId?: unknown; gameId?: unknown; clientUuid?: unknown }
  const serial = typeof body.serial === 'string' ? body.serial.trim() : ''
  if (!serial) return NextResponse.json({ error: 'Missing serial' }, { status: 400 })

  const config = await payload.findGlobal({ slug: 'member-card-config', depth: 0 }).catch(() => null)
  const enabled = (config as { serialLookupEnabled?: boolean } | null)?.serialLookupEnabled !== false

  const pass = enabled ? await loadScannedPassBySerial(payload, serial) : null
  const matrixRows = await loadRequirementMatrix(payload)
  const verdict = decideSerialVerdict({ enabled, pass, ctx: { requirementRows: matrixRows, now: new Date() } })

  await recordScan(payload, {
    clientUuid: typeof body.clientUuid === 'string' ? body.clientUuid : null,
    scannedBy: Number(user.id),
    deviceId,
    venueId: numOrNull(body.venueId),
    gameId: numOrNull(body.gameId),
    jti: null,
    memberId: verdict.member ? Number(verdict.member.id) : null,
    result: verdict.result,
    method: 'serial',
    ip: clientIp(req),
    deviceInfo: req.headers.get('user-agent'),
  })

  return NextResponse.json(verdictBody(verdict))
}
