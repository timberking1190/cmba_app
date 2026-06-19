import type { GlobalConfig } from 'payload'

import { superAdminOnly } from '../access/index'

/*
 * PolicyVersions — the CURRENT version string of each legal document. The
 * consent-enforcement hook compares a new account's recorded consent versions to
 * these. Bump a version when a document changes materially; users/guardians are
 * then re-prompted to accept at next sign-in (see src/collections/hooks/users.ts
 * and the auth flow). Public read (the signup form stamps these); super-admin write.
 */
export const PolicyVersions: GlobalConfig = {
  slug: 'policy-versions',
  access: {
    read: () => true,
    update: superAdminOnly,
  },
  admin: {
    group: 'Compliance',
  },
  fields: [
    {
      name: 'termsVersion',
      type: 'text',
      required: true,
      defaultValue: '2026-06-01',
      admin: { description: 'Current Terms of Use version (e.g. a date or semver).' },
    },
    {
      name: 'privacyVersion',
      type: 'text',
      required: true,
      defaultValue: '2026-06-01',
    },
    {
      name: 'guardianConsentVersion',
      type: 'text',
      required: true,
      defaultValue: '2026-06-01',
      admin: { description: 'Current Guardian Consent & Children’s Privacy Notice version.' },
    },
  ],
}
