import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access/memberCards'

/*
 * VerificationTokens (Member Cards, D1) — an audit of every minted `jti`. Holds NO
 * secret material: authenticity comes from the Ed25519 signature, currency from the
 * single-active `passes.currentJti` check. A row here lets an admin see when a token
 * was minted, for which pass/channel/key, and whether it was explicitly revoked.
 *
 * Members never read this collection. All writes go through issuance/rotation route
 * handlers (overrideAccess).
 */
export const VerificationTokens: CollectionConfig = {
  slug: 'verification-tokens',
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    group: 'Member Cards',
    useAsTitle: 'jti',
    defaultColumns: ['jti', 'pass', 'channel', 'kid', 'expiresAt', 'revokedAt'],
    description: 'Audit of minted pass tokens. No secret material.',
    hidden: true,
  },
  fields: [
    { name: 'jti', type: 'text', required: true, unique: true, index: true },
    { name: 'pass', type: 'relationship', relationTo: 'passes', required: true, index: true },
    { name: 'member', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'channel',
      type: 'select',
      required: true,
      options: [
        { label: 'Wallet', value: 'wallet' },
        { label: 'Print', value: 'print' },
      ],
    },
    { name: 'kid', type: 'text', required: true, admin: { description: 'Signing key id used to mint.' } },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'revokedAt', type: 'date' },
  ],
}
