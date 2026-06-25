import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, superAdminFieldOnly, superAdminOnly } from '../access/index'

/*
 * PlayoffBrackets - a single or double elimination bracket for a division, seeded
 * from the division's final standings. The seedSnapshot freezes the ordered team
 * ids at seed time; re-seeding is explicit and audited. Public once published.
 */
const readBracket: Access = ({ req: { user } }) => {
  if (isAnyAdmin(user)) return true
  return { publishState: { equals: 'published' } }
}

export const PlayoffBrackets: CollectionConfig = {
  slug: 'playoff-brackets',
  access: {
    read: readBracket,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'division', 'format', 'status', 'publishState'],
    group: 'Competition',
    description: 'Playoff bracket seeded from a division standings.',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'division', type: 'relationship', relationTo: 'divisions', required: true, index: true },
    { name: 'season', type: 'relationship', relationTo: 'seasons', index: true },
    {
      name: 'format',
      type: 'select',
      required: true,
      defaultValue: 'single_elim',
      options: [
        { label: 'Single elimination', value: 'single_elim' },
        { label: 'Double elimination', value: 'double_elim' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Complete', value: 'complete' },
      ],
    },
    { name: 'seedSnapshot', type: 'json', access: { create: superAdminFieldOnly, update: superAdminFieldOnly }, admin: { readOnly: true, description: 'Ordered team ids frozen at seed time.' } },
    { name: 'seededAt', type: 'date', access: { update: superAdminFieldOnly }, admin: { readOnly: true } },
    {
      name: 'publishState',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      access: { update: superAdminFieldOnly },
      admin: { position: 'sidebar' },
    },
  ],
}
