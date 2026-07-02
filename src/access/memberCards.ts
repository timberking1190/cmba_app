/*
 * Access control for the Member Cards collections (the RLS translation, ADR 0001).
 *
 * Posture, deny-by-default:
 * - Members read their OWN card data (passes) via the `member` → users linkage.
 * - Verification-domain admins (league_official + any staff admin, D24) read ALL
 *   scans and manage devices / revocations.
 * - Scanner users get NO direct read on other members' passes/tokens — verification
 *   is only through the /verify route (service role / overrideAccess). A scanner may
 *   read their own scan history and their own registered devices.
 * - Internal operational tables (verification-tokens, apple-registrations,
 *   wallet-logs, pass-claims, import-*) are admin-only; the app writes them through
 *   Edge/route handlers with overrideAccess.
 *
 * Guardian read of a dependant's card data (D13) is intentionally NOT wired here yet
 * — it depends on the guardian-user → dependant link (open item G in
 * docs/member-cards/PHASE1_DATA_MODEL.md) and lands with the Family Cards work.
 */
import type { Access } from 'payload'

import { isAnyAdmin, isVerificationAdmin } from './index'

/** admin → all; otherwise scoped to rows where `field` equals the caller's user id. */
export const ownedByUserOrAdmin =
  (field: string): Access =>
  ({ req: { user } }) => {
    if (!user) return false
    if (isAnyAdmin(user)) return true
    return { [field]: { equals: user.id } }
  }

/** Any staff-level admin only (club/super). */
export const adminOnly: Access = ({ req: { user } }) => isAnyAdmin(user)

/** Verification-domain admin only (league_official + any staff admin, D24). */
export const verificationAdminOnly: Access = ({ req: { user } }) => isVerificationAdmin(user)

/**
 * Scans read (D24): verification admins see everything (Scan Analytics); a scanner
 * user sees only their own scans. No one else reads scans.
 */
export const readScans: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isVerificationAdmin(user)) return true
  return { scannedBy: { equals: user.id } }
}

/**
 * Scanner devices (D9): verification admins manage all (register/revoke); a scanner
 * reads their own devices.
 */
export const readOwnDevicesOrVerificationAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isVerificationAdmin(user)) return true
  return { user: { equals: user.id } }
}

/** Hard deny — append-only / no-mutation surfaces. */
export const denyAll: Access = () => false
