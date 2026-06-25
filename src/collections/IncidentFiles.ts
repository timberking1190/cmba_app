import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, isSuperAdmin, superAdminFieldOnly, superAdminOnly } from '../access/index'
import { stripImageMetadata } from '../lib/uploads/exif'

/*
 * IncidentFiles - PRIVATE photos attached to a game incident report. Read is admin
 * only (these are youth safety records, more sensitive than scoresheets), so they
 * can never be reached through the looser scoresheet read scope. Same private
 * bucket and the same EXIF/GPS strip as scoresheets. Used by GameIncidents (B5).
 */
const readAdmin: Access = ({ req: { user } }) => isAnyAdmin(user)

export const IncidentFiles: CollectionConfig = {
  slug: 'incident-files',
  access: {
    read: readAdmin,
    create: ({ req: { user } }) => Boolean(user),
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    group: 'Compliance',
    useAsTitle: 'filename',
    hidden: ({ user }) => !isSuperAdmin(user),
    description: 'Private incident photos. Admin-only download; never public.',
  },
  upload: {
    disableLocalStorage: true,
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
  hooks: {
    // Strip EXIF/GPS BEFORE generateFileData captures the buffer Payload stores.
    beforeOperation: [
      async ({ args, operation, req }) => {
        if (operation === 'create') await stripImageMetadata(req)
        return args
      },
    ],
    beforeChange: [
      ({ req, data }) => {
        const user = req.user
        if (user && !isSuperAdmin(user)) return { ...data, owner: user.id }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
    },
    { name: 'game', type: 'relationship', relationTo: 'games', index: true, access: { update: superAdminFieldOnly } },
  ],
}
