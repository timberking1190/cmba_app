import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access/memberCards'

/*
 * ImportExceptions (Member Cards, D15) — per-row failures from a credential import,
 * surfaced in the admin exceptions UI so an operator can fix and re-run. Attached to
 * the owning import batch. `errorCode` is one of a small set (MISSING_EXTERNAL_ID,
 * BAD_DATE, UNKNOWN_STATUS, DUP_IN_FILE, NO_MEMBER_MATCH, …).
 */
export const ImportExceptions: CollectionConfig = {
  slug: 'import-exceptions',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: {
    group: 'Member Cards',
    useAsTitle: 'errorCode',
    defaultColumns: ['importBatch', 'rowNumber', 'errorCode', 'resolved'],
    description: 'Per-row credential-import exceptions.',
  },
  fields: [
    { name: 'importBatch', type: 'relationship', relationTo: 'import-batches', required: true, index: true },
    { name: 'rowNumber', type: 'number', required: true },
    { name: 'rawRow', type: 'json', required: true },
    { name: 'errorCode', type: 'text', required: true },
    { name: 'message', type: 'text', required: true },
    { name: 'resolved', type: 'checkbox', defaultValue: false },
  ],
}
