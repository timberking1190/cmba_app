import type { CollectionConfig } from 'payload'

import { denyAll, readScans } from '../access/memberCards'
import { scanResultOptions } from '../lib/memberCards/scanResults'

/*
 * Scans (Member Cards, D24) — append-only audit log of every verification attempt.
 * Feeds the Scan Analytics dashboard: who scanned (user + device), who was scanned,
 * the verdict, WHERE (session venue) and optionally which game, and when.
 *
 * Append-only: update/delete are denied at the access layer here, and a DB trigger
 * (`forbid_mutation`) is added in the migration for defense-in-depth. Rows are
 * written by /verify and /verify-serial with overrideAccess. `clientUuid` dedupes
 * network retries.
 *
 * Reads: verification admins (league_official + staff admin, D24) see ALL scans; a
 * scanner user sees only their own.
 */
export const Scans: CollectionConfig = {
  slug: 'scans',
  access: {
    read: readScans,
    create: denyAll, // only /verify (+overrideAccess) writes scans
    update: denyAll,
    delete: denyAll,
  },
  admin: {
    group: 'Member Cards',
    useAsTitle: 'id',
    defaultColumns: ['scannedAt', 'member', 'result', 'method', 'venue', 'scannedBy'],
    description: 'Append-only scan audit log (Scan Analytics source).',
  },
  fields: [
    { name: 'clientUuid', type: 'text', unique: true, index: true, admin: { description: 'Idempotency key for retries.' } },
    { name: 'scannedBy', type: 'relationship', relationTo: 'users', index: true },
    { name: 'deviceId', type: 'text', index: true },
    { name: 'venue', type: 'relationship', relationTo: 'venues', index: true },
    { name: 'game', type: 'relationship', relationTo: 'games' },
    { name: 'jti', type: 'text', admin: { description: 'Token id presented (null for serial lookups).' } },
    { name: 'member', type: 'relationship', relationTo: 'users', index: true, admin: { description: 'Who was scanned (resolved from the pass).' } },
    { name: 'result', type: 'select', required: true, options: scanResultOptions },
    {
      name: 'method',
      type: 'select',
      required: true,
      defaultValue: 'qr',
      options: [
        { label: 'QR', value: 'qr' },
        { label: 'Serial lookup', value: 'serial' },
      ],
    },
    { name: 'scannedAt', type: 'date', required: true, index: true },
    { name: 'ip', type: 'text' },
    { name: 'deviceInfo', type: 'text' },
  ],
}
