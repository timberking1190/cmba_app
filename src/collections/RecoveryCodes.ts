import type { Access, CollectionConfig } from 'payload'

/*
 * RecoveryCodes (S1) — one-time backup codes for when an enrolled user loses their
 * authenticator. Each code is stored as a salted PBKDF2 hash (codes are shorter
 * than the NIST 112-bit threshold, so a plain SHA-256 is not sufficient). Codes are
 * single-use (`consumedAt`); regenerating replaces the whole set. Written only by
 * the recovery routes via overrideAccess; deny all direct access.
 */
const denyAll: Access = () => false

export const RecoveryCodes: CollectionConfig = {
  slug: 'recovery-codes',
  access: { read: denyAll, create: denyAll, update: denyAll, delete: denyAll },
  admin: {
    useAsTitle: 'id',
    group: 'System',
    hidden: () => true,
    description: 'Hashed single-use recovery codes. Private.',
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, unique: true },
    {
      name: 'codes',
      type: 'array',
      access: { read: () => false },
      fields: [
        { name: 'hash', type: 'text', required: true, access: { read: () => false } },
        { name: 'salt', type: 'text', required: true, access: { read: () => false } },
        { name: 'consumedAt', type: 'date' },
      ],
    },
    { name: 'remaining', type: 'number', defaultValue: 0 },
    { name: 'generatedAt', type: 'date' },
  ],
}
