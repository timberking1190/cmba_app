import type { Access, CollectionConfig } from 'payload'

/*
 * EmailOtp (S1) — short-lived one-time passcodes emailed for account RECOVERY only
 * (never a primary admin second factor). The code is stored hashed; verification is
 * constant-time, single-use (`consumedAt`), attempt-capped, and rate limited.
 * Requires SES to deliver, so it ships behind FEATURE_EMAIL_OTP. Written only by the
 * email-OTP routes via overrideAccess; deny all direct access.
 */
const denyAll: Access = () => false

export const EmailOtp: CollectionConfig = {
  slug: 'email-otp',
  access: { read: denyAll, create: denyAll, update: denyAll, delete: denyAll },
  admin: {
    useAsTitle: 'id',
    group: 'System',
    hidden: () => true,
    description: 'Hashed recovery one-time passcodes. Private.',
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'hash', type: 'text', required: true, access: { read: () => false } },
    {
      name: 'purpose',
      type: 'select',
      required: true,
      defaultValue: 'recovery',
      options: [
        { label: 'Recovery', value: 'recovery' },
        { label: 'Step-up', value: 'stepup' },
      ],
    },
    { name: 'expiresAt', type: 'date', required: true, index: true },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'consumedAt', type: 'date' },
    { name: 'createdAt', type: 'date' },
  ],
}
