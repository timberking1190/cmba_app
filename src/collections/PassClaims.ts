import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access/memberCards'

/*
 * PassClaims (Member Cards, D7 secondary path) — email claim links for members who
 * have not activated a CMBA+ account. A random 128-bit code is emailed; only its
 * SHA-256 (`codeHash`) is stored — the plaintext code never touches the DB. Links
 * expire in 30 days; re-sending supersedes prior codes (`supersededAt`). The claim
 * page captures the same PIPA consent before delivery.
 *
 * Admin-only at the table level; the claim route consumes codes with overrideAccess.
 */
export const PassClaims: CollectionConfig = {
  slug: 'pass-claims',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: {
    group: 'Member Cards',
    useAsTitle: 'id',
    defaultColumns: ['pass', 'expiresAt', 'consumedAt', 'supersededAt'],
    hidden: true,
  },
  fields: [
    { name: 'pass', type: 'relationship', relationTo: 'passes', required: true, index: true },
    { name: 'codeHash', type: 'text', required: true, index: true, admin: { description: 'SHA-256 of the 128-bit claim code. Plaintext never stored.' } },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'consumedAt', type: 'date' },
    { name: 'supersededAt', type: 'date' },
  ],
}
