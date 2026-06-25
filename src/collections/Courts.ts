import type { CollectionConfig } from 'payload'

import { superAdminFieldOnly, superAdminOnly } from '../access/index'

/*
 * Courts - one playing surface at a Venue. Modeled as its own collection (not a
 * Venue array) so every Game references a stable court id the conflict engine can
 * key on, surviving a court rename or reorder. A venue with a single surface gets
 * an auto "Main" court on import so every game has a non-null court reference.
 * Reads are public; super admins manage courts. The venue link is update-locked.
 */
export const Courts: CollectionConfig = {
  slug: 'courts',
  access: {
    read: () => true,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'venue', 'active'],
    group: 'Competition',
    description: 'A playing surface at a venue. Court names are unique within a venue.',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'venue',
      type: 'relationship',
      relationTo: 'venues',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
    },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'externalId', type: 'text' },
  ],
  indexes: [{ fields: ['venue', 'name'], unique: true }],
}
