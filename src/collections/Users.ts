import type { CollectionConfig } from 'payload'

import { ROLES, isAnyAdmin, superAdminFieldOnly } from '../access/index'
import { createUsers, deleteUsers, readUsers, updateUsers } from '../access/users'
import {
  deriveIsMinor,
  enforceConsent,
  guardianFlow,
  logConsentRecord,
  sendGuardianConfirmation,
} from './hooks/users'

/*
 * Users — the auth collection.
 *
 * Email/password auth with login hardening; core profile; roles (admin-only);
 * club; the consents group (server-enforced sign-off); the guardian group +
 * isMinor (guardian-managed minors); and notification prefs. Self-registration
 * is public but gated by the consent-enforcement hook.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 2 * 60 * 60,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  access: {
    read: readUsers,
    create: createUsers,
    update: updateUsers,
    delete: deleteUsers,
    admin: ({ req: { user } }) => isAnyAdmin(user),
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['fullName', 'email', 'roles', 'status', 'isMinor'],
    group: 'People',
  },
  hooks: {
    beforeValidate: [deriveIsMinor, enforceConsent],
    beforeChange: [guardianFlow],
    afterChange: [sendGuardianConfirmation, logConsentRecord],
  },
  fields: [
    { name: 'fullName', type: 'text', required: true, label: 'Full name' },
    { name: 'preferredName', type: 'text', label: 'Preferred name' },
    { name: 'pronouns', type: 'text' },
    { name: 'phone', type: 'text' },
    {
      name: 'dateOfBirth',
      type: 'date',
      required: true,
      admin: {
        description:
          'Determines whether the participant is a minor (under 18). Minors are guardian-managed.',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy-MM-dd' },
      },
    },
    {
      name: 'isMinor',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description: 'Derived from date of birth on every save.',
        position: 'sidebar',
      },
    },
    { name: 'profilePhoto', type: 'upload', relationTo: 'media' },
    { name: 'bio', type: 'textarea' },
    {
      name: 'club',
      type: 'relationship',
      relationTo: 'clubs',
      admin: { position: 'sidebar' },
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['participant'],
      options: ROLES,
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { position: 'sidebar', description: 'Role assignment is restricted to super admins.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Pending', value: 'pending' },
        { label: 'Inactive', value: 'inactive' },
      ],
      access: { update: superAdminFieldOnly },
      admin: {
        position: 'sidebar',
        description: 'Pending = awaiting guardian confirmation (minors). System/admin set.',
      },
    },
    {
      name: 'emergencyContact',
      type: 'group',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'relationship', type: 'text' },
        { name: 'phone', type: 'text' },
      ],
    },
    {
      name: 'consents',
      type: 'group',
      label: 'Consent sign-off',
      admin: { description: 'Recorded at signup and on re-consent. Audited in ConsentRecords.' },
      fields: [
        { name: 'termsVersion', type: 'text' },
        { name: 'privacyVersion', type: 'text' },
        { name: 'guardianConsentVersion', type: 'text' },
        { name: 'acceptedAt', type: 'date' },
        { name: 'acceptedIp', type: 'text' },
        { name: 'marketingOptIn', type: 'checkbox', defaultValue: false },
        { name: 'photoOptIn', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'guardian',
      type: 'group',
      label: 'Guardian (for minors)',
      admin: {
        description: 'Required for participants under 18. The account stays pending until confirmed.',
        condition: (data) => Boolean(data?.isMinor),
      },
      fields: [
        { name: 'name', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
        { name: 'relationship', type: 'text' },
        {
          name: 'confirmed',
          type: 'checkbox',
          defaultValue: false,
          access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
          admin: { readOnly: true },
        },
        {
          name: 'confirmationToken',
          type: 'text',
          access: {
            read: superAdminFieldOnly,
            create: superAdminFieldOnly,
            update: superAdminFieldOnly,
          },
          admin: { hidden: true },
        },
      ],
    },
    {
      name: 'notificationPrefs',
      type: 'group',
      fields: [
        { name: 'certificationReminders', type: 'checkbox', defaultValue: true },
        { name: 'generalUpdates', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
}
