import type { CollectionConfig } from 'payload'

import { anyAdminOnly, authenticated, isSuperAdmin, ownerOrAnyAdmin, superAdminFieldOnly } from '../access/index'

/*
 * TeamMemberships - THE VERIFIED REP GATE. A membership links a user to a team
 * with a role (rep, coach, manager). Only a VERIFIED membership lets a user report
 * or confirm a score for that team. A user may self-claim a membership, but it
 * always lands unverified with role rep, and only an admin can set verified, role,
 * verifiedBy, or move the user. The (user, team) pair is unique so the same user
 * cannot stack memberships on one team. Verification is the trust boundary, so the
 * verify path is admin only.
 */
export const TeamMemberships: CollectionConfig = {
  slug: 'team-memberships',
  access: {
    read: ownerOrAnyAdmin,
    create: authenticated,
    update: anyAdminOnly,
    delete: anyAdminOnly,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'team', 'role', 'verified', 'verifiedAt'],
    group: 'Competition',
    description: 'Links a user to a team. A verified membership is how a user is allowed to report for a team.',
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        const next = { ...data }
        // Self-claims are pinned to the claimant and always land unverified.
        if (operation === 'create' && req.user && !isSuperAdmin(req.user)) {
          next.user = req.user.id
          next.verified = false
        }
        // Stamp verifiedAt when an admin sets verifiedBy without a date.
        if (next.verifiedBy && !next.verifiedAt) {
          next.verifiedAt = new Date().toISOString()
        }
        return next
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
    },
    { name: 'team', type: 'relationship', relationTo: 'teams', required: true, index: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'rep',
      options: [
        { label: 'Team representative', value: 'rep' },
        { label: 'Coach', value: 'coach' },
        { label: 'Manager', value: 'manager' },
      ],
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'Role on the team. Admin assigned.' },
    },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'A verified membership may report and confirm scores. Admin only.' },
    },
    {
      name: 'verifiedBy',
      type: 'relationship',
      relationTo: 'users',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'Admin who verified this membership. Admin only.' },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true },
    },
    { name: 'invitedEmail', type: 'text', admin: { description: 'Email this rep was invited at, for matching on signup.' } },
  ],
  indexes: [{ fields: ['user', 'team'], unique: true }],
}
