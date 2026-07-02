import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access/memberCards'

/*
 * WalletLogs (Member Cards) — raw Apple/Google Wallet webhook + web-service payloads,
 * kept separate from AuditLog (different shape, higher volume, purgeable) for
 * debugging pass delivery/update issues. Admin-read only; written by the wallet
 * routes with overrideAccess.
 */
export const WalletLogs: CollectionConfig = {
  slug: 'wallet-logs',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: {
    group: 'Member Cards',
    useAsTitle: 'id',
    defaultColumns: ['source', 'createdAt'],
    hidden: true,
  },
  fields: [
    { name: 'source', type: 'text', admin: { description: 'e.g. apple-webservice, google-webhook.' } },
    { name: 'payload', type: 'json', required: true },
  ],
}
