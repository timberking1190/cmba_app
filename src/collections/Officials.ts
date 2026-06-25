import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, superAdminFieldOnly } from '../access/index'

/*
 * Officials - the referee and official roster. Admins manage it; an official linked
 * to a user account can read their own roster entry (so a future self-serve
 * availability screen can read it). rampLevel and the linkedUser link are super
 * admin field-locked. Imported via the Officials CSV or added in the admin.
 */
const readOfficials: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAnyAdmin(user)) return true
  return { linkedUser: { equals: user.id } }
}

const adminOnly: Access = ({ req: { user } }) => isAnyAdmin(user)

export const Officials: CollectionConfig = {
  slug: 'officials',
  access: {
    read: readOfficials,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'rampLevel', 'active'],
    group: 'Competition',
    description: 'Referee and official roster.',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', index: true },
    { name: 'phone', type: 'text' },
    {
      name: 'rampLevel',
      type: 'select',
      options: [
        { label: 'Level 1', value: 'level1' },
        { label: 'Level 2', value: 'level2' },
        { label: 'Level 3', value: 'level3' },
      ],
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'RAMP certification level. Used for eligibility warnings.' },
    },
    { name: 'maxGamesPerDay', type: 'number', min: 0, admin: { description: 'Warn when assigned more games in a day than this.' } },
    { name: 'externalId', type: 'text', index: true },
    { name: 'notes', type: 'textarea' },
    {
      name: 'linkedUser',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'Optional linked account for self-serve availability later.' },
    },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'importBatch', type: 'relationship', relationTo: 'import-batches', index: true, admin: { position: 'sidebar', readOnly: true } },
  ],
}
