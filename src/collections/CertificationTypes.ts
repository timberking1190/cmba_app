import type { CollectionConfig } from 'payload'

import { ROLES, superAdminOnly } from '../access/index'

/*
 * CertificationTypes — the catalog of certifications/compliance items modeled on
 * NCCP (coaches), RAMP (officials), and mandatory compliance (Respect in Sport,
 * Safe Sport, concussion, criminal-record check). Public read (catalog); only
 * super admins manage the catalog. `validityMonths` drives auto-expiry.
 */
export const CertificationTypes: CollectionConfig = {
  slug: 'certification-types',
  access: {
    read: () => true,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'isRequired', 'validityMonths'],
    group: 'Training catalog',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Coach', value: 'coach' },
        { label: 'Official', value: 'official' },
        { label: 'Compliance', value: 'compliance' },
        { label: 'Medical', value: 'medical' },
      ],
    },
    {
      name: 'appliesToRoles',
      type: 'select',
      hasMany: true,
      options: ROLES,
      admin: { description: 'Roles this certification is relevant to.' },
    },
    {
      name: 'validityMonths',
      type: 'number',
      min: 0,
      admin: {
        description:
          'Months a certification of this type stays valid. Blank = does not expire. Used to auto-compute expiry.',
      },
    },
    {
      name: 'isRequired',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Is this certification mandatory for its required roles? (org compliance)' },
    },
    {
      // Member Cards D14/D20: the DISTINCT set that gates the sideline scan — separate
      // from broad org compliance (isRequired). A role is scannable iff it has ≥1
      // gatesMemberCard type naming it in requiredForRoles. Seed exactly the coach three
      // (record check + Safe Sport + Coaching in CMBA). Admin-editable, no deploy needed.
      name: 'gatesMemberCard',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Gates the digital Member Card sideline scan (coach clearance). Distinct from org compliance.',
      },
    },
    {
      name: 'requiredForRoles',
      type: 'select',
      hasMany: true,
      options: ROLES,
      admin: {
        condition: (data) => Boolean(data?.isRequired),
        description: 'Roles for which this certification is mandatory.',
      },
    },
    { name: 'renewalUrl', type: 'text', admin: { description: 'Deep-link to renew / take the course.' } },
    {
      name: 'relatedCourse',
      type: 'relationship',
      relationTo: 'courses',
      admin: { description: 'Course that fulfills this certification, if any.' },
    },
    { name: 'description', type: 'textarea' },
  ],
}
