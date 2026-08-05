import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { logWallet } from '@/lib/memberCards/appleWebService'

/*
 * Apple PassKit web service — log intake. Apple POSTs { logs: string[] } describing
 * delivery/update problems; we persist them to wallet-logs for debugging.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { logs?: unknown }
  const payload = await getPayloadClient()
  await logWallet(payload, 'apple-log', body)
  return new NextResponse(null, { status: 200 })
}
