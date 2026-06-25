import type { Access, CollectionConfig } from 'payload'

/*
 * RefreshTokens - durable storage for the native app refresh-token flow. The login
 * access JWT is short lived (2h) and has no refresh today, so a long lived refresh
 * token is issued, stored HASHED (never in plaintext), and rotated on every use.
 * If a previously rotated token is presented again (reuse detection), the whole
 * token family is revoked. No caller reads or writes these directly; the auth
 * helper uses overrideAccess. Tokens are scoped to access-token issuance only.
 */
const denyAll: Access = () => false

export const RefreshTokens: CollectionConfig = {
  slug: 'refresh-tokens',
  access: {
    read: denyAll,
    create: denyAll,
    update: denyAll,
    delete: denyAll,
  },
  admin: {
    useAsTitle: 'id',
    group: 'System',
    hidden: () => true,
    description: 'System refresh-token store for native sessions. Hashed; not user editable.',
  },
  fields: [
    { name: 'tokenHash', type: 'text', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'family', type: 'text', required: true, index: true, admin: { description: 'Token family id. Reuse detection revokes the whole family.' } },
    { name: 'expiresAt', type: 'date', required: true, index: true },
    { name: 'revoked', type: 'checkbox', defaultValue: false },
    { name: 'replacedBy', type: 'text', admin: { description: 'Hash of the token that rotated this one.' } },
    { name: 'createdAt', type: 'date' },
  ],
}
