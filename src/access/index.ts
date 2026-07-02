/*
 * Central access-control helpers for CMBA Connect.
 *
 * Access control is the security boundary for this app (equivalent to RLS). The
 * default posture is DENY: collections opt into access explicitly, and sensitive
 * fields (roles, verification stamps, certificate files) are locked to admins.
 *
 * Payload access functions return either a boolean or a `Where` query. Returning
 * a `Where` scopes a list/read to matching documents instead of all-or-nothing.
 */
import type { Access, FieldAccess } from 'payload'

export type Role =
  | 'participant'
  | 'coach'
  | 'official'
  | 'league_official'
  | 'club_admin'
  | 'super_admin'

export const ROLES: { label: string; value: Role }[] = [
  { label: 'Participant', value: 'participant' },
  { label: 'Coach', value: 'coach' },
  { label: 'Official', value: 'official' },
  // League Official (Member Cards D23): the scanner login tier. Scans coach passes at
  // venues and reads Scan Analytics; not a data admin. Added to the DB enum by a
  // deliberately-generated Payload migration (ALTER TYPE ... ADD VALUE) — see
  // docs/member-cards/PHASE1_DATA_MODEL.md.
  { label: 'League Official', value: 'league_official' },
  { label: 'Club Admin', value: 'club_admin' },
  { label: 'Super Admin', value: 'super_admin' },
]

type UserLike = {
  id?: string | number
  roles?: Role[] | null
  club?: string | number | { id: string | number } | null
} | null
  | undefined

export const hasRole = (user: UserLike, role: Role): boolean =>
  Boolean(user?.roles?.includes(role))

export const isSuperAdmin = (user: UserLike): boolean => hasRole(user, 'super_admin')

export const isClubAdmin = (user: UserLike): boolean => hasRole(user, 'club_admin')

/** Any staff-level admin (club admin or super admin). */
export const isAnyAdmin = (user: UserLike): boolean =>
  isSuperAdmin(user) || isClubAdmin(user)

/** League official — the Member-Cards scanner login tier (D23). */
export const isLeagueOfficial = (user: UserLike): boolean => hasRole(user, 'league_official')

/**
 * Member Cards D23 — may operate the scanner (`/scan`, `/verify`, `/verify-serial`).
 * Spec vocabulary referee/league_official/admin/commissioner maps here to
 * official/league_official + any staff admin.
 */
export const canScan = (user: UserLike): boolean =>
  hasRole(user, 'official') || isLeagueOfficial(user) || isAnyAdmin(user)

/**
 * Member Cards D24 — verification-domain admin: reads ALL scans (Scan Analytics) and
 * holds revoke-pass / revoke-device powers. League officials + any staff admin.
 * Narrower than isAnyAdmin on the analytics side (adds league_official), but credential
 * review / imports / requirement-matrix edits stay isAnyAdmin-only (D16).
 */
export const isVerificationAdmin = (user: UserLike): boolean =>
  isLeagueOfficial(user) || isAnyAdmin(user)

/** Resolve the club id from a user whether the relation is populated or an id. */
export const clubIdOf = (user: UserLike): string | number | undefined => {
  const c = user?.club
  if (c == null) return undefined
  if (typeof c === 'object') return c.id
  return c
}

/* ── Collection-level access ─────────────────────────────────────────────── */

/** Only super admins. */
export const superAdminOnly: Access = ({ req: { user } }) => isSuperAdmin(user)

/** Any staff-level admin (club admin or super admin). */
export const anyAdminOnly: Access = ({ req: { user } }) => isAnyAdmin(user)

/** Signed-in users only (any authenticated account). */
export const authenticated: Access = ({ req: { user } }) => Boolean(user)

/**
 * Owner (by the `user` relationship) or a super admin. Scoped reads return a
 * `Where` limiting to the caller's own rows. The canonical owner-scoped helper
 * for per-user records like certifications.
 */
export const ownerOrSuperAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  return { user: { equals: user.id } }
}

/**
 * Owner (by the `user` relationship) or any staff admin (club or super). Like
 * `ownerOrSuperAdmin` but club admins also see all rows (e.g. team memberships).
 */
export const ownerOrAnyAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAnyAdmin(user)) return true
  return { user: { equals: user.id } }
}

/** Published content readable by anyone; drafts/unpublished only by admins. */
export const publishedOrAdmin: Access = ({ req: { user } }) => {
  if (isAnyAdmin(user)) return true
  return {
    _status: { equals: 'published' },
  }
}

/* ── Field-level access ──────────────────────────────────────────────────── */

/** Field readable/writable by super admins only (e.g. roles, verification). */
export const superAdminFieldOnly: FieldAccess = ({ req: { user } }) =>
  isSuperAdmin(user)
