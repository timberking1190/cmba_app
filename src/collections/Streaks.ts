import type { CollectionConfig } from 'payload'

import { ownerOrSuperAdmin, superAdminFieldOnly } from '../access/index'

/*
 * Streaks - SCAFFOLD (model only this stage; the streak-rollup cron lands in F1b).
 *
 * One row per user holding current/longest streak counters. This is a pure
 * MATERIALIZED VIEW of XpEvents: the streak is fully re-derivable from the
 * distinct active days in XpEvents.occurredAt, so this row is a cache, not a
 * source of truth, and a reconcile is just a recompute from the ledger.
 *
 * Unlike the append-only ledgers this row is MUTABLE (the cron advances the
 * counters), so there is NO append-only hook here. Access create/update/delete
 * are denied at the access layer; the nightly streak-rollup cron is the SOLE
 * writer, via overrideAccess. One writer, one source of truth - no two-writer
 * race. Streaks are fun-only by design (self-reported activity), never a public
 * ranking; owner-only display, no PII.
 */
export const Streaks: CollectionConfig = {
  slug: 'streaks',
  access: {
    read: ownerOrSuperAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'currentStreakDays', 'longestStreakDays', 'lastActiveDay'],
    group: 'Engagement',
    description: 'Materialized streak counters. Written only by the streak-rollup cron.',
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
    { name: 'currentStreakDays', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'longestStreakDays', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'lastActiveDay', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayOnly' } } },
    {
      name: 'streakKind',
      type: 'select',
      defaultValue: 'activity',
      options: [
        { label: 'Activity', value: 'activity' },
        { label: 'Login', value: 'login' },
      ],
    },
  ],
  indexes: [{ fields: ['user'], unique: true }],
}
