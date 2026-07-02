/*
 * Member Cards backfill (D19) — issue a card (member number + base pass, + token for
 * scannable roles) for every EXISTING user, since the auto-issuance hook only fires on
 * new signups. Idempotent: issueCardForUser is a no-op once a user has their base pass,
 * so this is safe to re-run (e.g. after signing keys are set, to mint tokens for coaches
 * who were issued tokenless during the keyless window).
 *
 * Guarded: MEMBERCARD_BACKFILL_ALLOW=1. Runs against whatever DATABASE_URL resolves to.
 * Usage:  MEMBERCARD_BACKFILL_ALLOW=1 npm run backfill:member-cards
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import config from '@payload-config'

import { issueCardForUser, loadRequirementMatrix } from '../src/lib/memberCards/issuance'

async function resolveSeason(payload: Payload): Promise<string> {
  const cfg = await payload.findGlobal({ slug: 'member-card-config', depth: 0 }).catch(() => null)
  return (cfg as { currentSeason?: string | null } | null)?.currentSeason || process.env.MEMBERCARD_SEASON || '2026-27'
}

async function main() {
  if (process.env.MEMBERCARD_BACKFILL_ALLOW !== '1') throw new Error('Set MEMBERCARD_BACKFILL_ALLOW=1 to run the backfill.')
  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[backfill:member-cards] ${m}`)

  const season = await resolveSeason(payload)
  const matrixRows = await loadRequirementMatrix(payload)
  let page = 1
  let issued = 0
  let tokens = 0
  let processed = 0

  for (;;) {
    const res = await payload.find({ collection: 'users', limit: 200, page, depth: 0, overrideAccess: true, sort: 'id' })
    if (res.docs.length === 0) break
    for (const u of res.docs as Array<{ id: number; roles?: string[] | null; memberNumber?: string | null }>) {
      processed++
      try {
        const r = await issueCardForUser(payload, { id: u.id, roles: u.roles ?? [], memberNumber: u.memberNumber ?? null }, { season, matrixRows })
        if (r.tokenMinted) tokens++
        issued++
      } catch (err) {
        payload.logger.error({ err, userId: u.id }, 'backfill: issuance failed for user')
      }
    }
    log(`processed ${processed}…`)
    if (!res.hasNextPage) break
    page++
  }

  log(`done — processed ${processed} users; ${issued} issued/verified; ${tokens} tokens minted`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
