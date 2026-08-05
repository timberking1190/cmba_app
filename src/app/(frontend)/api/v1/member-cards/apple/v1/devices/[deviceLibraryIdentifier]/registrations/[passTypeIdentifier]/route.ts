import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { listUpdatableSerials } from '@/lib/memberCards/appleWebService'
import { getAppleWalletConfig } from '@/lib/memberCards/walletKeys'

/*
 * Apple PassKit web service — list the serials registered to a device that have changed
 * since `passesUpdatedSince`. Not per-pass authenticated (Apple sends no token here);
 * scoped by the opaque device library id. 204 when nothing changed.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string }> }

export async function GET(req: Request, { params }: Params) {
  const { deviceLibraryIdentifier, passTypeIdentifier } = await params
  const cfg = getAppleWalletConfig()
  if (!cfg || passTypeIdentifier !== cfg.passTypeId) return new NextResponse(null, { status: 404 })

  const updatedSince = new URL(req.url).searchParams.get('passesUpdatedSince')
  const payload = await getPayloadClient()
  const result = await listUpdatableSerials(payload, { deviceLibId: deviceLibraryIdentifier, updatedSince })
  if (!result) return new NextResponse(null, { status: 204 })
  return NextResponse.json(result, { status: 200 })
}
