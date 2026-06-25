import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, superAdminFieldOnly, superAdminOnly } from '../access/index'

/*
 * Seasons - the competition container that owns the standings configuration and
 * the immutable seasonSeed (the absolute final standings tiebreaker key).
 *
 * Read is an intentional public exception to default-deny (like publishedOrAdmin):
 * anyone may read a season that is not archived, so the public schedule and
 * standings pages work signed out. Admins see archived seasons too. Writes are
 * super-admin only. The whole standingsConfig group and the seed are field-locked
 * so only a super admin can change how standings are computed.
 */
const readSeasons: Access = ({ req: { user } }) => {
  if (isAnyAdmin(user)) return true
  return { status: { not_equals: 'archived' } }
}

// Small deterministic, non-random integer hash for the seasonSeed default. The
// seed is only ever used as the stable final tiebreaker key (seasonSeed, team.id),
// so any fixed per-season number is fine; we derive one from the name + start so
// it is reproducible and never depends on Math.random.
function seedFrom(name: string, startDate?: string): number {
  const s = `${name || ''}|${startDate || ''}`
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h | 0)
}

export const Seasons: CollectionConfig = {
  slug: 'seasons',
  access: {
    read: readSeasons,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'sport', 'status', 'startDate', 'endDate'],
    group: 'Competition',
    description: 'A competition season. Owns standings configuration and the immutable tiebreaker seed.',
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        const next = { ...data }
        // Seed is assigned once at create and never recomputed.
        if (operation === 'create' && (next.seasonSeed == null || next.seasonSeed === 0)) {
          next.seasonSeed = seedFrom(next.name, next.startDate)
        }
        return next
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'sport', type: 'text', defaultValue: 'basketball' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'setup',
      options: [
        { label: 'Setup', value: 'setup' },
        { label: 'Active', value: 'active' },
        { label: 'Playoffs', value: 'playoffs' },
        { label: 'Complete', value: 'complete' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    { name: 'startDate', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'endDate', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
    {
      name: 'timezone',
      type: 'text',
      defaultValue: 'America/Edmonton',
      admin: { readOnly: true, description: 'League time zone for game times.' },
    },
    { name: 'defaultGameLengthMinutes', type: 'number', defaultValue: 60, min: 0 },
    { name: 'bufferMinutes', type: 'number', defaultValue: 15, min: 0, admin: { description: 'Added to game length for conflict windows.' } },
    {
      name: 'seasonSeed',
      type: 'number',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Stable final standings tiebreaker key. Set once at create, never recomputed.',
      },
    },
    {
      name: 'standingsConfig',
      type: 'group',
      label: 'Standings configuration',
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
      admin: { description: 'How standings points and tiebreakers are computed. Super admin only.' },
      fields: [
        { name: 'pointsWin', type: 'number', defaultValue: 2 },
        { name: 'pointsLoss', type: 'number', defaultValue: 0 },
        { name: 'pointsTie', type: 'number', defaultValue: 1 },
        {
          name: 'tiebreakers',
          type: 'array',
          labels: { singular: 'Tiebreaker', plural: 'Tiebreakers' },
          admin: { description: 'Applied in order, only among teams still tied. The final tiebreaker is always the season seed.' },
          defaultValue: [{ criterion: 'headToHead' }, { criterion: 'pointDiff' }, { criterion: 'pointsFor' }],
          fields: [
            {
              name: 'criterion',
              type: 'select',
              required: true,
              options: [
                { label: 'Head to head', value: 'headToHead' },
                { label: 'Win percentage', value: 'winPct' },
                { label: 'Point differential (capped)', value: 'pointDiff' },
                { label: 'Points for', value: 'pointsFor' },
                { label: 'Fewest points against', value: 'fewestPointsAgainst' },
                { label: 'Wins', value: 'wins' },
              ],
            },
          ],
        },
        { name: 'pointDiffCap', type: 'number', defaultValue: 40, min: 0, admin: { description: 'Mercy cap. A single game cannot move differential by more than this.' } },
        { name: 'mercyEnabled', type: 'checkbox', defaultValue: true },
        { name: 'includeForfeits', type: 'checkbox', defaultValue: true },
        { name: 'forfeitScoreFor', type: 'number', defaultValue: 20, min: 0 },
        { name: 'forfeitScoreAgainst', type: 'number', defaultValue: 0, min: 0 },
        { name: 'forfeitWinPoints', type: 'number', defaultValue: 2 },
        { name: 'forfeitPenaltyPoints', type: 'number', defaultValue: 0 },
        {
          name: 'pointsForBasis',
          type: 'select',
          defaultValue: 'capped',
          options: [
            { label: 'Capped (matches the differential cap)', value: 'capped' },
            { label: 'Raw', value: 'raw' },
          ],
          admin: { description: 'Whether the points-for tiebreaker uses capped or raw points.' },
        },
        { name: 'legend', type: 'textarea', admin: { description: 'Plain language explanation of how standings are calculated, shown to families.' } },
      ],
    },
  ],
}
