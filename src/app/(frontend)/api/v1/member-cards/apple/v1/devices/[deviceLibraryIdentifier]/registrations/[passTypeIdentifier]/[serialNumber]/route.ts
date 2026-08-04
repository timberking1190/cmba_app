import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { logWallet, registerDevice, unregisterDevice } from '@/lib/memberCards/appleWebService'
import { getAppleWalletConfig } from '@/lib/memberCards/walletKeys'
import { verifyAppleAuthToken } from '@/lib/memberCards/walletProvision'

/*
 * Apple PassKit web service — register / unregister a device for pass push updates.
 * POST   → register (body { pushToken }); DELETE → unregister.
 * Authenticated by the per-pass `Authorization: ApplePass <token>` header.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }

const presentedToken = (req: Request): string | null => {
  const authz = req.headers.get('authorization') || ''
  return authz.startsWith('ApplePass ') ? authz.slice('ApplePass '.length) : null
}

export async function POST(req: Request, { params }: Params) {
  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params
  const cfg = getAppleWalletConfig()
  if (!cfg || passTypeIdentifier !== cfg.passTypeId) return new NextResponse(null, { status: 404 })
  if (!verifyAppleAuthToken(cfg.authSecret, serialNumber, presentedToken(req))) return new NextResponse(null, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { pushToken?: unknown }
  const pushToken = typeof body.pushToken === 'string' ? body.pushToken : ''
  if (!pushToken) return new NextResponse(null, { status: 400 })

  const payload = await getPayloadClient()
  const outcome = await registerDevice(payload, { deviceLibId: deviceLibraryIdentifier, passSerial: serialNumber, pushToken })
  await logWallet(payload, 'apple-register', { deviceLibraryIdentifier, serialNumber, outcome })
  return new NextResponse(null, { status: outcome === 'created' ? 201 : 200 })
}

export async function DELETE(req: Request, { params }: Params) {
  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params
  const cfg = getAppleWalletConfig()
  if (!cfg || passTypeIdentifier !== cfg.passTypeId) return new NextResponse(null, { status: 404 })
  if (!verifyAppleAuthToken(cfg.authSecret, serialNumber, presentedToken(req))) return new NextResponse(null, { status: 401 })

  const payload = await getPayloadClient()
  await unregisterDevice(payload, { deviceLibId: deviceLibraryIdentifier, passSerial: serialNumber })
  await logWallet(payload, 'apple-unregister', { deviceLibraryIdentifier, serialNumber })
  return new NextResponse(null, { status: 200 })
}
