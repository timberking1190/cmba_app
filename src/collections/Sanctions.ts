import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, superAdminFieldOnly } from '../access/index'

/*
 * Sanctions - SCAFFOLD (model only this stage). Tracks suspensions, warnings, and
 * accumulated technicals tied to a membership and optionally a game. Admin-managed
 * for now; the eligibility check that would block a suspended player from the next
 * game lands in a later stage. Read is admin only until that wiring exists.
 */
const readAdmin: Access = ({ req: { user } }) => isAnyAdmin(user)

export const Sanctions: CollectionConfig = {
  slug: 'sanctions',
  access: { read: readAdmin, create: readAdmin, update: readAdmin, delete: readAdmin },
  admin: { useAsTitle: 'id', defaultColumns: ['subjectMembership', 'type', 'status', 'gamesSuspended'], group: 'Competition', description: 'Scaffold: disciplinary records. Not yet wired into eligibility.' },
  fields: [
    { name: 'subjectMembership', type: 'relationship', relationTo: 'team-memberships', index: true },
    { name: 'game', type: 'relationship', relationTo: 'games', index: true },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Suspension', value: 'suspension' },
        { label: 'Warning', value: 'warning' },
        { label: 'Technical accumulation', value: 'technical_accumulation' },
        { label: 'Ejection', value: 'ejection' },
      ],
    },
    { name: 'gamesSuspended', type: 'number', min: 0 },
    { name: 'status', type: 'select', defaultValue: 'active', options: [{ label: 'Active', value: 'active' }, { label: 'Served', value: 'served' }, { label: 'Overturned', value: 'overturned' }] },
    { name: 'notes', type: 'textarea' },
    { name: 'createdAt', type: 'date', access: { update: superAdminFieldOnly }, admin: { readOnly: true } },
  ],
}
