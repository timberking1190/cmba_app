import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, superAdminFieldOnly } from '../access/index'

/*
 * PlayerStats - SCAFFOLD (model only this stage). Per-player box scores entered from
 * the scoresheet. This is individual minor data, so read is admin only until a
 * consent model exists for sharing a child's individual stats; the `enabled` flag
 * gates the feature. Activating it before that consent model is a youth-data leak,
 * deliberately deferred past Stage B.
 */
const readAdmin: Access = ({ req: { user } }) => isAnyAdmin(user)

export const PlayerStats: CollectionConfig = {
  slug: 'player-stats',
  access: { read: readAdmin, create: readAdmin, update: readAdmin, delete: readAdmin },
  admin: { useAsTitle: 'id', defaultColumns: ['game', 'membership', 'points'], group: 'Competition', description: 'Scaffold: per-player box scores. Disabled until a consent model exists.' },
  fields: [
    { name: 'game', type: 'relationship', relationTo: 'games', required: true, index: true },
    { name: 'team', type: 'relationship', relationTo: 'teams', index: true },
    { name: 'membership', type: 'relationship', relationTo: 'team-memberships', required: true, index: true },
    { name: 'points', type: 'number', min: 0 },
    { name: 'fouls', type: 'number', min: 0 },
    { name: 'rebounds', type: 'number', min: 0 },
    { name: 'assists', type: 'number', min: 0 },
    { name: 'minutes', type: 'number', min: 0 },
    { name: 'enteredBy', type: 'relationship', relationTo: 'users', access: { update: superAdminFieldOnly }, admin: { readOnly: true } },
    { name: 'enabled', type: 'checkbox', defaultValue: false, admin: { description: 'Feature flag. Off until a consent model for sharing individual minor stats exists.' } },
  ],
}
