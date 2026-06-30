import type { Access, CollectionConfig } from 'payload'

/*
 * MfaTotp (S1) — one TOTP authenticator secret per user. The secret is stored
 * AES-256-GCM encrypted (never plaintext) and is never serialized to any client.
 * `lastStep` is the replay floor: a TOTP step at or below it is rejected so a code
 * cannot be reused inside its validity window. Written only by the TOTP routes via
 * overrideAccess; deny all direct access.
 */
const denyAll: Access = () => false

export const MfaTotp: CollectionConfig = {
  slug: 'mfa-totp',
  access: { read: denyAll, create: denyAll, update: denyAll, delete: denyAll },
  admin: {
    useAsTitle: 'id',
    group: 'System',
    hidden: () => true,
    description: 'Encrypted TOTP secrets. One per user; private.',
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, unique: true },
    // base64 of iv || authTag || ciphertext; decrypted only server-side at verify.
    { name: 'secretEncrypted', type: 'text', required: true, access: { read: () => false } },
    { name: 'activated', type: 'checkbox', defaultValue: false },
    { name: 'lastStep', type: 'number', defaultValue: 0, access: { read: () => false } },
    { name: 'createdAt', type: 'date' },
    { name: 'activatedAt', type: 'date' },
  ],
}
