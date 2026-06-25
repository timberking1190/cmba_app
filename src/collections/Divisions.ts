import type { CollectionConfig } from 'payload'

import { superAdminFieldOnly, superAdminOnly } from '../access/index'

/*
 * Divisions - the canonical division entity that replaces the old regex-derived
 * division string. fullPath (for example "Weekend Rec League / U13 Boys / A") is
 * the exact CSV match key; displayLabel is the short label shown in chips and
 * dropdowns. Reads are public because division names are not personal data and
 * the public schedule and standings pages need them signed out. The data layer
 * only surfaces divisions whose season is active, so archived seasons stay hidden
 * at the query layer (Payload access cannot join to the parent season).
 */
export const Divisions: CollectionConfig = {
  slug: 'divisions',
  access: {
    read: () => true,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'fullPath',
    defaultColumns: ['fullPath', 'displayLabel', 'season', 'scheduleType'],
    group: 'Competition',
    description: 'A division within a season. fullPath is the import match key.',
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        const next = { ...data }
        // Compose fullPath from its parts when left blank.
        if (!next.fullPath && next.leagueName && next.ageGroup) {
          next.fullPath = [next.leagueName, next.ageGroup, next.tier].filter(Boolean).join(' / ')
        }
        return next
      },
    ],
  },
  fields: [
    { name: 'fullPath', type: 'text', required: true, admin: { description: 'Exact import match key, for example "Weekend Rec League / U13 Boys / A".' } },
    { name: 'displayLabel', type: 'text', admin: { description: 'Short label for chips and dropdowns, for example "U13 Boys A".' } },
    { name: 'leagueName', type: 'text', required: true },
    { name: 'ageGroup', type: 'text', required: true },
    {
      name: 'gender',
      type: 'select',
      options: [
        { label: 'Boys', value: 'boys' },
        { label: 'Girls', value: 'girls' },
        { label: 'Coed', value: 'coed' },
      ],
    },
    { name: 'tier', type: 'text' },
    {
      name: 'season',
      type: 'relationship',
      relationTo: 'seasons',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
    },
    {
      name: 'scheduleType',
      type: 'select',
      defaultValue: 'round_robin_single',
      options: [
        { label: 'Round robin (single)', value: 'round_robin_single' },
        { label: 'Round robin (double)', value: 'round_robin_double' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      name: 'requiredRampLevel',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Level 1', value: 'level1' },
        { label: 'Level 2', value: 'level2' },
        { label: 'Level 3', value: 'level3' },
      ],
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'Officials below this RAMP level get an eligibility warning when assigned.' },
    },
    { name: 'sortOrder', type: 'number', admin: { position: 'sidebar' } },
  ],
  indexes: [{ fields: ['season', 'fullPath'], unique: true }],
}
