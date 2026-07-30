import type { Payload, PayloadRequest } from 'payload'

import { decideSeriesWinner } from './advance'
import { generateSingleElim } from './generate'

/*
 * Bracket seeding and advancement.
 *
 * seedBracket reads a division's computed standings, seeds a single-elimination
 * bracket from the ranked teams, and freezes the order in seedSnapshot.
 *
 * syncBracketFromGame is called whenever a game changes. It asks the pure rules in
 * advance.ts what should happen and then makes it so:
 *   advance  - record the winner and wire them into the next round
 *   retract  - remove a winner that is no longer correct (a contested result, a
 *              double forfeit, a cancellation) and pull them back out of the next
 *              round, so a correction cannot leave a ghost team standing
 *   hold     - change nothing
 *
 * A winner an administrator set by hand is never overwritten by this. Automatic
 * advancement is a convenience; a person's decision outranks it.
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

export async function syncBracketFromGame(payload: Payload, gameId: string | number, req?: PayloadRequest): Promise<void> {
  const found = await payload.find({ collection: 'bracket-series', where: { game: { equals: gameId } }, depth: 0, limit: 1, overrideAccess: true, req })
  const series = found.docs[0] as
    | { id?: string | number; homeTeam?: unknown; awayTeam?: unknown; winner?: unknown; winnerSetBy?: string; feedsInto?: unknown; feedsIntoSlot?: string }
    | undefined
  if (!series) return

  // A person's decision outranks the automatic one.
  if (series.winnerSetBy === 'manual') return

  const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true, req }).catch(() => null)) as
    | { status?: string; homeScore?: number | null; awayScore?: number | null; homeTeam?: unknown; awayTeam?: unknown; forfeit?: { forfeitingTeam?: unknown; outcome?: string } }
    | null
  if (!game) return

  const decision = decideSeriesWinner({
    status: String(game.status ?? 'scheduled'),
    homeScore: game.homeScore ?? null,
    awayScore: game.awayScore ?? null,
    homeTeamId: (relId(game.homeTeam) ?? null) as string | number | null,
    awayTeamId: (relId(game.awayTeam) ?? null) as string | number | null,
    forfeit: game.forfeit ? { outcome: game.forfeit.outcome ?? null, forfeitingTeam: (relId(game.forfeit.forfeitingTeam) ?? null) as string | number | null } : null,
  })

  if (decision.kind === 'hold') return

  const currentWinner = relId(series.winner)
  const nextWinner = decision.kind === 'advance' ? decision.winnerTeamId : null

  // Nothing to do when the bracket already says this.
  if (String(currentWinner ?? '') === String(nextWinner ?? '')) return

  await payload.update({
    collection: 'bracket-series',
    id: series.id!,
    data: { winner: nextWinner, winnerSetBy: nextWinner == null ? null : 'auto' } as never,
    overrideAccess: true,
    req,
  })

  const feedsInto = relId(series.feedsInto)
  if (feedsInto != null) {
    const slotField = series.feedsIntoSlot === 'away' ? 'awayTeam' : 'homeTeam'
    await payload.update({ collection: 'bracket-series', id: feedsInto, data: { [slotField]: nextWinner } as never, overrideAccess: true, req })
  }
}

/** Kept for callers that predate the retraction behaviour. */
export const advanceBracketOnFinal = syncBracketFromGame
