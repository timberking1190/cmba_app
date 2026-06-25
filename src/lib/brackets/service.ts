import type { Payload, PayloadRequest } from 'payload'

import { generateSingleElim } from './generate'

/*
 * Bracket seeding and advancement. seedBracket reads a division's computed standings,
 * seeds a single-elimination bracket from the ranked teams, and freezes the order in
 * seedSnapshot. advanceBracketOnFinal is called when a game finals: it finds the
 * bracket series for that game, records the winner, and wires the winner into the
 * next round.
 */
const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

export async function seedBracket(
  payload: Payload,
  opts: { divisionId: string | number; name: string; publish?: boolean },
): Promise<{ ok: boolean; bracketId?: string | number; error?: string }> {
  const cache = await payload.find({ collection: 'standings-cache', where: { division: { equals: opts.divisionId } }, limit: 1, overrideAccess: true })
  const rows = (cache.docs[0]?.rows ?? []) as Array<{ teamId?: string | number; rank?: number }>
  const seedTeamIds = [...rows]
    .filter((r) => r.teamId != null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map((r) => r.teamId!)
  if (seedTeamIds.length < 2) return { ok: false, error: 'This division needs at least two ranked teams to seed a bracket.' }

  const division = await payload.findByID({ collection: 'divisions', id: opts.divisionId, depth: 0, overrideAccess: true }).catch(() => null)
  const seasonId = relId((division as { season?: unknown } | null)?.season)

  const bracket = await payload.create({
    collection: 'playoff-brackets',
    overrideAccess: true,
    data: { name: opts.name, division: opts.divisionId, season: seasonId, format: 'single_elim', status: opts.publish ? 'published' : 'draft', seedSnapshot: seedTeamIds, seededAt: new Date().toISOString(), publishState: opts.publish ? 'published' : 'draft' } as never,
  })

  const series = generateSingleElim(seedTeamIds)
  // First pass: create the series rows, remember their created ids by index.
  const createdIds: (string | number)[] = []
  for (const s of series) {
    const doc = await payload.create({
      collection: 'bracket-series',
      overrideAccess: true,
      data: { bracket: bracket.id, round: s.round, slot: s.slot, homeSeed: s.homeSeed, awaySeed: s.awaySeed, homeTeam: s.homeTeamId ?? undefined, awayTeam: s.awayTeamId ?? undefined, feedsIntoSlot: s.feedsIntoSlot } as never,
    })
    createdIds.push(doc.id)
  }
  // Second pass: wire feedsInto to the created ids.
  for (let i = 0; i < series.length; i++) {
    if (series[i].feedsInto != null) {
      await payload.update({ collection: 'bracket-series', id: createdIds[i], data: { feedsInto: createdIds[series[i].feedsInto!] } as never, overrideAccess: true })
    }
  }
  return { ok: true, bracketId: bracket.id }
}

export async function advanceBracketOnFinal(payload: Payload, gameId: string | number, req?: PayloadRequest): Promise<void> {
  const found = await payload.find({ collection: 'bracket-series', where: { game: { equals: gameId } }, depth: 0, limit: 1, overrideAccess: true, req })
  const series = found.docs[0] as { id?: string | number; homeTeam?: unknown; awayTeam?: unknown; feedsInto?: unknown; feedsIntoSlot?: string } | undefined
  if (!series) return

  const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true, req }).catch(() => null)) as
    | { status?: string; homeScore?: number; awayScore?: number; homeTeam?: unknown; awayTeam?: unknown; forfeit?: { forfeitingTeam?: unknown; outcome?: string } }
    | null
  if (!game) return

  let winner: string | number | undefined
  if (game.status === 'final' && game.homeScore != null && game.awayScore != null) {
    winner = game.homeScore > game.awayScore ? relId(game.homeTeam) : game.awayScore > game.homeScore ? relId(game.awayTeam) : undefined
  } else if (game.status === 'forfeit' && game.forfeit?.forfeitingTeam != null) {
    const ff = relId(game.forfeit.forfeitingTeam)
    winner = String(ff) === String(relId(game.homeTeam)) ? relId(game.awayTeam) : relId(game.homeTeam)
  }
  if (winner == null) return

  await payload.update({ collection: 'bracket-series', id: series.id!, data: { winner } as never, overrideAccess: true, req })
  const feedsInto = relId(series.feedsInto)
  if (feedsInto != null) {
    const slotField = series.feedsIntoSlot === 'away' ? 'awayTeam' : 'homeTeam'
    await payload.update({ collection: 'bracket-series', id: feedsInto, data: { [slotField]: winner } as never, overrideAccess: true, req })
  }
}
