import type { Access, CollectionConfig } from 'payload'

/*
 * WebauthnChallenges (S1) — single-use, short-lived challenges for the WebAuthn
 * registration and authentication ceremonies. Written and consumed only by the
 * passkey routes (overrideAccess); deleted immediately on verify. Deny all direct
 * access. The TTL sweep cron removes any that expire unconsumed.
 */
const denyAll: Access = () => false

export const WebauthnChallenges: CollectionConfig = {
  slug: 'webauthn-challenges',
  access: { read: denyAll, create: denyAll, update: denyAll, delete: denyAll },
  admin: {
    useAsTitle: 'id',
    group: 'System',
    hidden: () => true,
    description: 'Ephemeral WebAuthn ceremony challenges. Single-use.',
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', index: true },
    { name: 'value', type: 'text', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Registration', value: 'registration' },
        { label: 'Authentication', value: 'authentication' },
      ],
    },
    { name: 'expiresAt', type: 'date', required: true, index: true },
    { name: 'createdAt', type: 'date' },
  ],
}
