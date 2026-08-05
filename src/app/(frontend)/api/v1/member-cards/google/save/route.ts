import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { logWallet } from '@/lib/memberCards/appleWebService'
import {
  buildGenericObject,
  buildSaveUrl,
  buildSaveUrlInline,
  defaultClassId,
  ensureGoogleClass,
  objectId,
  upsertGoogleObject,
} from '@/lib/memberCards/googleWallet'
import { getGoogleWalletConfig } from '@/lib/memberCards/walletKeys'
import { provisionWalletPass, WalletProvisionError } from '@/lib/memberCards/walletProvision'

/*
 * GET /api/v1/member-cards/google/save — provision the member's Google Wallet object and
 * 302-redirect to the signed "Add to Google Wallet" URL. The class + object are created
 * from code (idempotent); if the API can't be reached (fresh demo issuer), we fall back
 * to a save link that inlines the full class + object so Google creates them on save.
 *
 * DEMO MODE: the object only renders for accounts registered as test accounts until
 * publishing access is granted. The UI still routes non-test users here but explains that.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const cfg = getGoogleWalletConfig()
  if (!cfg) return NextResponse.json({ error: 'Google Wallet is not available yet' }, { status: 503 })

  try {
    const card = await provisionWalletPass(payload, Number(user.id), 'google')
    const appUrl = process.env.NEXT_PUBLIC_SERVER_URL || new URL(req.url).origin
    const input = {
      serial: card.serialNumber,
      memberNumber: card.memberNumber,
      displayName: card.displayName,
      roleLabel: card.roleLabel,
      season: card.season,
      token: card.qrToken,
      logoUri: `${appUrl}/cmba-logo-md.png`,
      photoUri: card.photoUrl,
    }

    let saveUrl: string
    try {
      await ensureGoogleClass(cfg)
      const oid = await upsertGoogleObject(cfg, input)
      saveUrl = buildSaveUrl(cfg, oid)
    } catch (apiErr) {
      // Fresh/demo issuer or transient API failure: inline the object into the save JWT.
      await logWallet(payload, 'google-upsert-fallback', { error: apiErr instanceof Error ? apiErr.message : String(apiErr) })
      const classId = cfg.classId || defaultClassId(cfg.issuerId)
      const oid = objectId(cfg.issuerId, card.serialNumber)
      saveUrl = buildSaveUrlInline(cfg, buildGenericObject({ ...input, classId, objectId: oid }))
    }

    return NextResponse.redirect(saveUrl, { status: 302 })
  } catch (err) {
    if (err instanceof WalletProvisionError) {
      const status = err.code === 'not_scannable' ? 403 : 503
      return NextResponse.json({ error: err.message }, { status })
    }
    payload.logger.error(`[google/save] ${err instanceof Error ? err.message : String(err)}`)
    return NextResponse.json({ error: 'Could not generate the Google Wallet pass' }, { status: 500 })
  }
}
