import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { generateApplePkpass, type AppleCardData } from '@/lib/memberCards/applePass'
import { getAppleWalletConfig } from '@/lib/memberCards/walletKeys'
import {
  applePassAuthToken,
  provisionWalletPass,
  stampAppleAuthHash,
  validThruLabel,
  WalletProvisionError,
} from '@/lib/memberCards/walletProvision'

/*
 * GET /api/v1/member-cards/apple/download — the member's own signed .pkpass.
 * Node runtime (signing needs node:crypto + node-forge). Auth = the signed-in member;
 * the pass is always THEIRS (provisioned by their user id), so no serial is accepted
 * from the client. Non-scannable roles get 403; unconfigured Apple env gets 503.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const cfg = getAppleWalletConfig()
  if (!cfg) return NextResponse.json({ error: 'Apple Wallet is not available yet' }, { status: 503 })

  try {
    const card = await provisionWalletPass(payload, Number(user.id), 'apple')
    const appUrl = process.env.NEXT_PUBLIC_SERVER_URL || new URL(req.url).origin
    const authenticationToken = applePassAuthToken(cfg.authSecret, card.serialNumber)
    await stampAppleAuthHash(payload, card.passId, cfg.authSecret, card.serialNumber)

    const cardData: AppleCardData = {
      serialNumber: card.serialNumber,
      authenticationToken,
      memberNumber: card.memberNumber,
      displayName: card.displayName,
      roleLabel: card.roleLabel,
      season: card.season,
      validThru: validThruLabel(card.expEpoch),
      token: card.qrToken,
      webServiceURL: `${appUrl}/api/v1/member-cards/apple`,
    }

    const buffer = generateApplePkpass(cfg, cardData)
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'content-type': 'application/vnd.apple.pkpass',
        'content-disposition': `attachment; filename="cmba-${card.memberNumber}.pkpass"`,
        'cache-control': 'no-store',
      },
    })
  } catch (err) {
    if (err instanceof WalletProvisionError) {
      const status = err.code === 'not_scannable' ? 403 : 503
      return NextResponse.json({ error: err.message }, { status })
    }
    payload.logger.error(`[apple/download] ${err instanceof Error ? err.message : String(err)}`)
    return NextResponse.json({ error: 'Could not generate the wallet pass' }, { status: 500 })
  }
}
