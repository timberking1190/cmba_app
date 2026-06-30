import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

/*
 * Stage C / S2 — invalidate sessions on a password change (NIST SP 800-63B-4 /
 * OWASP). When a user's password is changed, every other session and refresh-token
 * family is killed so a stolen cookie/token cannot outlive the credential. The
 * actor's own session (self-service change) is preserved so they are not signed out
 * of the page they are on; an admin-initiated change clears all of the target's
 * sessions.
 *
 * Scope is tight: the flag is only set when `data.password` is present, so ordinary
 * profile / MFA updates never trigger this. A loop guard (skipSessionInvalidation)
 * prevents the cleanup write from re-entering the hook.
 */

export function keepOnlySession<T extends { id?: string }>(items: T[] | undefined, keepId: string | undefined): T[] {
  if (!keepId) return []
  return (items ?? []).filter((s) => s.id === keepId)
}

export function keepOnlyMeta<T extends { sid?: string | null }>(items: T[] | undefined, keepSid: string | undefined): T[] {
  if (!keepSid) return []
  return (items ?? []).filter((m) => m.sid === keepSid)
}

export const flagPasswordChange: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'update' && typeof (data as { password?: unknown })?.password === 'string' && (data as { password: string }).password) {
    req.context = req.context || {}
    ;(req.context as { passwordChanged?: boolean }).passwordChanged = true
  }
  return data
}

export const invalidateSessionsOnPasswordChange: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'update') return doc
  const ctx = req.context as { passwordChanged?: boolean; skipSessionInvalidation?: boolean } | undefined
  if (!ctx?.passwordChanged || ctx?.skipSessionInvalidation) return doc

  // Keep the actor's own session only on a self-service change.
  const keepSid = req.user && String(req.user.id) === String(doc.id) ? (req.user as { _sid?: string })._sid : undefined

  const fresh = (await req.payload
    .findByID({ collection: 'users', id: doc.id, depth: 0, overrideAccess: true })
    .catch(() => null)) as { sessions?: Array<{ id?: string }>; sessionMeta?: Array<{ sid?: string | null }> } | null

  await req.payload.update({
    collection: 'users',
    id: doc.id,
    overrideAccess: true,
    context: { skipSessionInvalidation: true },
    data: { sessions: keepOnlySession(fresh?.sessions, keepSid), sessionMeta: keepOnlyMeta(fresh?.sessionMeta, keepSid) } as never,
  })
  // Kill all refresh-token families for this user (native sessions).
  await req.payload
    .update({ collection: 'refresh-tokens', where: { user: { equals: doc.id } }, data: { revoked: true }, overrideAccess: true })
    .catch(() => {})

  req.payload.logger.info(`Sessions invalidated after password change for user ${doc.id}`)
  return doc
}
