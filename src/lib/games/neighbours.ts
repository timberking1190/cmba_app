import type { Payload } from 'payload'

import type { NeighbourGame } from './editPlan'

/*
 * Load the games that could clash with a proposed time, with the names needed to
 * describe them to a human. Server side; the pure comparison lives in editPlan.
 *
 * Only games whose window could overlap are fetched, so this stays cheap on a
 * season with thousands of games rather than scanning the whole schedule.
 */

const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)
const relName = (r: unknown, ...keys: string[]): string =>
  r && typeof r === 'object' ? (keys.map((k) => (r as Record<string, string>)[k]).find(Boolean) ?? '') : ''

export async function loadNeighbourGames(
  payload: Payload,
  opts: { startAt: string; windowMinutes: number; excludeGameId?: string | number; limit?: number },
): Promise<NeighbourGame[]> {
  const start = new Date(opts.startAt).getTime()
  if (Number.isNaN(start)) return []
  const spanMs = opts.windowMinutes * 60_000
  const from = new Date(start - spanMs).toISOString()
  const to = new Date(start + spanMs).toISOString()

  const res = await payload.find({
    collection: 'games',
    where: { and: [{ startAt: { greater_than_equal: from } }, { startAt: { less_than_equal: to } }, { isBye: { not_equals: true } }] },
    depth: 1,
    limit: opts.limit ?? 300,
    overrideAccess: true,
  })

  const docs = (res.docs as unknown as Array<Record<string, unknown>>).filter(
    (g) => opts.excludeGameId == null || String(g.id) !== String(opts.excludeGameId),
  )
  if (!docs.length) return []

  // One query for the officials on all of those games, so names are available
  // without a request per game.
  const ids = docs.map((g) => g.id as string | number)
  const assignments = await payload.find({
    collection: 'game-officials',
    where: { game: { in: ids } },
    depth: 1,
    limit: 1000,
    overrideAccess: true,
  })
  const officialsByGame = new Map<string, { ids: (string | number)[]; names: Record<string, string> }>()
  for (const a of assignments.docs as unknown as Array<Record<string, unknown>>) {
    const gid = String(relId(a.game))
    const oid = relId(a.official)
    if (oid == null) continue
    const entry = officialsByGame.get(gid) ?? { ids: [], names: {} }
    entry.ids.push(oid)
    entry.names[String(oid)] = relName(a.official, 'name') || 'An official'
    officialsByGame.set(gid, entry)
  }

  return docs.map((g) => {
    const off = officialsByGame.get(String(g.id))
    return {
      id: g.id as string | number,
      startAt: String(g.startAt ?? ''),
      venueId: relId(g.venue) ?? null,
      courtId: relId(g.court) ?? null,
      homeTeamId: relId(g.homeTeam) ?? '',
      awayTeamId: relId(g.awayTeam) ?? '',
      isBye: Boolean(g.isBye),
      homeTeamName: relName(g.homeTeam, 'name') || 'Home team',
      awayTeamName: relName(g.awayTeam, 'name') || 'Away team',
      venueName: relName(g.venue, 'name') || null,
      courtName: relName(g.court, 'name') || null,
      officialIds: off?.ids ?? [],
      officialNames: off?.names ?? {},
    }
  })
}
