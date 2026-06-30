import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, superAdminOnly } from '../access/index'
import { AUDIENCES } from '../lib/audience'

/*
 * Badges - SCAFFOLD (model only this stage; the award engine lands in F1b).
 *
 * The CMS-authored catalog of every badge definition across all four audiences.
 * Declarative earn criteria (earnKind + earnConfig) replace the positional
 * COACH_BADGES.slice(0, n) hack so staff can add or retire badges without code.
 * A badge whose `verificationRequired` is true only counts when backed by a
 * VERIFIED XpEvent (see XpEvents.counts / verified) - the award engine enforces
 * that. This is a content catalog: it holds no personal data.
 *
 * Access: any signed-in user reads ACTIVE badges; admins read all; only super
 * admins author. Mirrors the Courses catalog shape.
 */
const readActiveOrAdmin: Access = ({ req: { user } }) => {
  if (isAnyAdmin(user)) return true
  if (!user) return false
  return { active: { equals: true } }
}

export const Badges: CollectionConfig = {
  slug: 'badges',
  access: {
    read: readActiveOrAdmin,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'tier', 'earnKind', 'active'],
    group: 'Training catalog',
    description: 'Catalog of badge definitions with declarative earn criteria. No personal data.',
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true, admin: { description: 'Stable identifier, e.g. first-whistle.' } },
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'icon', type: 'text', admin: { description: 'Emoji rendered as text, e.g. 🏀.' } },
    {
      name: 'audience',
      type: 'select',
      hasMany: true,
      required: true,
      options: AUDIENCES,
      admin: { description: 'Audiences this badge can be earned by.' },
    },
    {
      name: 'tier',
      type: 'select',
      required: true,
      defaultValue: 'bronze',
      options: [
        { label: 'Bronze', value: 'bronze' },
        { label: 'Silver', value: 'silver' },
        { label: 'Gold', value: 'gold' },
        { label: 'Milestone', value: 'milestone' },
      ],
    },
    {
      name: 'earnKind',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'XP threshold', value: 'xp_threshold' },
        { label: 'Streak threshold', value: 'streak_threshold' },
        { label: 'Verified count', value: 'verified_count' },
        { label: 'Pathway stage', value: 'pathway_stage' },
        { label: 'Recognition', value: 'recognition' },
        { label: 'Manual (admin only)', value: 'manual' },
      ],
      admin: { description: 'How the award engine decides this badge is earned.' },
    },
    {
      name: 'earnConfig',
      type: 'group',
      admin: { description: 'Parameters for earnKind.' },
      fields: [
        { name: 'threshold', type: 'number', min: 0, admin: { description: 'For xp_threshold / streak_threshold / verified_count.' } },
        { name: 'sourceKey', type: 'text', admin: { description: 'Event source the count is over, e.g. challenge.verified.' } },
      ],
    },
    {
      name: 'verificationRequired',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'When set, only VERIFIED (coach/admin-stamped) events count toward this badge.' },
    },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { description: 'Inactive badges are hidden from members and never awarded.' } },
    { name: 'externalId', type: 'text', index: true, admin: { description: 'Sync/dedupe key for seeded or imported badges.' } },
  ],
}
