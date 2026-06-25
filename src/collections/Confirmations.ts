import { APIError } from 'payload'
import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, isSuperAdmin, superAdminFieldOnly, superAdminOnly } from '../access/index'
import { checkActorMayConfirm } from '../lib/gameStateMachine'
import { onConfirmationCreated } from '../lib/games/reporting'
import { getVerifiedGameIds, getVerifiedTeamIds } from '../lib/teamAccess'

/*
 * Confirmations - the opposing team's response to a reported score. The
 * beforeChange hook is the hard gate enforcing all four rules from the build plan,
 * all derived from the game and the report and never from the request body:
 *   (a) the confirmer is not the original reporter (no self-confirm),
 *   (b) the confirmer represents the team that is the OPPOSING side of the report,
 *   (c) the confirmer does not represent BOTH teams (a dual-membership user is
 *       routed to an admin instead),
 *   (d) when the report has a scoresheet photo, the confirmer must acknowledge it.
 * afterChange finalizes the game (conditional version+status update) on confirm, or
 * opens a dispute on a review request.
 */
const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

const readConfirmations: Access = async ({ req }) => {
  const user = req.user
  if (!user) return false
  if (isAnyAdmin(user)) return true
  const gameIds = await getVerifiedGameIds(req.payload, user.id)
  if (!gameIds.length) return false
  return { game: { in: gameIds } }
}

export const Confirmations: CollectionConfig = {
  slug: 'confirmations',
  access: {
    read: readConfirmations,
    create: ({ req: { user } }) => Boolean(user),
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['game', 'confirmingTeam', 'decision', 'createdAt'],
    group: 'Competition',
    description: 'Opposing-team confirmations. The four-rule gate is enforced in the beforeChange hook.',
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        const next = { ...data }
        if (operation !== 'create') return next
        const user = req.user
        if (!user) throw new APIError('You must be signed in to confirm a result.', 401)
        next.createdAt = new Date().toISOString()

        const reportId = relId(next.scoreReport)
        const report = reportId != null ? await req.payload.findByID({ collection: 'score-reports', id: reportId, depth: 0, overrideAccess: true }).catch(() => null) : null
        if (!report) throw new APIError('That score report was not found.', 400)
        const gameId = relId((report as { game?: unknown }).game)
        const game = gameId != null ? await req.payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true }).catch(() => null) : null
        if (!game) throw new APIError('That game was not found.', 400)
        next.game = gameId
        // A confirmation only makes sense while the game is awaiting confirmation.
        if ((game as { status?: string }).status !== 'reported') {
          throw new APIError('This game is not waiting for a confirmation.', 409)
        }

        const home = relId((game as { homeTeam?: unknown }).homeTeam)!
        const away = relId((game as { awayTeam?: unknown }).awayTeam)!
        const reportTeam = relId((report as { submittedForTeam?: unknown }).submittedForTeam)!
        const reportBy = relId((report as { submittedBy?: unknown }).submittedBy)!

        next.confirmingUser = user.id

        if (!isSuperAdmin(user)) {
          const verifiedTeamIds = await getVerifiedTeamIds(req.payload, user.id)
          const check = checkActorMayConfirm({
            verifiedTeamIds,
            homeTeamId: home,
            awayTeamId: away,
            reportSubmittedForTeamId: reportTeam,
            reportSubmittedById: reportBy,
            confirmingUserId: user.id,
          })
          if (!check.ok) throw new APIError(check.message, 403)
          // The confirming team is the opposing side, derived from the game.
          next.confirmingTeam = String(home) === String(reportTeam) ? away : home
        } else if (!next.confirmingTeam) {
          next.confirmingTeam = String(home) === String(reportTeam) ? away : home
        }

        // If the report carries a photo, the confirmer must acknowledge it.
        const hasPhoto = (report as { scoresheetPhoto?: unknown }).scoresheetPhoto != null
        if (hasPhoto && next.decision === 'confirmed' && !next.photoAcknowledged) {
          throw new APIError('Please confirm you have reviewed the scoresheet photo before confirming the result.', 400)
        }
        return next
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') await onConfirmationCreated(req, doc as never)
        return doc
      },
    ],
  },
  fields: [
    { name: 'game', type: 'relationship', relationTo: 'games', required: true, index: true, access: { update: superAdminFieldOnly } },
    { name: 'scoreReport', type: 'relationship', relationTo: 'score-reports', required: true, index: true },
    {
      name: 'confirmingUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
    },
    { name: 'confirmingTeam', type: 'relationship', relationTo: 'teams', required: true, access: { update: superAdminFieldOnly } },
    {
      name: 'decision',
      type: 'select',
      required: true,
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Disputed (request review)', value: 'disputed' },
      ],
    },
    { name: 'photoAcknowledged', type: 'checkbox', defaultValue: false },
    { name: 'notes', type: 'textarea' },
    { name: 'createdAt', type: 'date', access: { update: superAdminFieldOnly }, admin: { readOnly: true } },
    { name: 'idempotencyKey', type: 'text', index: true, admin: { readOnly: true } },
  ],
  indexes: [{ fields: ['scoreReport', 'confirmingUser'], unique: true }],
}
