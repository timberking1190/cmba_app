import type { Access, CollectionConfig } from 'payload'

import { isSuperAdmin } from '../access/index'

/*
 * WebauthnCredentials (S1) — registered passkey public keys. Created only by the
 * verified passkey-registration route (overrideAccess); a user may LIST and DELETE
 * their own (e.g. remove a lost device) but cannot forge or mutate one via REST.
 * The public key and signature counter are never serialized to clients.
 */
const denyAll: Access = () => false

// Owner sees only their own rows; super admins (for support) see all.
const ownerOrSuperAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  return { user: { equals: user.id } }
}

export const WebauthnCredentials: CollectionConfig = {
  slug: 'webauthn-credentials',
  access: {
    read: ownerOrSuperAdmin,
    create: denyAll, // only the verified registration route writes, via overrideAccess
    update: denyAll, // counter updates happen server-side via overrideAccess
    delete: ownerOrSuperAdmin,
  },
  admin: {
    useAsTitle: 'name',
    group: 'System',
    hidden: () => true,
    description: 'Registered passkeys (WebAuthn). Public keys are private.',
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'credentialID', type: 'text', required: true, index: true, unique: true },
    // base64url of the COSE public key bytes; never exposed.
    { name: 'publicKey', type: 'text', required: true, access: { read: () => false } },
    { name: 'counter', type: 'number', required: true, defaultValue: 0, access: { read: () => false } },
    { name: 'transports', type: 'json', admin: { description: 'AuthenticatorTransport[] hint.' } },
    {
      name: 'deviceType',
      type: 'select',
      options: [
        { label: 'Single-device', value: 'singleDevice' },
        { label: 'Multi-device (synced)', value: 'multiDevice' },
      ],
    },
    { name: 'backedUp', type: 'checkbox', defaultValue: false },
    { name: 'name', type: 'text', admin: { description: 'User-friendly label, e.g. "iPhone".' } },
    { name: 'lastUsedAt', type: 'date' },
    { name: 'createdAt', type: 'date' },
  ],
}
