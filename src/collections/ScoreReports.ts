import { APIError } from 'payload'
import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, isSuperAdmin, superAdminFieldOnly, superAdminOnly } from '../access/index'
import { onScoreReportCreated } from '../lib/games/reporting'
import { getVerifiedGameIds } from '../lib/teamAccess'

/*
 * ScoreReports - a verified rep's submitted score for a game. One report per side
 * (unique on game + submittedForTeam). create is intentionally permissive at the
 * access layer because access cannot see the incoming submittedForTeam; the
 * beforeChange hook is the SOLE HARD GATE and re-derives authority from the signed
 * in user: it confirms the team is in the game (read from the GAME, never trusted
 * from the body) AND that the user holds a verified membership on that team, and
 * THROWS otherwise. So a plain authenticated POST straight to /api/score-reports by
 * a non rep is rejected by the hook. afterChange drives the dual-entry transition.
 */
const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

const readScoreReports: Access = async ({ req }) => {
  const user = req.user
  if (!user) return false
  if (isAnyAdmin(user)) return true
  const gameIds = await getVerifiedGameIds(req.payload, user.id)
  if (!gameIds.length) return false
  return { game: { in: gameIds } }
}

export const ScoreReports: CollectionConfig = {
  slug: 'score-reports',
  access: {
    read: readScoreReports,
    create: ({ req: { user } }) => Boolean(user),
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['game', 'submittedForTeam', 'homeScore', 'awayScore', 'submittedAt'],
    group: 'Competition',
    description: 'Submitted scores. The verified-rep gate is enforced in the beforeChange hook.',
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        const next = { ...data }
        if (operation !== 'create') return next
        const user = req.user
        if (!user) throw new APIError('You must be signed in to report a score.', 401)

        // Identity and provenance are always server-set; never trust the body.
        next.submittedAt = new Date().toISOString()
        if (next.source !== 'mobile') next.source = 'web'
        next.submittedBy = user.id

        const gameId = relId(next.game)
        const game = gameId != null ? await req.payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true }).catch(() => null) : null
        if (!game) throw new APIError('That game was not found.', 400)
        const status = (game as { status?: string }).status
        // A report can only be filed on a game that is still open for reporting.
        if (status !== 'scheduled' && status !== 'reported') {
          throw new APIError('This game is not open for new score reports.', 409)
        }
        const home = relId((game as { homeTeam?: unknown }).homeTeam)
        const away = relId((game as { awayTeam?: unknown }).awayTeam)
        const sft = relId(next.submittedForTeam)
        if (String(sft) !== String(home) && String(sft) !== String(away)) {
          throw new APIError('You can only report for a team playing in this game.', 403)
        }

        // The verified-rep gate. Super admins may act on behalf; everyone else
        // (including club admins, who are not reps) must hold a verified membership.
        if (!isSuperAdmin(user)) {
          const m = await req.payload.find({
            collection: 'team-memberships',
            where: { and: [{ user: { equals: user.id } }, { team: { equals: sft } }, { verified: { equals: true } }] },
            limit: 1,
            overrideAccess: true,
          })
          if (!m.docs.length) throw new APIError('You are not a verified representative of that team.', 403)
        }

        // A referenced scoresheet photo must belong to THIS game (and, for a rep,
        // be one they uploaded), so the photo of record cannot point elsewhere.
        if (next.scoresheetPhoto) {
          const fileId = relId(next.scoresheetPhoto)
          const sheet = fileId != null ? await req.payload.findByID({ collection: 'scoresheet-files', id: fileId, depth: 0, overrideAccess: true }).catch(() => null) : null
          if (!sheet) throw new APIError('That scoresheet photo was not found.', 400)
          if (String(relId((sheet as { game?: unknown }).game)) !== String(gameId)) {
            throw new APIError('That scoresheet photo belongs to a different game.', 400)
          }
          if (!isSuperAdmin(user) && String(relId((sheet as { owner?: unknown }).owner)) !== String(user.id)) {
            throw new APIError('You can only attach a scoresheet you uploaded.', 403)
          }
        }
        return next
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') await onScoreReportCreated(req, doc as never)
        return doc
      },
    ],
  },
  fields: [
    { name: 'game', type: 'relationship', relationTo: 'games', required: true, index: true, access: { update: superAdminFieldOnly } },
    {
      name: 'submittedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
      admin: { description: 'The reporting user. Forced to the signed-in user.' },
    },
    { name: 'submittedForTeam', type: 'relationship', relationTo: 'teams', required: true, index: true },
    { name: 'homeScore', type: 'number', required: true, min: 0 },
    { name: 'awayScore', type: 'number', required: true, min: 0 },
    {
      name: 'periodScores',
      type: 'array',
      labels: { singular: 'Period', plural: 'Periods' },
      fields: [
        { name: 'period', type: 'number' },
        { name: 'home', type: 'number', min: 0 },
        { name: 'away', type: 'number', min: 0 },
      ],
    },
    { name: 'scoresheetPhoto', type: 'upload', relationTo: 'scoresheet-files', admin: { description: 'Private photo (the two teams and admins only).' } },
    { name: 'notes', type: 'textarea' },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'web',
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Mobile', value: 'mobile' },
      ],
      access: { update: superAdminFieldOnly },
    },
    { name: 'submittedAt', type: 'date', access: { update: superAdminFieldOnly }, admin: { readOnly: true } },
    { name: 'idempotencyKey', type: 'text', index: true, admin: { readOnly: true } },
  ],
  indexes: [{ fields: ['game', 'submittedForTeam'], unique: true }],
}
