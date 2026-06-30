import type { CollectionBeforeChangeHook } from 'payload'

/*
 * enforceMfaRequired (S1) — derives Users.mfa.required from roles so any admin role
 * (club_admin / super_admin) is automatically marked as requiring MFA. Promoting a
 * user to an admin role flips them into force-enrollment on their next privileged
 * access; demoting clears it. Derived server-side only (the field is read-only to
 * clients). Merges the existing mfa group so route-managed fields (enrolled,
 * methods, enrolledAt) are never clobbered.
 */
const ADMIN_ROLES = ['club_admin', 'super_admin']

export const enforceMfaRequired: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const roles = (data?.roles ?? originalDoc?.roles ?? []) as unknown
  const list = Array.isArray(roles) ? (roles as string[]) : []
  const required = list.some((r) => ADMIN_ROLES.includes(r))
  data.mfa = { ...(originalDoc?.mfa ?? {}), ...(data?.mfa ?? {}), required }
  return data
}
