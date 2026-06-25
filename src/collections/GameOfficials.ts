import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, superAdminFieldOnly } from '../access/index'
import { emailAssignment } from '../lib/emailEvents'
import { writeAudit } from '../lib/games/service'

/*
 * GameOfficials - an official assigned to a game. Admins (or assigners) manage
 * assignments; an official can read only their OWN assignments (scoped by the
 * denormalized officialUserId). Every assignment is audited and notified by email.
 * The (game, official) pair is unique so the same official is not assigned twice.
 */
const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

const readGameOfficials: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAnyAdmin(user)) return true
  return { officialUserId: { equals: user.id } }
}

const adminOnly: Access = ({ req: { user } }) => isAnyAdmin(user)

export const GameOfficials: CollectionConfig = {
  slug: 'game-officials',
  access: {
    read: readGameOfficials,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['game', 'official', 'role', 'status'],
    group: 'Competition',
    description: 'Official assignments. Each change is audited and emailed.',
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        const next = { ...data }
        if (operation === 'create') {
          next.assignedBy = req.user?.id
          next.assignedAt = new Date().toISOString()
          // Denormalize the official's linked user so they can read their own assignments.
          const officialId = relId(next.official)
          if (officialId != null) {
            const official = await req.payload.findByID({ collection: 'officials', id: officialId, depth: 0, overrideAccess: true }).catch(() => null)
            const lu = relId((official as { linkedUser?: unknown } | null)?.linkedUser)
            if (lu != null) next.officialUserId = lu
          }
        }
        return next
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        const payload = req.payload
        const officialId = relId((doc as { official?: unknown }).official)
        const official = officialId != null ? await payload.findByID({ collection: 'officials', id: officialId, depth: 0, overrideAccess: true, req }).catch(() => null) : null
        await emailAssignment(payload, { toEmail: (official as { email?: string | null } | null)?.email })
        await writeAudit(payload, { actor: req.user as never, action: 'official.assign', entity: 'game-officials', entityId: (doc as { id: string | number }).id }, req)
        return doc
      },
    ],
  },
  fields: [
    { name: 'game', type: 'relationship', relationTo: 'games', required: true, index: true },
    { name: 'official', type: 'relationship', relationTo: 'officials', required: true, index: true },
    { name: 'officialUserId', type: 'relationship', relationTo: 'users', index: true, access: { create: superAdminFieldOnly, update: superAdminFieldOnly }, admin: { readOnly: true, description: 'Denormalized from the official linked account for read scoping.' } },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'referee1',
      options: [
        { label: 'Referee 1', value: 'referee1' },
        { label: 'Referee 2', value: 'referee2' },
        { label: 'Scorekeeper', value: 'scorekeeper' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'assignedBy', type: 'relationship', relationTo: 'users', access: { create: superAdminFieldOnly, update: superAdminFieldOnly }, admin: { readOnly: true } },
    { name: 'assignedAt', type: 'date', access: { create: superAdminFieldOnly, update: superAdminFieldOnly }, admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'assigned',
      options: [
        { label: 'Assigned', value: 'assigned' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Declined', value: 'declined' },
      ],
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
    },
  ],
  indexes: [{ fields: ['game', 'official'], unique: true }],
}
