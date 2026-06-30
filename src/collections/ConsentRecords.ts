import type { CollectionConfig } from 'payload'

import { superAdminOnly } from '../access/index'

/*
 * ConsentRecords — append-only audit log of every consent sign-off (initial and
 * re-consent). Written by the Users hooks via the Local API (overrideAccess);
 * never created/edited through the API by users. Super-admin read only. This is
 * how CMBA keeps prior acceptance records for history; the Phase 2 audit view
 * reads from here + the current Users.consents group.
 */
export const ConsentRecords: CollectionConfig = {
  slug: 'consent-records',
  access: {
    read: superAdminOnly,
    create: () => false, // only the system (overrideAccess) writes these
    update: () => false,
    delete: () => false,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'kind', 'acceptedAt'],
    group: 'Compliance',
    description: 'Immutable consent audit log.',
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Initial', value: 'initial' },
        { label: 'Re-consent', value: 'reconsent' },
      ],
    },
    { name: 'isMinor', type: 'checkbox', defaultValue: false },
    { name: 'termsVersion', type: 'text' },
    { name: 'privacyVersion', type: 'text' },
    { name: 'guardianConsentVersion', type: 'text' },
    { name: 'marketingOptIn', type: 'checkbox', defaultValue: false },
    { name: 'photoOptIn', type: 'checkbox', defaultValue: false },
    // Member-Value engagement consents (snapshot at sign-off; default off).
    { name: 'recognitionSurfacing', type: 'checkbox', defaultValue: false },
    { name: 'progressSharing', type: 'checkbox', defaultValue: false },
    { name: 'appearOnLeaderboard', type: 'checkbox', defaultValue: false },
    { name: 'acceptedAt', type: 'date', required: true },
    { name: 'acceptedIp', type: 'text' },
  ],
}
