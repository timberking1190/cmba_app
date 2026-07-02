import type { CollectionAfterChangeHook } from 'payload'

import { issueCardForUser } from '../../lib/memberCards/issuance'

/*
 * Member Cards auto-issuance (D19): on every new user, assign a member number and
 * create the base card (+ a verification token for scannable roles, D20). Runs after
 * the user row exists. issueCardForUser uses low-level/overrideAccess writes and does
 * NOT re-enter the users collection hooks, so there is no recursion.
 *
 * Issuance NEVER blocks signup — a failure is logged and swallowed so account
 * creation always succeeds; the backfill/repair job re-issues any that slipped.
 */
function resolveSeason(configSeason?: string | null): string {
  return configSeason || process.env.MEMBERCARD_SEASON || '2026-27'
}

export const issueMemberCardOnCreate: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (operation !== 'create') return doc
  const payload = req.payload
  const user = doc as { id: number; roles?: string[] | null; memberNumber?: string | null }

  try {
    const config = await payload.findGlobal({ slug: 'member-card-config', depth: 0 }).catch(() => null)
    const season = resolveSeason((config as { currentSeason?: string | null } | null)?.currentSeason)
    await issueCardForUser(
      payload,
      { id: user.id, roles: user.roles ?? [], memberNumber: user.memberNumber ?? null },
      { season },
    )
  } catch (err) {
    payload.logger.error({ err, userId: user.id }, 'member-card issuance failed (signup unaffected)')
  }
  return doc
}
