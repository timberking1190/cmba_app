import type { Access, CollectionConfig } from 'payload'

import { clubIdOf, isClubAdmin, isSuperAdmin, superAdminOnly } from '../access/index'

/*
 * Clubs — the league's clubs/associations. Basic directory info (not PII), so
 * reads are public (registration + profile dropdowns need them signed-out).
 * Super admins manage all; a club admin may update their own club's info.
 */
const updateClub: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (isClubAdmin(user)) {
    const club = clubIdOf(user)
    if (club) return { id: { equals: club } }
  }
  return false
}

export const Clubs: CollectionConfig = {
  slug: 'clubs',
  access: {
    read: () => true,
    create: superAdminOnly,
    update: updateClub,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'shortName'],
    group: 'People',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'shortName', type: 'text' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'contactEmail', type: 'email' },
    { name: 'contactPhone', type: 'text' },
    {
      name: 'admins',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: { description: 'Users who administer this club.' },
    },
  ],
}
