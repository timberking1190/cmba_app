import type { CollectionConfig } from 'payload'

import { superAdminOnly } from '../access/index'

/*
 * Pathways — development progression for coaches and officials. Each pathway has
 * ordered stages; a stage requires certain CertificationTypes. User progress is
 * COMPUTED (not stored) from the user's valid certifications (see
 * src/lib/compliance.ts). Public read; super admins manage.
 */
export const Pathways: CollectionConfig = {
  slug: 'pathways',
  access: {
    read: () => true,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'audience'],
    group: 'Training catalog',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'audience',
      type: 'select',
      required: true,
      options: [
        { label: 'Coach', value: 'coach' },
        { label: 'Official', value: 'official' },
      ],
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'stages',
      type: 'array',
      labels: { singular: 'Stage', plural: 'Stages' },
      required: true,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        {
          name: 'order',
          type: 'number',
          required: true,
          admin: { description: 'Sort order (1 = first stage).' },
        },
        {
          name: 'xpReward',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'XP awarded for completing this stage.' },
        },
        {
          name: 'requiredCertificationTypes',
          type: 'relationship',
          relationTo: 'certification-types',
          hasMany: true,
          admin: { description: 'Certifications a user must hold (valid) to complete this stage.' },
        },
      ],
    },
  ],
}
