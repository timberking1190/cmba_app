import type { Access, CollectionConfig } from 'payload'

import { clubIdOf, isAnyAdmin, isClubAdmin, isSuperAdmin, superAdminFieldOnly } from '../access/index'

/*
 * Teams - a team within a division. Reads are public (team names are not personal
 * data and the public schedule needs them). Super admins manage all teams; a club
 * admin may create and manage only their own club's teams. The club and division
 * fields are update-locked to super admins so a club admin cannot move a team out
 * of their own scope after it is created; on create, a club admin's team is pinned
 * to their own club by the beforeChange hook.
 */
const writeTeam: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (isClubAdmin(user)) {
    const club = clubIdOf(user)
    if (club) return { club: { equals: club } }
  }
  return false
}

const createTeam: Access = ({ req: { user } }) => isAnyAdmin(user)

export const Teams: CollectionConfig = {
  slug: 'teams',
  access: {
    read: () => true,
    create: createTeam,
    update: writeTeam,
    delete: writeTeam,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'division', 'club', 'active'],
    group: 'Competition',
    description: 'A team in a division. Names are unique within a division.',
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        const next = { ...data }
        // A club admin can only ever create a team for their own club.
        if (operation === 'create' && req.user && isClubAdmin(req.user) && !isSuperAdmin(req.user)) {
          const club = clubIdOf(req.user)
          if (club) next.club = club
        }
        return next
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'club',
      type: 'relationship',
      relationTo: 'clubs',
      index: true,
      access: { update: superAdminFieldOnly },
    },
    {
      name: 'division',
      type: 'relationship',
      relationTo: 'divisions',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
    },
    { name: 'color', type: 'text', admin: { description: 'Hex value or simple color name.' } },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'externalId', type: 'text', index: true, admin: { description: 'Prior system id (for example TeamLinkt) kept for migration.' } },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'importBatch', type: 'relationship', relationTo: 'import-batches', index: true, admin: { position: 'sidebar', readOnly: true } },
  ],
  indexes: [{ fields: ['division', 'name'], unique: true }],
}
