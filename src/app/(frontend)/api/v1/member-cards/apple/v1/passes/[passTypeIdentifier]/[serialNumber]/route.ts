import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { buildApplePkpassBySerial } from '@/lib/memberCards/appleWebService'
import { getAppleWalletConfig } from '@/lib/memberCards/walletKeys'
import { verifyAppleAuthToken } from '@/lib/memberCards/walletProvision'

/*
 * Apple PassKit web service — return the latest signed .pkpass for a serial. Wallet
 * calls this after an APNs update push (or on its own schedule). Authenticated by the
 * per-pass `Authorization: ApplePass <token>` header.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ passTypeIdentifier: string; serialNumber: string }> }

export async function GET(req: Request, { params }: Params) {
  const { passTypeIdentifier, serialNumber } = await params
  const cfg = getAppleWalletConfig()
  if (!cfg || passTypeIdentifier !== cfg.passTypeId) return new NextResponse(null, { status: 404 })

  const authz = req.headers.get('authorization') || ''
  const presented = authz.startsWith('ApplePass ') ? authz.slice('ApplePass '.length) : null
  if (!verifyAppleAuthToken(cfg.authSecret, serialNumber, presented)) return new NextResponse(null, { status: 401 })

  const payload = await getPayloadClient()
  const appUrl = process.env.NEXT_PUBLIC_SERVER_URL || new URL(req.url).origin
  let buffer: Buffer | null = null
  try {
    buffer = await buildApplePkpassBySerial(payload, cfg, serialNumber, `${appUrl}/api/v1/member-cards/apple`)
  } catch (err) {
    payload.logger.error(`[apple/passes] ${err instanceof Error ? err.message : String(err)}`)
    return new NextResponse(null, { status: 500 })
  }
  if (!buffer) return new NextResponse(null, { status: 404 })

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'content-type': 'application/vnd.apple.pkpass',
      'last-modified': new Date().toUTCString(),
      'cache-control': 'no-store',
    },
  })
}
