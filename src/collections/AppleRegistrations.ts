import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access/memberCards'

/*
 * AppleRegistrations (Member Cards) — PassKit web-service device registry. Apple
 * Wallet calls our web-service routes to register a device+pass for push updates; we
 * store the push token so APNs can prompt a silent refresh when a pass changes (e.g.
 * on revocation/reissue). Written by the PassKit routes with overrideAccess.
 */
export const AppleRegistrations: CollectionConfig = {
  slug: 'apple-registrations',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: {
    group: 'Member Cards',
    useAsTitle: 'passSerial',
    defaultColumns: ['deviceLibId', 'passSerial', 'createdAt'],
    hidden: true,
  },
  fields: [
    { name: 'deviceLibId', type: 'text', required: true, index: true },
    { name: 'passSerial', type: 'text', required: true, index: true },
    { name: 'pushToken', type: 'text', required: true },
    { name: 'pass', type: 'relationship', relationTo: 'passes' },
  ],
}
