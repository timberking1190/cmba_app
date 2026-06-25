import { APIError } from 'payload'
import type { Access, CollectionConfig, Where } from 'payload'

import { isAnyAdmin, isSuperAdmin, superAdminFieldOnly } from '../access/index'
import { stripImageMetadata } from '../lib/uploads/exif'
import { getVerifiedGameIds, getVerifiedTeamIds } from '../lib/teamAccess'

/*
 * ScoresheetFiles - PRIVATE youth photos of a paper scoresheet. Backed by the
 * private Supabase bucket with Payload access control kept ON (registered with
 * value true, NOT disablePayloadAccessControl), so every download routes through
 * Payload's access-checked endpoint and is gated by the read rule below.
 *
 * Read scope is owner OR a verified member of either team on the linked game. The
 * scope is resolved per request from the requester's CURRENT verified memberships,
 * so a rep who is un-verified loses access immediately. The game backref is
 * server-forced and validated (the uploader must be a verified rep of a team in
 * that game), so it cannot be repointed at another game. EXIF and GPS are stripped
 * from the image before it is stored.
 */
const readScoresheet: Access = async ({ req }) => {
  const user = req.user
  if (!user) return false
  if (isAnyAdmin(user)) return true
  const gameIds = await getVerifiedGameIds(req.payload, user.id)
  const or: Where[] = [{ owner: { equals: user.id } }]
  if (gameIds.length) or.push({ game: { in: gameIds } })
  return { or }
}

const ownerOrSuperAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  return { owner: { equals: user.id } }
}

const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

export const ScoresheetFiles: CollectionConfig = {
  slug: 'scoresheet-files',
  access: {
    read: readScoresheet,
    create: ({ req: { user } }) => Boolean(user),
    update: ownerOrSuperAdmin,
    delete: ownerOrSuperAdmin,
  },
  admin: {
    group: 'Competition',
    useAsTitle: 'filename',
    hidden: ({ user }) => !isSuperAdmin(user),
    description: 'Private scoresheet photos. Downloads are access-controlled; never public.',
  },
  upload: {
    disableLocalStorage: true,
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
  hooks: {
    // Strip EXIF/GPS BEFORE generateFileData captures the buffer Payload stores.
    beforeOperation: [
      async ({ args, operation, req }) => {
        if (operation === 'create') await stripImageMetadata(req)
        return args
      },
    ],
    beforeChange: [
      async ({ req, data, operation }) => {
        const user = req.user
        const next = { ...data }
        // Non super admins can only ever own their own files.
        if (user && !isSuperAdmin(user)) next.owner = user.id
        if (operation === 'create' && user && !isAnyAdmin(user)) {
          // The game backref is required for a member upload and the uploader must
          // be a verified rep of a team in that game, so a photo cannot be attached
          // to a stranger's game (or left unscoped to widen the read later).
          if (!next.game) throw new APIError('A game is required to upload a scoresheet.', 400)
          const gameId = relId(next.game)
          const game = gameId != null ? await req.payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true }).catch(() => null) : null
          if (!game) throw new APIError('That game was not found.', 400)
          const home = relId((game as { homeTeam?: unknown }).homeTeam)
          const away = relId((game as { awayTeam?: unknown }).awayTeam)
          const teamIds = await getVerifiedTeamIds(req.payload, user.id)
          const onGame = teamIds.some((t) => String(t) === String(home) || String(t) === String(away))
          if (!onGame) throw new APIError('You can only attach a scoresheet to your own game.', 403)
        }
        return next
      },
    ],
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
    },
    {
      name: 'game',
      type: 'relationship',
      relationTo: 'games',
      required: true,
      index: true,
      access: { update: superAdminFieldOnly },
      admin: { description: 'The game this scoresheet belongs to. Set at upload and locked.' },
    },
  ],
}
