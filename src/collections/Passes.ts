import type { CollectionConfig } from 'payload'

import { superAdminFieldOnly } from '../access/index'
import { adminOnly, ownedByUserOrAdmin } from '../access/memberCards'

/*
 * Passes (Member Cards) — one wallet/print pass per (member, platform).
 *
 * The pass is just a key: the QR encodes an opaque signed token (see
 * src/lib/memberCards/token.ts); every fact about the member lives server-side.
 * `currentJti` is the ONLY accepted token id for this pass (single-active-jti, D1) —
 * rotating it on an event (reissue / revoke / rollover / leak / key rotation) is what
 * kills old screenshots. `serialNumber` is an unguessable per-pass id printed on the
 * card and used by the manual serial-lookup fallback (D17).
 *
 * Writes happen through issuance/admin route handlers with overrideAccess; members
 * read only their own pass (My Card). Non-coach passes are ID-only (no QR) — only
 * scannable roles get a verification token minted (D20).
 */
const SEASON_HELP = 'Season this pass belongs to, e.g. 2026-27.'

export const Passes: CollectionConfig = {
  slug: 'passes',
  access: {
    read: ownedByUserOrAdmin('member'),
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    group: 'Member Cards',
    useAsTitle: 'serialNumber',
    defaultColumns: ['member', 'platform', 'status', 'season', 'issuedAt'],
    description: 'Wallet/print passes. Managed by issuance — do not hand-edit tokens.',
  },
  fields: [
    { name: 'member', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [
        { label: 'Apple Wallet', value: 'apple' },
        { label: 'Google Wallet', value: 'google' },
        { label: 'Print', value: 'print' },
      ],
    },
    {
      name: 'serialNumber',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Unguessable per-pass id (Apple serialNumber / Google object suffix / print no.).' },
    },
    {
      name: 'currentJti',
      type: 'text',
      access: { read: superAdminFieldOnly, create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true, description: 'The ONLY accepted token id for this pass (D1). Rotated on events.' },
    },
    {
      name: 'appleAuthTokenHash',
      type: 'text',
      access: { read: superAdminFieldOnly, create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { readOnly: true, hidden: true, description: 'HMAC-SHA256 of the PassKit web-service authenticationToken.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'requested',
      options: [
        { label: 'Requested', value: 'requested' },
        { label: 'Issued', value: 'issued' },
        { label: 'Revoked', value: 'revoked' },
        { label: 'Superseded', value: 'superseded' },
      ],
    },
    { name: 'season', type: 'text', required: true, admin: { description: SEASON_HELP } },
    { name: 'issuedAt', type: 'date', admin: { readOnly: true } },
    { name: 'revokedAt', type: 'date', admin: { readOnly: true } },
    { name: 'revokeReason', type: 'text', admin: { readOnly: true } },
  ],
}
