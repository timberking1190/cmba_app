import 'server-only'
import { headers as nextHeaders } from 'next/headers'

import { getPayloadClient } from '@/lib/auth'
import type { User } from '@/payload-types'
import { assuranceFor, type SessionAssurance, type SessionMetaRow } from './sessionPure'

/*
 * Stage C / S1 — per-session assurance plumbing (server read side).
 *
 * Payload owns user.sessions[] (sid bound into the JWT). We keep a parallel
 * user.sessionMeta[] keyed by sid carrying the assurance level (aal) and the MFA /
 * step-up timestamps. sessionMeta has read:()=>false, so it is read with
 * overrideAccess server-side only and never serialized to a client. The pure
 * helpers live in sessionPure.ts; this module adds the server entrypoint.
 *
 * Default is aal1: a session with no sessionMeta row (or aal !== 'aal2') is
 * password-only. A row is written to aal2 only when a second factor is passed
 * (elevation, added with the challenge routes), so there is no write on the login
 * path here.
 */

export type UserWithMfa = User & { _sid?: string; _mfa?: SessionAssurance }
export { assuranceFor } from './sessionPure'

/*
 * Resolve the current user WITH per-session assurance attached. Used by gated
 * areas / admin slots; public pages keep using the lighter getCurrentUser. Reads
 * sessionMeta with overrideAccess (the field is non-serializable). Never throws.
 */
export async function getCurrentUserWithAssurance(): Promise<UserWithMfa | null> {
  try {
    const payload = await getPayloadClient()
    const hdrs = await nextHeaders()
    const { user } = await payload.auth({ headers: hdrs })
    if (!user) return null
    const sid = (user as { _sid?: string })._sid
    // sessionMeta is read:()=>false, so re-read the row set with overrideAccess.
    const full = (await payload
      .findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true })
      .catch(() => null)) as (User & { sessionMeta?: SessionMetaRow[] }) | null
    const assurance = assuranceFor(full?.sessionMeta, sid)
    return { ...(user as User), _sid: sid, _mfa: assurance }
  } catch {
    return null
  }
}
