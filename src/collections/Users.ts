import type { CollectionConfig } from 'payload'

import { ROLES, isAnyAdmin, superAdminFieldOnly } from '../access/index'
import { createUsers, deleteUsers, readUsers, updateUsers } from '../access/users'

/*
 * Users — the auth collection.
 *
 * Phase 0 scope: email/password auth (with password reset + login hardening),
 * roles, and the core profile fields. The consents group, guardian group,
 * isMinor handling, and the server-side consent-enforcement hook are added in
 * Phase 1; public self-registration is opened there too.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Auth hardening: lock an account after repeated failed logins.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutes
    tokenExpiration: 2 * 60 * 60, // 2 hours
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
    // Only admins reach the admin panel; participants use the public /account area.
    admin: ({ req: { user } }) => isAnyAdmin(user),
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['fullName', 'email', 'roles', 'status'],
    group: 'People',
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      required: true,
      label: 'Full name',
    },
    {
      name: 'preferredName',
      type: 'text',
      label: 'Preferred name',
    },
    {
      name: 'pronouns',
      type: 'text',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'dateOfBirth',
      type: 'date',
      required: true,
      admin: {
        description:
          'Used to determine whether the participant is a minor (under 18). Minors are guardian-managed.',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy-MM-dd' },
      },
    },
    {
      name: 'profilePhoto',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['participant'],
      options: ROLES,
      // Role assignment is an admin-only field (privilege escalation guard).
      access: {
        create: superAdminFieldOnly,
        update: superAdminFieldOnly,
      },
      admin: {
        description: 'Role assignment is restricted to super admins.',
      },
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
      access: {
        update: superAdminFieldOnly,
      },
      admin: {
        description:
          'Pending = awaiting guardian confirmation (minors) or admin activation. Set by the system/admins only.',
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
  ],
}
