import { APIError } from 'payload'
import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, isSuperAdmin, superAdminFieldOnly, superAdminOnly } from '../access/index'
import { emailContested } from '../lib/emailEvents'
import { isFinalized } from '../lib/gameStateMachine'
import { writeAudit } from '../lib/games/service'
import { getVerifiedGameIds, getVerifiedTeamIds } from '../lib/teamAccess'

/*
 * Disputes - a review request that puts a game into the contested state. Creating a
 * dispute is the single way a game becomes contested, whether from a dual-entry
 * mismatch, an opposing review request, or an explicit dispute. beforeChange forces
 * the raiser, verifies they are on the game, and snapshots the scheduling-admin
 * email. afterChange sets the game contested and sends the unsuppressable
 * escalation. Only an admin can resolve a dispute.
 */
const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

const readDisputes: Access = async ({ req }) => {
  const user = req.user
  if (!user) return false
  if (isAnyAdmin(user)) return true
  const gameIds = await getVerifiedGameIds(req.payload, user.id)
  const or: Array<Record<string, unknown>> = [{ raisedBy: { equals: user.id } }]
  if (gameIds.length) or.push({ game: { in: gameIds } })
  return { or } as never
}

export const Disputes: CollectionConfig = {
  slug: 'disputes',
  access: {
    read: readDisputes,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => isAnyAdmin(user),
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['game', 'status', 'assignedAdminEmail', 'createdAt'],
    group: 'Competition',
    description: 'Contested-game review requests. Opening one escalates to the scheduling admin.',
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        const next = { ...data }
        if (operation !== 'create') return next
        const user = req.user
        if (!user) throw new APIError('You must be signed in to request a review.', 401)
        next.createdAt = new Date().toISOString()
        next.raisedBy = user.id // always force identity

        const gameId = relId(next.game)
        const game = gameId != null ? await req.payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true }).catch(() => null) : null
        if (!game) throw new APIError('That game was not found.', 400)
        if (isFinalized((game as { status?: string }).status as never)) {
          throw new APIError('This game is already final. Ask an admin to reopen it if needed.', 409)
        }
        if (!isSuperAdmin(user)) {
          const home = relId((game as { homeTeam?: unknown }).homeTeam)
          const away = relId((game as { awayTeam?: unknown }).awayTeam)
          const teamIds = await getVerifiedTeamIds(req.payload, user.id)
          const onGame = teamIds.some((t) => String(t) === String(home) || String(t) === String(away))
          if (!onGame) throw new APIError('Only a team playing in this game can request a review.', 403)
        }

        // One open review per game (dedupe so two requests do not double-escalate).
        const open = await req.payload.find({ collection: 'disputes', where: { and: [{ game: { equals: gameId } }, { status: { equals: 'open' } }] }, limit: 1, overrideAccess: true })
        if (open.docs.length) throw new APIError('A review is already open for this game.', 409)

        // Snapshot the scheduling-admin email at open time (re-resolved live at send).
        if (!next.assignedAdminEmail) {
          try {
            const s = (await req.payload.findGlobal({ slug: 'site-settings' })) as { schedulingAdmin?: { email?: string | null } } | null
            next.assignedAdminEmail = s?.schedulingAdmin?.email ?? ''
          } catch {
            next.assignedAdminEmail = ''
          }
        }
        return next
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        const payload = req.payload
        const gameId = relId((doc as { game?: unknown }).game)
        if (gameId != null) {
          const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true, req }).catch(() => null)) as { status: string; version?: number } | null
          if (game) {
            // Conditional flip to contested: only when the game is still open, so a
            // dispute racing a concurrent confirm/auto-final never reverts a final.
            await payload.update({
              collection: 'games',
              where: { and: [{ id: { equals: gameId } }, { version: { equals: game.version ?? 1 } }, { status: { in: ['scheduled', 'reported'] } }] },
              data: { status: 'contested', version: (game.version ?? 1) + 1 } as never,
              overrideAccess: true,
              req,
            })
          }
        }
        // The escalation is always sent (unsuppressable), even if the game already finalized.
        await emailContested(payload, { snapshotEmail: (doc as { assignedAdminEmail?: string }).assignedAdminEmail })
        await writeAudit(payload, { actor: req.user as never, action: 'dispute.open', entity: 'disputes', entityId: (doc as { id: string | number }).id, reason: (doc as { reason?: string }).reason }, req)
        return doc
      },
    ],
  },
  fields: [
    { name: 'game', type: 'relationship', relationTo: 'games', required: true, index: true },
    { name: 'raisedBy', type: 'relationship', relationTo: 'users', required: true, index: true, access: { update: superAdminFieldOnly } },
    { name: 'reason', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Resolved', value: 'resolved' },
      ],
      access: { update: superAdminFieldOnly },
    },
    { name: 'assignedAdminEmail', type: 'text', access: { create: superAdminFieldOnly, update: superAdminFieldOnly }, admin: { readOnly: true } },
    { name: 'resolvedBy', type: 'relationship', relationTo: 'users', access: { update: superAdminFieldOnly }, admin: { readOnly: true } },
    { name: 'resolution', type: 'textarea', access: { update: superAdminFieldOnly } },
    { name: 'createdAt', type: 'date', access: { update: superAdminFieldOnly }, admin: { readOnly: true } },
    { name: 'resolvedAt', type: 'date', access: { update: superAdminFieldOnly }, admin: { readOnly: true } },
  ],
}
