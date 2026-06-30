import { APIError } from 'payload'
import type { CollectionConfig } from 'payload'

import { ownerOrSuperAdmin, superAdminFieldOnly } from '../access/index'

/*
 * XpEvents - SCAFFOLD (model only this stage; the award engine lands in F1b).
 *
 * The append-only XP/points ledger and single source of truth for gamification.
 * Every XP-bearing action is one immutable row; a user's XP total, level, and
 * streak are DERIVED on read by summing rows (the compliance.ts compute-on-read
 * convention), never stored as a mutable counter.
 *
 * Two-tier trust on a single `counts` field plus a `verified` boolean:
 *   - counts='fun_only'  (verified=false): self-reported. Feeds streaks and the
 *     for-fun level bar, and fun_only badges. Does NOT satisfy a badge whose
 *     verificationRequired is true.
 *   - counts='meaningful' (verified=true): coach/admin-stamped or cert-derived.
 *     Satisfies verificationRequired badges.
 * `verified` is superAdminFieldOnly so a participant can never self-set it; rows
 * are written ONLY by the engine via overrideAccess, which is the only path that
 * may mark an event verified. Append-only is enforced the AuditLog way.
 *
 * Idempotency: the engine sets a `dedupeKey`; a UNIQUE (user, dedupeKey) index
 * is the real double-credit guard (e.g. the daily-login or streak cron running
 * twice never credits twice).
 */
export const XpEvents: CollectionConfig = {
  slug: 'xp-events',
  access: {
    read: ownerOrSuperAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'kind', 'amount', 'counts', 'occurredAt'],
    group: 'Engagement',
    description: 'Append-only XP ledger. Written only by the award engine; cannot be edited or deleted.',
  },
  hooks: {
    beforeChange: [
      ({ operation }) => {
        if (operation === 'update') {
          throw new APIError('XP events are append only and cannot be edited.', 403)
        }
      },
    ],
    beforeDelete: [
      () => {
        throw new APIError('XP events are append only and cannot be deleted.', 403)
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
    },
    { name: 'amount', type: 'number', required: true, defaultValue: 0, admin: { description: 'XP awarded (may be 0 for streak-tracking-only events).' } },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Login', value: 'login' },
        { label: 'Challenge', value: 'challenge' },
        { label: 'Quiz', value: 'quiz' },
        { label: 'Drill', value: 'drill' },
        { label: 'Clinic', value: 'clinic' },
        { label: 'Recognition', value: 'recognition' },
        { label: 'Pathway stage', value: 'pathway_stage' },
        { label: 'Streak bonus', value: 'streak_bonus' },
        { label: 'Milestone', value: 'milestone' },
      ],
    },
    {
      name: 'counts',
      type: 'select',
      required: true,
      defaultValue: 'fun_only',
      options: [
        { label: 'Fun only (self-reported)', value: 'fun_only' },
        { label: 'Meaningful (verified)', value: 'meaningful' },
      ],
    },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'True only when coach/admin-verified or cert-derived. Engine-set.' },
    },
    {
      name: 'source',
      type: 'group',
      admin: { description: 'Traceability back to the originating record.' },
      fields: [
        { name: 'collection', type: 'text' },
        { name: 'docId', type: 'text' },
      ],
    },
    { name: 'occurredAt', type: 'date', required: true, index: true, admin: { readOnly: true } },
    { name: 'dedupeKey', type: 'text', required: true, admin: { description: 'Idempotency key, unique per user. Engine-set.' } },
  ],
  indexes: [{ fields: ['user', 'dedupeKey'], unique: true }],
}
