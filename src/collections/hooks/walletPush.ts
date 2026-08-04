import type { CollectionAfterChangeHook } from 'payload'

import { getAppleWalletConfig } from '../../lib/memberCards/walletKeys'

/*
 * Member Cards — push an Apple Wallet update when a pass materially changes (Phase 2,
 * spec item 3). Fires on an apple pass being revoked/superseded or having its token
 * rotated (reissue) — exactly the changes an already-installed card must learn about
 * promptly. No-op until Apple Wallet is configured; best-effort, never blocks the write.
 *
 * The heavy signing/APNs module is dynamically imported so it only loads when a push
 * actually fires (not on every Payload boot).
 */
export const pushApplePassOnMaterialChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== 'update') return doc
  const d = doc as { platform?: string; serialNumber?: string; status?: string; currentJti?: string | null }
  const prev = (previousDoc ?? {}) as { status?: string; currentJti?: string | null }
  if (d.platform !== 'apple' || !d.serialNumber) return doc

  const statusPushed = d.status !== prev.status && (d.status === 'revoked' || d.status === 'superseded')
  const jtiRotated = d.currentJti !== prev.currentJti
  if (!statusPushed && !jtiRotated) return doc

  const cfg = getAppleWalletConfig()
  if (!cfg) return doc

  try {
    const { notifyApplePassUpdated } = await import('../../lib/memberCards/appleWebService')
    await notifyApplePassUpdated(req.payload, cfg, d.serialNumber)
  } catch (err) {
    req.payload.logger.error(`[walletPush] ${err instanceof Error ? err.message : String(err)}`)
  }
  return doc
}
