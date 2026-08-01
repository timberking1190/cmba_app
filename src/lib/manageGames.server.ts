import 'server-only'
import type { Payload } from 'payload'

import { toAdminGame, type AdminGame } from './manageGames'

/*
 * Server-side loaders for the scheduling consoles. Officials are fetched for a
 * whole page of games in one query rather than one query per game, so the console
 * stays fast on a season with thousands of games.
 */

export async function loadAdminGames(
  payload: Payload,
  args: { where?: Record<string, unknown>; sort?: string[]; limit?: number; page?: number },
): Promise<{ games: AdminGame[]; totalDocs: number; totalPages: number; page: number }> {
  const res = await payload.find({
    collection: 'games',
    where: (args.where ?? { isBye: { not_equals: true } }) as never,
    sort: args.sort ?? ['-startAt', 'id'],
    depth: 1,
    limit: args.limit ?? 50,
    page: args.page ?? 1,
    overrideAccess: true,
  })

  const docs = res.docs as unknown as Array<Record<string, unknown>>
  const assignments = docs.length
    ? (
        await payload.find({
          collection: 'game-officials',
          where: { game: { in: docs.map((d) => d.id as string | number) } },
          depth: 1,
          limit: 1000,
          overrideAccess: true,
        })
      ).docs
    : []

  return {
    games: docs.map((d) => toAdminGame(d, assignments as never)),
    totalDocs: res.totalDocs,
    totalPages: res.totalPages,
    page: res.page ?? 1,
  }
}

/** Read one game back in console shape, so a row can update without a refresh. */
export async function readAdminGame(payload: Payload, gameId: string | number): Promise<AdminGame | null> {
  const doc = await payload.findByID({ collection: 'games', id: gameId, depth: 1, overrideAccess: true }).catch(() => null)
  if (!doc) return null
  const assignments = await payload.find({
    collection: 'game-officials',
    where: { game: { equals: gameId } },
    depth: 1,
    limit: 20,
    overrideAccess: true,
  })
  return toAdminGame(doc as never, assignments.docs as never)
}

/** The option lists the edit panel needs: venues with their courts, and teams by division. */
/*
 * The option lists the edit panel needs. `divisionIds` scopes the team list to the
 * divisions actually on screen: loading every team in the league on every render
 * is wasted work, and the edit panel only ever offers teams from the game's own
 * division anyway.
 */
export async function loadEditOptions(payload: Payload, divisionIds?: Array<string | number>): Promise<{
  venues: Array<{ id: string | number; name: string; courts: Array<{ id: string | number; name: string }> }>
  teamsByDivision: Record<string, Array<{ id: string | number; name: string }>>
}> {
  const [venuesRes, courtsRes, teamsRes] = await Promise.all([
    payload.find({ collection: 'venues', sort: ['name'], depth: 0, limit: 500, overrideAccess: true }),
    payload.find({ collection: 'courts', sort: ['name'], depth: 0, limit: 2000, overrideAccess: true }),
    payload.find({
      collection: 'teams',
      where: (divisionIds?.length ? { division: { in: divisionIds } } : {}) as never,
      sort: ['name'],
      depth: 0,
      limit: 2000,
      overrideAccess: true,
    }),
  ])

  const relId = (r: unknown): string | number | null =>
    r == null ? null : typeof r === 'object' ? ((r as { id: string | number }).id ?? null) : (r as string | number)

  const courtsByVenue = new Map<string, Array<{ id: string | number; name: string }>>()
  for (const c of courtsRes.docs as unknown as Array<Record<string, unknown>>) {
    const v = String(relId(c.venue) ?? '')
    if (!v) continue
    const list = courtsByVenue.get(v) ?? []
    list.push({ id: c.id as string | number, name: String(c.name ?? 'Court') })
    courtsByVenue.set(v, list)
  }

  const teamsByDivision: Record<string, Array<{ id: string | number; name: string }>> = {}
  for (const t of teamsRes.docs as unknown as Array<Record<string, unknown>>) {
    const d = String(relId(t.division) ?? '')
    if (!d) continue
    ;(teamsByDivision[d] ??= []).push({ id: t.id as string | number, name: String(t.name ?? 'Team') })
  }

  return {
    venues: (venuesRes.docs as unknown as Array<Record<string, unknown>>).map((v) => ({
      id: v.id as string | number,
      name: String(v.name ?? 'Venue'),
      courts: courtsByVenue.get(String(v.id)) ?? [],
    })),
    teamsByDivision,
  }
}
