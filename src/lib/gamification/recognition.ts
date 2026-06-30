/*
 * Recognition approval + flag helpers - the write side of the moderated
 * recognition engine. Authored but NOT yet wired to a caller; the admin/coach
 * moderation flow calls recordRecognitionApproved once a recognition is approved,
 * and the report/flag route calls flagRecognition. Both write via overrideAccess
 * (the collection denies API writes) and thread req so nested writes join the
 * parent transaction. Do not run until the F1a/F2 migrations are applied.
 */
import type { Payload, PayloadRequest } from 'payload'

import { isUnder18 } from '../age'
import { emailRecognition } from '../emailEvents'
import { writeAudit, type ActorUser } from '../games/service'
import { notifyUser } from '../notify'
import { awardXp } from './engine'

type Req = PayloadRequest | undefined

/** Meaningful XP granted to the recognized member when a recognition is approved. */
export const RECOGNITION_XP = 50

const relId = (r: unknown): number | string | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: number | string }).id : (r as number | string)

/**
 * Apply the effects of an APPROVED recognition: a meaningful XP event for the
 * recognized member, and (if the recognition carries one) a verified badge award.
 * Idempotent: XP is deduped on recognition:<id>, the badge on the unique
 * (user, badge) index. A no-op unless the recognition is approved.
 */
export async function recordRecognitionApproved(
  payload: Payload,
  recognitionId: number | string,
  req?: Req,
): Promise<void> {
  const rec = await payload
    .findByID({ collection: 'recognitions', id: recognitionId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!rec || (rec as { moderationStatus?: string }).moderationStatus !== 'approved') return

  const subjectId = relId((rec as { subject?: unknown }).subject)
  if (subjectId == null) return

  // The moderating admin is the audit actor for the grant.
  const moderatorId = relId((rec as { moderatedBy?: unknown }).moderatedBy)
  const actor: ActorUser | null = moderatorId != null ? { id: moderatorId } : null

  // Fetch the subject once (for isMinor on any badge grant and for the notification).
  const subject = await payload
    .findByID({ collection: 'users', id: subjectId, depth: 0, overrideAccess: true, req })
    .catch(() => null)

  // 1) Meaningful (verified) XP for the recognized member.
  await awardXp(
    payload,
    {
      user: subjectId,
      kind: 'recognition',
      amount: RECOGNITION_XP,
      counts: 'meaningful',
      verified: true,
      source: { collection: 'recognitions', docId: String((rec as { id: number | string }).id) },
      dedupeKey: `recognition:${(rec as { id: number | string }).id}`,
    },
    req,
  )

  // 2) Optional explicit badge grant (recognition badges are not auto-evaluated).
  const badgeId = relId((rec as { awardsBadge?: unknown }).awardsBadge)
  if (badgeId != null) {
    const isMinor = isUnder18((subject as { dateOfBirth?: string | null } | null)?.dateOfBirth)
    try {
      await payload.create({
        collection: 'badge-awards',
        overrideAccess: true,
        req,
        data: {
          user: subjectId,
          badge: badgeId,
          awardedVia: 'admin_manual',
          verified: true,
          awardedBy: moderatorId ?? null,
          isMinor,
          awardedAt: new Date().toISOString(),
        } as never,
      })
      await writeAudit(
        payload,
        { actor, action: 'recognition.badge.grant', entity: 'badge-awards', entityId: badgeId, after: { user: subjectId, recognition: (rec as { id: number | string }).id } },
        req,
      )
    } catch {
      // Unique (user, badge) violation: already granted. Ignore.
    }
  }

  // 3) Notify the recognized member's account (PII-free; honors recognitionUpdates).
  await notifyUser(payload, subject as never, {
    prefKey: 'recognitionUpdates',
    send: (to) => emailRecognition(payload, { toEmail: to }),
  })

  await writeAudit(
    payload,
    { actor, action: 'recognition.approved', entity: 'recognitions', entityId: (rec as { id: number | string }).id, after: { subject: subjectId, kind: (rec as { kind?: string }).kind } },
    req,
  )
}

/**
 * Mark a recognition as flagged for moderator review. Writes via overrideAccess
 * (the report/flag route's actor is audited, never trusted from the body).
 */
export async function flagRecognition(
  payload: Payload,
  recognitionId: number | string,
  reason: string,
  actor?: ActorUser | null,
  req?: Req,
): Promise<void> {
  await payload.update({
    collection: 'recognitions',
    id: recognitionId,
    overrideAccess: true,
    req,
    data: { flagged: true, flagReason: reason } as never,
  })
  await writeAudit(payload, { actor, action: 'recognition.flag', entity: 'recognitions', entityId: recognitionId, after: { reason } }, req)
}
