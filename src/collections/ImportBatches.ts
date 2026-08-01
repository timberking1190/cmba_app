import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, superAdminFieldOnly } from '../access/index'

/*
 * ImportBatches - one record per CSV import, used for the audit trail and the
 * undo window. The import service writes the batch FIRST in status "pending" with
 * the planned manifest, then commits rows in bounded chunks and records their ids,
 * then flips to "committed". A timeout therefore leaves a resumable pending batch,
 * never orphaned rows. Undo reverses exactly the manifest within the undo window.
 * Lifecycle fields are written by the import service (which uses overrideAccess)
 * and are locked in the admin UI so they cannot be hand-edited.
 */
const adminOnly: Access = ({ req: { user } }) => isAnyAdmin(user)

export const ImportBatches: CollectionConfig = {
  slug: 'import-batches',
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['kind', 'fileName', 'status', 'committedAt'],
    group: 'Competition',
    description: 'Audit record and undo manifest for a CSV import.',
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Teams', value: 'teams' },
        { label: 'Venues', value: 'venues' },
        { label: 'Officials', value: 'officials' },
        { label: 'Games', value: 'games' },
      ],
    },
    { name: 'fileName', type: 'text' },
    { name: 'counts', type: 'json', admin: { description: 'Ready / warnings / errors / imported counts.' } },
    {
      name: 'publishMode',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Committed', value: 'committed' },
        { label: 'Undone', value: 'undone' },
      ],
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true },
    },
    {
      name: 'createdRecords',
      type: 'json',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true, description: 'Undo manifest: the collections and ids created by this import.' },
    },
    {
      /*
       * The same undo window, extended to a bulk edit of existing games. An
       * import's manifest is the rows it CREATED; a bulk edit's manifest is each
       * game's values BEFORE the batch touched it, so undo puts them back rather
       * than deleting anything.
       */
      name: 'bulkAction',
      type: 'text',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true, description: 'Set when this batch was a bulk edit rather than a file import.' },
    },
    {
      name: 'bulkUndo',
      type: 'json',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true, description: 'Undo manifest for a bulk edit: each game and the values it had before.' },
    },
    { name: 'committedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'committedAt', type: 'date', index: true, admin: { readOnly: true } },
    { name: 'undoneBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'undoneAt', type: 'date', admin: { readOnly: true } },
    { name: 'undoExpiresAt', type: 'date', admin: { readOnly: true } },
    { name: 'undoWindowMinutes', type: 'number', defaultValue: 60 },
  ],
}
