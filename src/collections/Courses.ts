import type { CollectionConfig } from 'payload'

import { ROLES, superAdminOnly } from '../access/index'

/*
 * Courses — the education/training catalog. Replaces the static
 * reach360CourseData.ts and the hardcoded course arrays on the coach/ref pages
 * (those files become seed sources). Public read; super admins manage.
 */
export const Courses: CollectionConfig = {
  slug: 'courses',
  access: {
    read: () => true,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'provider', 'format', 'mandatory'],
    group: 'Training catalog',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'provider',
      type: 'text',
      admin: { description: 'e.g. Reach360 (CMBA), Coaching Association of Canada, RAMP.' },
    },
    { name: 'format', type: 'text', admin: { description: 'e.g. Online, self-paced; In-person clinic.' } },
    { name: 'level', type: 'text' },
    { name: 'cost', type: 'text' },
    { name: 'duration', type: 'text' },
    { name: 'targetAudience', type: 'text' },
    { name: 'registerUrl', type: 'text' },
    { name: 'mandatory', type: 'checkbox', defaultValue: false },
    {
      name: 'requiredForRoles',
      type: 'select',
      hasMany: true,
      options: ROLES,
    },
    {
      name: 'relatedCertificationType',
      type: 'relationship',
      relationTo: 'certification-types',
    },
    {
      name: 'externalId',
      type: 'text',
      admin: { description: 'Provider course id (e.g. Reach360 course UUID), for sync/dedupe.' },
      index: true,
    },
    {
      name: 'modules',
      type: 'array',
      labels: { singular: 'Module', plural: 'Modules' },
      fields: [
        { name: 'number', type: 'number' },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
      ],
    },
    {
      name: 'tags',
      type: 'array',
      fields: [{ name: 'tag', type: 'text', required: true }],
    },
  ],
}
