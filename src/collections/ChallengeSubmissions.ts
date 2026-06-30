import type { CollectionConfig } from 'payload'

import { authenticated, isSuperAdmin, ownerOrSuperAdmin, superAdminFieldOnly, superAdminOnly } from '../access/index'
import { onChallengeSubmitted, onChallengeVerified } from '../lib/gamification/wiring'

/*
 * ChallengeSubmissions - SCAFFOLD (model only this stage).
 *
 * An athlete's attempt at a Challenge. A self-claim lands UNVERIFIED, pinned to the
 * caller (the Certifications/TeamMemberships idiom): a participant CRUDs only their
 * own, and `verified`/`verifiedBy`/`verifiedAt` are admin-only fields, so a
 * participant can never self-verify. Verification is the trust boundary that turns
 * a fun (self-reported) submission into meaningful (verified) XP.
 *
 * Engine wiring (gated on FEATURE_GAMIFICATION_LEDGER, inert in prod): on create the
 * athlete earns small fun-only participation XP; when an admin/coach sets verified,
 * the challenge's meaningful XP is granted. Both are idempotent.
 *
 * Minor-safety: read is owner-and-admin only (a verified-coach read path is added
 * with the coaching UI); a minor's submission is never public. Clip uploads (a
 * private-bucket, EXIF-stripped upload gated on photoOptIn) land with the UI.
 */
export const ChallengeSubmissions: CollectionConfig = {
  slug: 'challenge-submissions',
  access: {
    read: ownerOrSuperAdmin,
    create: authenticated,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['challenge', 'user', 'verified', 'submittedAt'],
    group: 'Engagement',
    description: 'Athlete challenge attempts. Self-claims land unverified; admin/coach verification grants meaningful XP.',
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        const next = { ...data }
        if (operation === 'create') {
          if (req.user && !isSuperAdmin(req.user)) {
            next.user = req.user.id
            next.verified = false
          }
          if (!next.submittedAt) next.submittedAt = new Date().toISOString()
        }
        if (next.verifiedBy && !next.verifiedAt) next.verifiedAt = new Date().toISOString()
        return next
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'create') {
          await onChallengeSubmitted(req.payload, doc as never, req)
        } else if (operation === 'update' && (doc as { verified?: boolean }).verified && !(previousDoc as { verified?: boolean })?.verified) {
          await onChallengeVerified(req.payload, doc as never, req)
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'challenge', type: 'relationship', relationTo: 'challenges', required: true, index: true },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
    },
    { name: 'result', type: 'text', admin: { description: 'The athlete-logged result (e.g. 18/25 free throws, 42s course).' } },
    { name: 'notes', type: 'textarea' },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'A verified submission earns meaningful XP and counts toward badges. Admin/coach only.' },
    },
    {
      name: 'verifiedBy',
      type: 'relationship',
      relationTo: 'users',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'Admin/coach who verified the submission.' },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true },
    },
    { name: 'submittedAt', type: 'date', access: { update: superAdminFieldOnly }, admin: { readOnly: true } },
  ],
}
