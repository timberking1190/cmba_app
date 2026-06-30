import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, superAdminOnly } from '../access/index'

/*
 * Challenges - SCAFFOLD (model only this stage; the athlete UI lands later).
 *
 * CMS catalog of skill challenges (weekly form-shooting, timed dribble course,
 * defensive slides, etc). Staff author them without code. A challenge holds no
 * personal data; an athlete's attempt lives in ChallengeSubmissions. Active
 * challenges are a public catalog (no PII); only super admins author.
 */
const readActiveOrAdmin: Access = ({ req: { user } }) => {
  if (isAnyAdmin(user)) return true
  return { active: { equals: true } }
}

export const Challenges: CollectionConfig = {
  slug: 'challenges',
  access: {
    read: readActiveOrAdmin,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'skill', 'xpReward', 'requiresVerification', 'active'],
    group: 'Training catalog',
    description: 'Catalog of skill challenges. No personal data.',
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'skill',
      type: 'select',
      options: [
        { label: 'Shooting', value: 'shooting' },
        { label: 'Dribbling', value: 'dribbling' },
        { label: 'Passing', value: 'passing' },
        { label: 'Defense', value: 'defense' },
        { label: 'Conditioning', value: 'conditioning' },
      ],
    },
    { name: 'ageGroup', type: 'text', admin: { description: 'Stage or age group this challenge targets (e.g. U13).' } },
    { name: 'instructions', type: 'textarea' },
    { name: 'xpReward', type: 'number', defaultValue: 100, min: 0, admin: { description: 'Meaningful XP granted when a submission is verified.' } },
    { name: 'requiresVerification', type: 'checkbox', defaultValue: true, admin: { description: 'When set, a coach/admin must verify a submission before the meaningful XP and any badge count.' } },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'externalId', type: 'text', index: true },
  ],
}
