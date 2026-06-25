import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin } from '../access/index'

/*
 * Availability - SCAFFOLD (model only this stage). Per-game player availability.
 * This is minor data, so it ships behind admin-only read until the per-request
 * membership scoping (the member, or a verified coach of that team) and the
 * guardian-aware visibility are implemented. Activating broader read before that
 * scoping exists would be a youth-data leak; that is a hard gate, deliberately
 * deferred past Stage B.
 */
const readAdmin: Access = ({ req: { user } }) => isAnyAdmin(user)

export const Availability: CollectionConfig = {
  slug: 'availability',
  access: { read: readAdmin, create: readAdmin, update: readAdmin, delete: readAdmin },
  admin: { useAsTitle: 'id', defaultColumns: ['membership', 'game', 'response'], group: 'Competition', description: 'Scaffold: per-game availability. Admin-only until member scoping is built.' },
  fields: [
    { name: 'membership', type: 'relationship', relationTo: 'team-memberships', required: true, index: true },
    { name: 'game', type: 'relationship', relationTo: 'games', required: true, index: true },
    { name: 'response', type: 'select', defaultValue: 'unknown', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'Maybe', value: 'maybe' }, { label: 'Unknown', value: 'unknown' }] },
    { name: 'note', type: 'text' },
    { name: 'respondedAt', type: 'date' },
  ],
  indexes: [{ fields: ['membership', 'game'], unique: true }],
}
