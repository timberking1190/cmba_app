import type { Access, CollectionConfig, FieldAccess, Where } from 'payload'

import { isAnyAdmin, isSuperAdmin } from '../access/index'
import { isFinalized } from '../lib/gameStateMachine'
import { getVerifiedTeamIds } from '../lib/teamAccess'
import type { GameStatus } from '../lib/scheduleUtils'

/*
 * Games - the central scheduled-game and result entity.
 *
 * Read is an INTENTIONAL exception to default-deny (like publishedOrAdmin): the
 * public schedule must read published games signed out. Anonymous callers get
 * published games only; a signed-in verified rep additionally sees their own
 * team's draft games. Admins see everything. Writes are admin only and reps NEVER
 * write a Game directly: every status and score transition goes through
 * src/lib/games/service.ts, which uses overrideAccess inside an already-authorized
 * branch. status, publishState, scores, forfeit, version, and changeLog are field
 * locked; on a finalized game, scores and status can only be changed by a super
 * admin (matching the override route), so a club admin cannot rewrite a final.
 */
const readGames: Access = async ({ req }) => {
  const user = req.user
  if (isAnyAdmin(user)) return true
  const base: Where[] = [{ publishState: { equals: 'published' } }]
  if (user) {
    const teamIds = await getVerifiedTeamIds(req.payload, user.id)
    if (teamIds.length) {
      base.push({ homeTeam: { in: teamIds } })
      base.push({ awayTeam: { in: teamIds } })
    }
  }
  return { or: base }
}

const adminWrite: Access = ({ req: { user } }) => isAnyAdmin(user)

// Admin-only field, and on a finalized game only a super admin (matches the
// override route, which is super-admin-only for finalized games). The service
// writes via overrideAccess, which bypasses this; this protects the admin panel.
const scoreFieldLock: FieldAccess = ({ req: { user }, doc }) => {
  const status = (doc as { status?: GameStatus } | undefined)?.status
  if (status && isFinalized(status) && !isSuperAdmin(user)) return false
  return isAnyAdmin(user)
}

const adminFieldOnly: FieldAccess = ({ req: { user } }) => isAnyAdmin(user)

export const Games: CollectionConfig = {
  slug: 'games',
  access: {
    read: readGames,
    create: adminWrite,
    update: adminWrite,
    delete: adminWrite,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['division', 'homeTeam', 'awayTeam', 'startAt', 'status', 'publishState'],
    group: 'Competition',
    description: 'Scheduled games and results. Transitions go through the games service, not direct edits.',
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        const next = { ...data }
        // Compute endAt from the season default game length.
        if (next.startAt && next.season) {
          const seasonId = typeof next.season === 'object' ? next.season.id : next.season
          try {
            const season = await req.payload.findByID({ collection: 'seasons', id: seasonId, depth: 0 })
            const minutes = season?.defaultGameLengthMinutes ?? 60
            next.endAt = new Date(new Date(next.startAt).getTime() + minutes * 60_000).toISOString()
          } catch {
            // season not found; leave endAt as-is
          }
        }
        // Optimistic version: bump on update unless the caller set it explicitly.
        if (operation === 'update' && next.version == null) {
          next.version = ((originalDoc as { version?: number } | undefined)?.version ?? 1) + 1
        }
        // Lock the result timestamp when the game becomes final or forfeit.
        if (next.status && isFinalized(next.status as GameStatus) && !next.lockedAt) {
          next.lockedAt = new Date().toISOString()
        }
        return next
      },
    ],
  },
  fields: [
    { name: 'season', type: 'relationship', relationTo: 'seasons', required: true, index: true },
    { name: 'division', type: 'relationship', relationTo: 'divisions', required: true, index: true },
    { name: 'homeTeam', type: 'relationship', relationTo: 'teams', required: true, index: true },
    { name: 'awayTeam', type: 'relationship', relationTo: 'teams', required: true, index: true },
    { name: 'venue', type: 'relationship', relationTo: 'venues', index: true },
    { name: 'court', type: 'relationship', relationTo: 'courts', index: true },
    {
      name: 'startAt',
      type: 'date',
      required: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Stored UTC; entered in the league time zone.' },
    },
    { name: 'endAt', type: 'date', admin: { readOnly: true, description: 'Computed from the season game length.' } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'scheduled',
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Reported', value: 'reported' },
        { label: 'Contested', value: 'contested' },
        { label: 'Final', value: 'final' },
        { label: 'Postponed', value: 'postponed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Forfeit', value: 'forfeit' },
      ],
      access: { update: scoreFieldLock },
      admin: { description: 'Transitions go through the games service. Finalized status is super admin only.' },
    },
    {
      name: 'publishState',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      access: { update: adminFieldOnly },
      admin: { position: 'sidebar', description: 'Draft is not visible on the public site.' },
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 1,
      access: { update: adminFieldOnly },
      admin: { readOnly: true, position: 'sidebar', description: 'Optimistic lock. Bumped on every write.' },
    },
    { name: 'homeScore', type: 'number', min: 0, access: { update: scoreFieldLock } },
    { name: 'awayScore', type: 'number', min: 0, access: { update: scoreFieldLock } },
    {
      name: 'periodScores',
      type: 'array',
      labels: { singular: 'Period', plural: 'Periods' },
      access: { update: scoreFieldLock },
      fields: [
        { name: 'period', type: 'number' },
        { name: 'home', type: 'number', min: 0 },
        { name: 'away', type: 'number', min: 0 },
      ],
    },
    {
      name: 'forfeit',
      type: 'group',
      access: { update: scoreFieldLock },
      fields: [
        { name: 'isForfeit', type: 'checkbox', defaultValue: false },
        {
          name: 'outcome',
          type: 'select',
          options: [
            { label: 'Home forfeits', value: 'home_forfeit' },
            { label: 'Away forfeits', value: 'away_forfeit' },
            { label: 'Both forfeit', value: 'double_forfeit' },
            { label: 'No contest (excluded)', value: 'no_contest' },
          ],
        },
        { name: 'forfeitingTeam', type: 'relationship', relationTo: 'teams' },
        { name: 'reason', type: 'text' },
      ],
    },
    {
      name: 'changeLog',
      type: 'array',
      labels: { singular: 'Change', plural: 'Change log' },
      access: { update: adminFieldOnly },
      admin: { readOnly: true, description: 'Appended by the games service on every change.' },
      fields: [
        { name: 'at', type: 'date' },
        { name: 'actor', type: 'relationship', relationTo: 'users' },
        { name: 'actorEmail', type: 'text' },
        { name: 'field', type: 'text' },
        { name: 'from', type: 'text' },
        { name: 'to', type: 'text' },
        { name: 'reason', type: 'text' },
      ],
    },
    { name: 'isBye', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'A bye is not scheduled on a court and never counts in standings.' } },
    { name: 'lockedAt', type: 'date', access: { update: adminFieldOnly }, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'externalId', type: 'text', index: true },
    { name: 'notes', type: 'textarea' },
    { name: 'importBatch', type: 'relationship', relationTo: 'import-batches', index: true, admin: { position: 'sidebar', readOnly: true } },
  ],
}
