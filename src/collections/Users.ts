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
import { validatePassword } from './hooks/passwordPolicy'
import { enforceMfaRequired } from './hooks/mfa'
import { flagPasswordChange, invalidateSessionsOnPasswordChange } from './hooks/sessionInvalidation'
import { registrationGate } from './hooks/registration'

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
    // registrationGate runs first (mode + bot defense on public sign-up), then
    // validatePassword rejects a weak/breached password before any other processing.
    beforeValidate: [registrationGate, validatePassword, deriveIsMinor, enforceConsent],
    beforeChange: [guardianFlow, enforceMfaRequired, flagPasswordChange],
    afterChange: [sendGuardianConfirmation, logConsentRecord, invalidateSessionsOnPasswordChange],
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
      // Member Cards D18: display-safe id printed on the card and spoken at gyms
      // (e.g. CMBA-04182). System-assigned at card issuance from a Postgres sequence;
      // never the governing-body id, never the pass serial.
      name: 'memberNumber',
      type: 'text',
      unique: true,
      index: true,
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Display-safe member id on the card. System-assigned at issuance.',
      },
    },
    {
      // Member Cards: governing-body / registrar id. NEVER exposed on cards or /verify.
      name: 'externalId',
      type: 'text',
      unique: true,
      access: { read: superAdminFieldOnly, create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { position: 'sidebar', hidden: true, description: 'Governing-body id. Never exposed.' },
    },
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
      name: 'legalHold',
      type: 'checkbox',
      defaultValue: false,
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: {
        position: 'sidebar',
        description: 'When set, this account is exempt from erasure (legal/safety hold).',
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
        // Member-Value engagement consents (guardian-set for minors; default off).
        // These gate any surfacing of a member's progress/recognition/leaderboard
        // presence beyond the owner. Default deny: nothing surfaces without opt-in.
        { name: 'recognitionSurfacing', type: 'checkbox', defaultValue: false, admin: { description: 'Allow approved recognitions of this member to surface beyond the owner.' } },
        { name: 'progressSharing', type: 'checkbox', defaultValue: false, admin: { description: 'Allow a coach or teammate to see this member\'s development progress.' } },
        { name: 'appearOnLeaderboard', type: 'checkbox', defaultValue: false, admin: { description: 'Allow this member to appear on leaderboards (privacy-safe name only).' } },
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
        {
          name: 'gameReminders',
          type: 'checkbox',
          defaultValue: true,
          admin: { description: 'Reminders to report or confirm a game score. Transactional escalations are always sent.' },
        },
        { name: 'weeklyDigest', type: 'checkbox', defaultValue: true, admin: { description: 'A weekly summary of new badges, recognitions, and team news.' } },
        { name: 'recognitionUpdates', type: 'checkbox', defaultValue: true, admin: { description: 'Notify when a recognition for this member is approved.' } },
      ],
    },
    {
      name: 'mfa',
      type: 'group',
      label: 'Multi-factor authentication',
      admin: {
        position: 'sidebar',
        description: 'MFA state. Secrets live in separate private collections. System-managed.',
      },
      fields: [
        // saveToJWT: coarse per-user flags ride in the token so a half-completed
        // session can be evaluated without a DB hit. Per-SESSION assurance lives in
        // sessionMeta, never here.
        {
          name: 'enrolled',
          type: 'checkbox',
          defaultValue: false,
          saveToJWT: true,
          access: { update: () => false },
          admin: { readOnly: true },
        },
        {
          name: 'methods',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'Authenticator app (TOTP)', value: 'totp' },
            { label: 'Passkey', value: 'passkey' },
          ],
          access: { update: () => false },
          admin: { readOnly: true },
        },
        { name: 'enrolledAt', type: 'date', access: { update: () => false }, admin: { readOnly: true } },
        // Derived from roles (any admin role -> required). Drives force-enrollment.
        {
          name: 'required',
          type: 'checkbox',
          defaultValue: false,
          saveToJWT: true,
          access: { update: () => false },
          admin: { readOnly: true },
        },
        { name: 'lastVerifiedAt', type: 'date', access: { read: () => false, update: () => false } },
      ],
    },
    {
      name: 'sessionMeta',
      type: 'array',
      // Parallel to Payload's own sessions[]; keyed by sid. Carries per-session
      // assurance level (aal) + MFA/step-up timestamps. Never serialized; written
      // only server-side via overrideAccess.
      access: { read: () => false, update: () => false },
      admin: { hidden: true },
      fields: [
        { name: 'sid', type: 'text', required: true, index: true },
        {
          name: 'aal',
          type: 'select',
          defaultValue: 'aal1',
          options: [
            { label: 'AAL1 (password only)', value: 'aal1' },
            { label: 'AAL2 (MFA verified)', value: 'aal2' },
          ],
        },
        { name: 'mfaAt', type: 'date' },
        { name: 'stepUpAt', type: 'date' },
        { name: 'ip', type: 'text' },
        { name: 'userAgent', type: 'text' },
      ],
    },
    {
      name: 'pushDevices',
      type: 'array',
      labels: { singular: 'Device', plural: 'Push devices' },
      admin: { description: 'Registered device push tokens for the native apps. Self-managed.', position: 'sidebar' },
      fields: [
        { name: 'token', type: 'text', required: true },
        { name: 'platform', type: 'select', options: [{ label: 'iOS', value: 'ios' }, { label: 'Android', value: 'android' }, { label: 'Web', value: 'web' }] },
        { name: 'registeredAt', type: 'date' },
        { name: 'lastSeenAt', type: 'date' },
      ],
    },
  ],
}
