import { APIError } from 'payload'
import type { Access, CollectionConfig, Where } from 'payload'

import { isAnyAdmin, superAdminFieldOnly, superAdminOnly } from '../access/index'
import { isUnder18 } from '../lib/age'

/*
 * Recognitions - SCAFFOLD (model only this stage; the approval->award wiring and
 * the surfacing UI land later).
 *
 * The moderated recognition engine: shout-outs, player/coach/parent-volunteer of
 * the month, sportsmanship, milestones. Every recognition is created PENDING and
 * must be coach/admin approved before it surfaces. Safety invariant: any signed-in
 * user (including a minor) MAY nominate, but nothing they create is visible to
 * anyone but the subject, the nominator, and moderators until approved - the
 * moderation gate is the boundary, enforced server-side (not a field default):
 *   - beforeValidate forces moderationStatus='pending' and pins nominatedBy to the
 *     caller, re-derives subjectIsMinor from the subject's DOB, and stamps the
 *     moderation fields when an admin moves it out of pending.
 *   - read is owner-scoped (subject or nominator) + admin; team-surfacing of an
 *     APPROVED, non-minor (or recognitionSurfacing-consented) recognition is a
 *     later, separate read path, so there is no minor leak in this scaffold.
 *   - moderationStatus / moderatedBy / nominatedBy are superAdminFieldOnly.
 * flagged + flagReason are the shared report/flag primitive.
 */
const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

const readRecognitions: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAnyAdmin(user)) return true
  // Owner-scoped: the recognized member and the nominator only. Never public; no
  // team surfacing here (that path is gated on approval + recognitionSurfacing).
  const where: Where = { or: [{ subject: { equals: user.id } }, { nominatedBy: { equals: user.id } }] }
  return where
}

export const Recognitions: CollectionConfig = {
  slug: 'recognitions',
  access: {
    read: readRecognitions,
    create: ({ req: { user } }) => Boolean(user),
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['kind', 'subject', 'moderationStatus', 'flagged', 'createdAt'],
    group: 'Engagement',
    description: 'Moderated recognitions. Created pending; approved in the admin panel before they surface.',
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data
        const next = { ...data }
        if (operation === 'create') {
          if (!req.user) throw new APIError('You must be signed in to nominate a recognition.', 401)
          // Hard gate: server pins these regardless of the request body.
          next.nominatedBy = req.user.id
          next.moderationStatus = 'pending'
          if (next.flagged == null) next.flagged = false
          // Re-derive subjectIsMinor server-side from the subject's DOB.
          const subjectId = relId(next.subject)
          const subject = subjectId != null
            ? await req.payload.findByID({ collection: 'users', id: subjectId, depth: 0, overrideAccess: true, req }).catch(() => null)
            : null
          next.subjectIsMinor = subject ? isUnder18((subject as { dateOfBirth?: string | null }).dateOfBirth) : false
        } else if (operation === 'update') {
          // Admin moderation: stamp when the recognition first leaves pending.
          const wasPending = (originalDoc as { moderationStatus?: string } | undefined)?.moderationStatus === 'pending'
          if (wasPending && next.moderationStatus && next.moderationStatus !== 'pending') {
            next.moderatedAt = new Date().toISOString()
            if (!next.moderatedBy && req.user) next.moderatedBy = req.user.id
          }
        }
        return next
      },
    ],
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Player of the game', value: 'player_of_game' },
        { label: 'Shout-out', value: 'shout_out' },
        { label: 'Sportsmanship', value: 'sportsmanship' },
        { label: 'Coach of the month', value: 'coach_of_month' },
        { label: 'Parent/volunteer of the month', value: 'parent_volunteer' },
        { label: 'Milestone', value: 'milestone' },
      ],
    },
    { name: 'subject', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { description: 'The recognized member.' } },
    {
      name: 'nominatedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'Pinned to the caller server-side. Admin-only field.' },
    },
    { name: 'team', type: 'relationship', relationTo: 'teams', index: true, admin: { description: 'Optional team scope for surfacing.' } },
    { name: 'message', type: 'textarea', admin: { description: 'Plaintext; escaped on render. No HTML.' } },
    {
      name: 'moderationStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'Nothing surfaces until approved. Admin-only.' },
    },
    {
      name: 'moderatedBy',
      type: 'relationship',
      relationTo: 'users',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true, description: 'Admin who approved/rejected. Set server-side.' },
    },
    {
      name: 'moderatedAt',
      type: 'date',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true },
    },
    {
      name: 'subjectIsMinor',
      type: 'checkbox',
      defaultValue: false,
      admin: { readOnly: true, description: 'Captured server-side from the subject DOB. Gates privacy-safe surfacing.' },
    },
    {
      name: 'awardsBadge',
      type: 'relationship',
      relationTo: 'badges',
      admin: { description: 'Optional: on approval the engine grants this badge (verified) + an XP event.' },
    },
    { name: 'flagged', type: 'checkbox', defaultValue: false, admin: { description: 'Reported for moderator review.' } },
    { name: 'flagReason', type: 'text', admin: { description: 'Why the recognition was flagged.' } },
  ],
}
