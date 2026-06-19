/*
 * Access control for the Users collection.
 *
 * Default deny. Owners may read/update only their own record (field-level guards
 * lock roles/verification). Club admins may read users in their own club. Super
 * admins may do everything. Public self-registration is opened in Phase 1
 * together with the server-side consent-enforcement hook — until then, account
 * creation via the API is super-admin only (Payload still permits the very first
 * user when the collection is empty).
 */
import type { Access, Where } from 'payload'

import { clubIdOf, isClubAdmin, isSuperAdmin } from './index'

export const readUsers: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (isClubAdmin(user)) {
    const club = clubIdOf(user)
    const or: Where[] = [{ id: { equals: user.id } }]
    if (club) or.push({ club: { equals: club } })
    const scoped: Where = { or }
    return scoped
  }
  const own: Where = { id: { equals: user.id } }
  return own
}

export const updateUsers: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  return { id: { equals: user.id } }
}

export const deleteUsers: Access = ({ req: { user } }) => isSuperAdmin(user)

// Public self-registration is allowed, but the server-side consent-enforcement
// hook (see collections/hooks/users.ts) REJECTS any create without a valid
// consent sign-off, and the `roles`/`status` fields are admin-only, so a
// self-registrant can never escalate privileges or skip the guardian flow.
export const createUsers: Access = () => true
