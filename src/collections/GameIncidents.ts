import { APIError } from 'payload'
import type { Access, CollectionConfig } from 'payload'

import { isAnyAdmin, superAdminFieldOnly, superAdminOnly } from '../access/index'
import { getVerifiedTeamIds } from '../lib/teamAccess'

/*
 * GameIncidents - a youth-safety incident report tied to a specific game (injury,
 * conduct, ejection). Read is ADMIN ONLY (more sensitive than scoresheets); the
 * attachment lives in the admin-only IncidentFiles bucket so it can never be reached
 * through the looser scoresheet read path. A verified rep, an assigned official, or
 * an admin may file one; the filer identity is forced and the role is validated, not
 * self-asserted.
 */
const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

const readAdmin: Access = ({ req: { user } }) => isAnyAdmin(user)

export const GameIncidents: CollectionConfig = {
  slug: 'game-incidents',
  access: {
    read: readAdmin,
    create: ({ req: { user } }) => Boolean(user),
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['game', 'type', 'filedByRole', 'status', 'createdAt'],
    group: 'Compliance',
    description: 'Game-linked incident reports. Admin-only; youth-safety data.',
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        const next = { ...data }
        if (operation !== 'create') return next
        const user = req.user
        if (!user) throw new APIError('You must be signed in to file an incident.', 401)
        next.filedBy = user.id
        next.createdAt = new Date().toISOString()

        const gameId = relId(next.game)
        const game = gameId != null ? await req.payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true }).catch(() => null) : null
        if (!game) throw new APIError('That game was not found.', 400)

        if (isAnyAdmin(user)) {
          next.filedByRole = next.filedByRole ?? 'admin'
          return next
        }
        const home = relId((game as { homeTeam?: unknown }).homeTeam)
        const away = relId((game as { awayTeam?: unknown }).awayTeam)
        const teamIds = await getVerifiedTeamIds(req.payload, user.id)
        const onTeam = teamIds.some((t) => String(t) === String(home) || String(t) === String(away))
        if (onTeam) {
          next.filedByRole = 'rep'
          return next
        }
        const assigned = await req.payload.find({ collection: 'game-officials', where: { and: [{ game: { equals: gameId } }, { officialUserId: { equals: user.id } }] }, limit: 1, overrideAccess: true })
        if (assigned.docs.length) {
          next.filedByRole = 'official'
          return next
        }
        throw new APIError('Only a team in this game, an assigned official, or an admin can file an incident.', 403)
      },
    ],
  },
  fields: [
    { name: 'game', type: 'relationship', relationTo: 'games', required: true, index: true },
    { name: 'filedBy', type: 'relationship', relationTo: 'users', required: true, index: true, access: { update: superAdminFieldOnly } },
    {
      name: 'filedByRole',
      type: 'select',
      required: true,
      defaultValue: 'rep',
      options: [
        { label: 'Rep', value: 'rep' },
        { label: 'Coach', value: 'coach' },
        { label: 'Official', value: 'official' },
        { label: 'Admin', value: 'admin' },
      ],
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Injury', value: 'injury' },
        { label: 'Conduct', value: 'conduct' },
        { label: 'Ejection', value: 'ejection' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'involvedTeam', type: 'relationship', relationTo: 'teams' },
    { name: 'description', type: 'textarea', required: true },
    { name: 'occurredAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'attachment', type: 'upload', relationTo: 'incident-files', admin: { description: 'Private, admin-only photo.' } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Reviewing', value: 'reviewing' },
        { label: 'Closed', value: 'closed' },
      ],
      access: { create: superAdminFieldOnly, update: superAdminFieldOnly },
    },
    { name: 'createdAt', type: 'date', access: { update: superAdminFieldOnly }, admin: { readOnly: true } },
  ],
}
