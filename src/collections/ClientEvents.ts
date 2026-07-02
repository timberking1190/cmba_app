import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/index'
import { adminOnly } from '../access/memberCards'

/*
 * ClientEvents (Member Cards) — lightweight telemetry from the scanner browser app
 * (camera errors, decode failures, JS errors) to diagnose field issues. An
 * authenticated scanner may insert its own events (ownership forced server-side);
 * admins read. No PII beyond the reporting user + device.
 */
export const ClientEvents: CollectionConfig = {
  slug: 'client-events',
  access: {
    read: adminOnly,
    create: authenticated,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    group: 'Member Cards',
    useAsTitle: 'event',
    defaultColumns: ['event', 'user', 'deviceId', 'createdAt'],
    hidden: true,
  },
  hooks: {
    beforeChange: [
      ({ req, data, operation }) => {
        if (operation === 'create' && req.user) return { ...data, user: req.user.id }
        return data
      },
    ],
  },
  fields: [
    { name: 'event', type: 'text', required: true, admin: { description: 'e.g. camera_error, decode_timeout, js_error.' } },
    { name: 'deviceId', type: 'text', index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', index: true },
    { name: 'detail', type: 'json' },
  ],
}
