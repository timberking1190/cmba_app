import type { CollectionConfig } from 'payload'

import { canScan, isVerificationAdmin } from '../access/index'
import { readOwnDevicesOrVerificationAdmin, verificationAdminOnly } from '../access/memberCards'

/*
 * ScannerDevices (Member Cards, D9) — each browser the scanner runs in generates a
 * random device id (persisted client-side) and registers it on first login. /verify
 * and /verify-serial require the x-device-id header. Verification admins can revoke a
 * device (set `revokedAt`), which blocklists it immediately server-side.
 *
 * A cleared browser simply re-registers as a new device — this is an audit + kill
 * switch, not hardware attestation.
 */
export const ScannerDevices: CollectionConfig = {
  slug: 'scanner-devices',
  access: {
    read: readOwnDevicesOrVerificationAdmin,
    // A scanner user registers their own device; a verification admin may also create.
    create: ({ req: { user } }) => canScan(user),
    update: verificationAdminOnly, // revoke is an admin action
    delete: verificationAdminOnly,
  },
  admin: {
    group: 'Member Cards',
    useAsTitle: 'deviceId',
    defaultColumns: ['deviceId', 'user', 'label', 'lastSeen', 'revokedAt'],
    description: 'Registered scanner browsers. Revoke to block immediately.',
  },
  hooks: {
    beforeChange: [
      ({ req, data, operation }) => {
        // On self-registration, ownership is always the caller — never spoofable.
        if (operation === 'create' && req.user && !isVerificationAdmin(req.user)) {
          return { ...data, user: req.user.id }
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'deviceId', type: 'text', required: true, unique: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'label', type: 'text', admin: { description: 'Browser/OS string, set on registration.' } },
    { name: 'lastSeen', type: 'date' },
    { name: 'revokedAt', type: 'date', admin: { description: 'Set to revoke; blocks the device server-side.' } },
  ],
}
