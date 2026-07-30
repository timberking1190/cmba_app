import 'server-only'
import type { Payload } from 'payload'

import { writeAudit, type ActorUser } from '../games/service'
import { leagueDateTime } from '../leagueTime'
import { byeWinner, decideSeriesWinner, isBye, isPlayable, roundName } from './advance'
import { generateSingleElim, type SeedSeries } from './generate'

/*
 * Managing a playoff bracket end to end: preview, create, regenerate, schedule a
 * matchup, publish, override a winner, and delete.
 *
 * Two rules run through all of it:
 *  - Nothing is public until it is published. A draft bracket can be regenerated
 *    freely; once published, regenerating is refused rather than quietly wiping
 *    games that families and officials have already seen.
 *  - Every action that changes a bracket writes an audit row with the actor and
 *    a reason, the same as every game change.
 */

const relId = (r: unknown): string | number | null =>
  r == null ? null : typeof r === 'object' ? ((r as { id: string | number }).id ?? null) : (r as string | number)
const relName = (r: unknown, ...keys: string[]): string =>
  r && typeof r === 'object' ? (keys.map((k) => (r as Record<string, string>)[k]).find(Boolean) ?? '') : ''

export type SeedSource = 'standings' | 'manual'

export type BracketPreview = {
  ok: boolean
  error?: string
  totalRounds: number
  teamCount: number
  byeCount: number
  seeds: Array<{ seed: number; teamId: string | number; teamName: string }>
  rounds: Array<{
    round: number
    name: string
    matchups: Array<{ slot: number; homeSeed?: number; awaySeed?: number; homeTeamName: string; awayTeamName: string; isBye: boolean }>
  }>
}

async function teamNames(payload: Payload, ids: Array<string | number>): Promise<Map<string, string>> {
  if (!ids.length) return new Map()
  const res = await payload.find({ collection: 'teams', where: { id: { in: ids } }, depth: 0, limit: 500, overrideAccess: true })
  return new Map((res.docs as Array<{ id: string | number; name?: string }>).map((t) => [String(t.id), t.name ?? `Team ${t.id}`]))
}

/** The ranked team ids for a division, from the computed standings. */
export async function seedsFromStandings(payload: Payload, divisionId: string | number): Promise<Array<string | number>> {
  const cache = await payload.find({ collection: 'standings-cache', where: { division: { equals: divisionId } }, limit: 1, overrideAccess: true })
  const rows = (cache.docs[0]?.rows ?? []) as Array<{ teamId?: string | number; rank?: number }>
  return [...rows]
    .filter((r) => r.teamId != null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map((r) => r.teamId!)
}

/**
 * What the bracket WOULD look like. Writes nothing, so a first time scheduler can
 * look at the matchups and the byes before anything exists.
 */
export async function previewBracket(payload: Payload, seedTeamIds: Array<string | number>): Promise<BracketPreview> {
  const empty: BracketPreview = { ok: false, totalRounds: 0, teamCount: seedTeamIds.length, byeCount: 0, seeds: [], rounds: [] }
  if (seedTeamIds.length < 2) {
    return { ...empty, error: 'A bracket needs at least two teams. Add more teams to the division, or play some games so the standings can rank them.' }
  }
  if (seedTeamIds.length > 64) {
    return { ...empty, error: 'A bracket here holds at most 64 teams. Split the division first.' }
  }

  const names = await teamNames(payload, seedTeamIds)
  const nameOf = (id: string | number | null | undefined) => (id == null ? '' : (names.get(String(id)) ?? `Team ${id}`))

  const series = generateSingleElim(seedTeamIds)
  const totalRounds = series.reduce((m, s) => Math.max(m, s.round), 0)

  const byRound = new Map<number, SeedSeries[]>()
  for (const s of series) byRound.set(s.round, [...(byRound.get(s.round) ?? []), s])

  let byeCount = 0
  const rounds = Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, list]) => ({
      round,
      name: roundName(round, totalRounds),
      matchups: list
        .sort((a, b) => a.slot - b.slot)
        .map((s) => {
          const bye = round === 1 && isBye({ homeTeamId: s.homeTeamId, awayTeamId: s.awayTeamId })
          if (bye) byeCount++
          return {
            slot: s.slot,
            homeSeed: s.homeSeed,
            awaySeed: s.awaySeed,
            homeTeamName: nameOf(s.homeTeamId) || (round === 1 ? 'Bye' : 'To be decided'),
            awayTeamName: nameOf(s.awayTeamId) || (round === 1 ? 'Bye' : 'To be decided'),
            isBye: bye,
          }
        }),
    }))

  return {
    ok: true,
    totalRounds,
    teamCount: seedTeamIds.length,
    byeCount,
    seeds: seedTeamIds.map((id, i) => ({ seed: i + 1, teamId: id, teamName: nameOf(id) })),
    rounds,
  }
}

/** Create the bracket and its matchups. Always starts as a draft, never public. */
export async function createBracket(
  payload: Payload,
  actor: ActorUser,
  opts: { divisionId: string | number; name: string; seedTeamIds: Array<string | number>; source: SeedSource; reason: string },
): Promise<{ ok: boolean; bracketId?: string | number; error?: string }> {
  if (opts.seedTeamIds.length < 2) {
    return { ok: false, error: 'A bracket needs at least two teams. Add more teams to the division, or play some games so the standings can rank them.' }
  }

  const division = await payload.findByID({ collection: 'divisions', id: opts.divisionId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!division) return { ok: false, error: 'That division could not be found. Go back and choose it again.' }
  const seasonId = relId((division as { season?: unknown }).season)

  const bracket = await payload.create({
    collection: 'playoff-brackets',
    overrideAccess: true,
    data: {
      name: opts.name,
      division: opts.divisionId,
      season: seasonId,
      format: 'single_elim',
      status: 'draft',
      publishState: 'draft',
      seedSnapshot: opts.seedTeamIds,
      seededAt: new Date().toISOString(),
    } as never,
  })

  await writeSeries(payload, bracket.id, opts.seedTeamIds)
  await writeAudit(payload, {
    actor,
    action: 'bracket.create',
    entity: 'playoff-brackets',
    entityId: bracket.id,
    after: { name: opts.name, teams: opts.seedTeamIds.length, source: opts.source },
    reason: opts.reason,
  })
  return { ok: true, bracketId: bracket.id }
}

/** Write the matchup rows for a set of seeds, wiring each into the next round. */
async function writeSeries(payload: Payload, bracketId: string | number, seedTeamIds: Array<string | number>): Promise<void> {
  const series = generateSingleElim(seedTeamIds)
  const createdIds: Array<string | number> = []
  for (const s of series) {
    const doc = await payload.create({
      collection: 'bracket-series',
      overrideAccess: true,
      data: {
        bracket: bracketId,
        round: s.round,
        slot: s.slot,
        homeSeed: s.homeSeed,
        awaySeed: s.awaySeed,
        homeTeam: s.homeTeamId ?? undefined,
        awayTeam: s.awayTeamId ?? undefined,
        feedsIntoSlot: s.feedsIntoSlot,
      } as never,
    })
    createdIds.push(doc.id)
  }
  for (let i = 0; i < series.length; i++) {
    if (series[i].feedsInto != null) {
      await payload.update({ collection: 'bracket-series', id: createdIds[i], data: { feedsInto: createdIds[series[i].feedsInto!] } as never, overrideAccess: true })
    }
  }
}

/**
 * Throw the matchups away and build them again from a new set of seeds. Refused
 * once the bracket is published, because families and officials are already
 * looking at those games.
 */
export async function regenerateBracket(
  payload: Payload,
  actor: ActorUser,
  opts: { bracketId: string | number; seedTeamIds: Array<string | number>; reason: string },
): Promise<{ ok: boolean; error?: string }> {
  const bracket = (await payload.findByID({ collection: 'playoff-brackets', id: opts.bracketId, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { publishState?: string }
    | null
  if (!bracket) return { ok: false, error: 'That bracket could not be found. It may have been deleted.' }
  if (bracket.publishState === 'published') {
    return {
      ok: false,
      error: 'This bracket is published, so it cannot be rebuilt. Unpublish it first, which takes it off the public site, and then rebuild it.',
    }
  }
  if (opts.seedTeamIds.length < 2) return { ok: false, error: 'A bracket needs at least two teams.' }

  const existing = await payload.find({ collection: 'bracket-series', where: { bracket: { equals: opts.bracketId } }, depth: 0, limit: 500, overrideAccess: true })
  // Remove any games that were created for this draft bracket, so rebuilding does
  // not leave orphans on the schedule.
  for (const s of existing.docs as unknown as Array<{ id: string | number; game?: unknown }>) {
    const gameId = relId(s.game)
    if (gameId != null) await payload.delete({ collection: 'games', id: gameId, overrideAccess: true }).catch(() => {})
    await payload.delete({ collection: 'bracket-series', id: s.id, overrideAccess: true }).catch(() => {})
  }

  await writeSeries(payload, opts.bracketId, opts.seedTeamIds)
  await payload.update({
    collection: 'playoff-brackets',
    id: opts.bracketId,
    data: { seedSnapshot: opts.seedTeamIds, seededAt: new Date().toISOString() } as never,
    overrideAccess: true,
  })
  await writeAudit(payload, {
    actor,
    action: 'bracket.regenerate',
    entity: 'playoff-brackets',
    entityId: opts.bracketId,
    after: { teams: opts.seedTeamIds.length, removedMatchups: existing.docs.length },
    reason: opts.reason,
  })
  return { ok: true }
}

/**
 * Make the bracket public. Every playable matchup that has no game yet gets one,
 * so the schedule, the team pages, and the calendar feed all carry it.
 */
export async function publishBracket(
  payload: Payload,
  actor: ActorUser,
  opts: { bracketId: string | number; reason: string },
): Promise<{ ok: boolean; error?: string; gamesCreated?: number }> {
  const bracket = (await payload.findByID({ collection: 'playoff-brackets', id: opts.bracketId, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { division?: unknown; season?: unknown }
    | null
  if (!bracket) return { ok: false, error: 'That bracket could not be found. It may have been deleted.' }

  const divisionId = relId(bracket.division)
  const seasonId = relId(bracket.season)
  if (divisionId == null || seasonId == null) {
    return { ok: false, error: 'This bracket is missing its division or season, so it cannot be published. Rebuild it from the division.' }
  }

  const series = await payload.find({ collection: 'bracket-series', where: { bracket: { equals: opts.bracketId } }, depth: 0, limit: 500, overrideAccess: true })
  let gamesCreated = 0
  for (const s of series.docs as unknown as Array<Record<string, unknown>>) {
    const home = relId(s.homeTeam)
    const away = relId(s.awayTeam)
    if (!isPlayable({ homeTeamId: home, awayTeamId: away })) continue
    if (relId(s.game) != null) {
      await payload.update({ collection: 'games', id: relId(s.game)!, data: { publishState: 'published' } as never, overrideAccess: true }).catch(() => {})
      continue
    }
    const game = await payload.create({
      collection: 'games',
      overrideAccess: true,
      data: {
        season: seasonId,
        division: divisionId,
        homeTeam: home,
        awayTeam: away,
        // No date yet: the scheduler sets it on the bracket screen. A published
        // bracket with an unset time still shows as "date to be confirmed".
        startAt: (s.plannedStartAt as string) ?? new Date().toISOString(),
        status: 'scheduled',
        publishState: 'published',
      } as never,
    })
    await payload.update({ collection: 'bracket-series', id: s.id as string | number, data: { game: game.id } as never, overrideAccess: true })
    gamesCreated++
  }

  await payload.update({
    collection: 'playoff-brackets',
    id: opts.bracketId,
    data: { status: 'published', publishState: 'published' } as never,
    overrideAccess: true,
  })
  await writeAudit(payload, { actor, action: 'bracket.publish', entity: 'playoff-brackets', entityId: opts.bracketId, after: { gamesCreated }, reason: opts.reason })
  return { ok: true, gamesCreated }
}

/** Take the bracket back off the public site. Its games go back to draft. */
export async function unpublishBracket(
  payload: Payload,
  actor: ActorUser,
  opts: { bracketId: string | number; reason: string },
): Promise<{ ok: boolean; error?: string }> {
  const series = await payload.find({ collection: 'bracket-series', where: { bracket: { equals: opts.bracketId } }, depth: 0, limit: 500, overrideAccess: true })
  for (const s of series.docs as unknown as Array<{ game?: unknown }>) {
    const gameId = relId(s.game)
    if (gameId != null) await payload.update({ collection: 'games', id: gameId, data: { publishState: 'draft' } as never, overrideAccess: true }).catch(() => {})
  }
  await payload.update({ collection: 'playoff-brackets', id: opts.bracketId, data: { status: 'draft', publishState: 'draft' } as never, overrideAccess: true })
  await writeAudit(payload, { actor, action: 'bracket.unpublish', entity: 'playoff-brackets', entityId: opts.bracketId, reason: opts.reason })
  return { ok: true }
}

/** Delete a draft bracket and everything it created. Refused once published. */
export async function deleteBracket(
  payload: Payload,
  actor: ActorUser,
  opts: { bracketId: string | number; reason: string },
): Promise<{ ok: boolean; error?: string }> {
  const bracket = (await payload.findByID({ collection: 'playoff-brackets', id: opts.bracketId, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { publishState?: string; name?: string }
    | null
  if (!bracket) return { ok: false, error: 'That bracket could not be found. It may already have been deleted.' }
  if (bracket.publishState === 'published') {
    return { ok: false, error: 'This bracket is published, so it cannot be deleted. Unpublish it first, which takes it off the public site.' }
  }

  const series = await payload.find({ collection: 'bracket-series', where: { bracket: { equals: opts.bracketId } }, depth: 0, limit: 500, overrideAccess: true })
  for (const s of series.docs as unknown as Array<{ id: string | number; game?: unknown }>) {
    const gameId = relId(s.game)
    if (gameId != null) await payload.delete({ collection: 'games', id: gameId, overrideAccess: true }).catch(() => {})
    await payload.delete({ collection: 'bracket-series', id: s.id, overrideAccess: true }).catch(() => {})
  }
  await payload.delete({ collection: 'playoff-brackets', id: opts.bracketId, overrideAccess: true })
  await writeAudit(payload, {
    actor,
    action: 'bracket.delete',
    entity: 'playoff-brackets',
    entityId: opts.bracketId,
    before: { name: bracket.name, matchups: series.docs.length },
    reason: opts.reason,
  })
  return { ok: true }
}

/**
 * Set or clear a matchup's winner by hand, for a correction the automatic
 * advancement cannot make (a double forfeit, a tie that has to be broken, a
 * scoring error already carried forward).
 */
export async function overrideSeriesWinner(
  payload: Payload,
  actor: ActorUser,
  opts: { seriesId: string | number; winnerTeamId: string | number | null; reason: string },
): Promise<{ ok: boolean; error?: string }> {
  const series = (await payload.findByID({ collection: 'bracket-series', id: opts.seriesId, depth: 0, overrideAccess: true }).catch(() => null)) as
    | Record<string, unknown>
    | null
  if (!series) return { ok: false, error: 'That matchup could not be found. Reload the bracket and try again.' }

  const home = relId(series.homeTeam)
  const away = relId(series.awayTeam)
  if (opts.winnerTeamId != null && String(opts.winnerTeamId) !== String(home) && String(opts.winnerTeamId) !== String(away)) {
    return { ok: false, error: 'That team is not in this matchup, so they cannot be the winner of it.' }
  }

  const previousWinner = relId(series.winner)
  await payload.update({
    collection: 'bracket-series',
    id: opts.seriesId,
    data: { winner: opts.winnerTeamId ?? null, winnerSetBy: opts.winnerTeamId == null ? null : 'manual' } as never,
    overrideAccess: true,
  })

  // Move the next round with it: put the new winner in, and take the old one out.
  const feedsInto = relId(series.feedsInto)
  if (feedsInto != null) {
    const slotField = series.feedsIntoSlot === 'away' ? 'awayTeam' : 'homeTeam'
    await payload.update({ collection: 'bracket-series', id: feedsInto, data: { [slotField]: opts.winnerTeamId ?? null } as never, overrideAccess: true })
  }

  await writeAudit(payload, {
    actor,
    action: 'bracket.winner.override',
    entity: 'bracket-series',
    entityId: opts.seriesId,
    before: { winner: previousWinner },
    after: { winner: opts.winnerTeamId },
    reason: opts.reason,
  })
  return { ok: true }
}

/** Resolve every first round bye, so those teams sit in round two immediately. */
export async function resolveByes(payload: Payload, bracketId: string | number): Promise<number> {
  const series = await payload.find({
    collection: 'bracket-series',
    where: { and: [{ bracket: { equals: bracketId } }, { round: { equals: 1 } }] },
    depth: 0,
    limit: 200,
    overrideAccess: true,
  })
  let resolved = 0
  for (const s of series.docs as unknown as Array<Record<string, unknown>>) {
    const home = relId(s.homeTeam)
    const away = relId(s.awayTeam)
    if (!isBye({ homeTeamId: home, awayTeamId: away })) continue
    const winner = byeWinner({ homeTeamId: home, awayTeamId: away })
    if (winner == null) continue
    if (relId(s.winner) != null) continue
    await payload.update({ collection: 'bracket-series', id: s.id as string | number, data: { winner, winnerSetBy: 'auto' } as never, overrideAccess: true })
    const feedsInto = relId(s.feedsInto)
    if (feedsInto != null) {
      const slotField = s.feedsIntoSlot === 'away' ? 'awayTeam' : 'homeTeam'
      await payload.update({ collection: 'bracket-series', id: feedsInto, data: { [slotField]: winner } as never, overrideAccess: true })
    }
    resolved++
  }
  return resolved
}

/* ---------------------------------------------------------------- reading */

export type BracketView = {
  id: string | number
  name: string
  divisionName: string
  divisionId: string | number | null
  status: string
  publishState: string
  totalRounds: number
  champion: string | null
  rounds: Array<{
    round: number
    name: string
    matchups: Array<{
      id: string | number
      slot: number
      homeSeed?: number | null
      awaySeed?: number | null
      homeTeamId: string | number | null
      awayTeamId: string | number | null
      homeTeamName: string
      awayTeamName: string
      winnerTeamId: string | number | null
      winnerName: string | null
      winnerSetBy: string | null
      gameId: string | number | null
      gameStatus: string | null
      gameWhen: string | null
      gameVenue: string | null
      /** Why this matchup has not advanced, when it has not. */
      holdReason: string | null
      isBye: boolean
      isPlayable: boolean
    }>
  }>
}

export async function loadBracketView(payload: Payload, bracketId: string | number): Promise<BracketView | null> {
  const bracket = (await payload.findByID({ collection: 'playoff-brackets', id: bracketId, depth: 1, overrideAccess: true }).catch(() => null)) as
    | Record<string, unknown>
    | null
  if (!bracket) return null

  const series = await payload.find({
    collection: 'bracket-series',
    where: { bracket: { equals: bracketId } },
    sort: ['round', 'slot'],
    depth: 2,
    limit: 500,
    overrideAccess: true,
  })
  const docs = series.docs as unknown as Array<Record<string, unknown>>
  const totalRounds = docs.reduce((m, s) => Math.max(m, Number(s.round ?? 0)), 0)

  const byRound = new Map<number, Array<Record<string, unknown>>>()
  for (const s of docs) {
    const r = Number(s.round ?? 0)
    byRound.set(r, [...(byRound.get(r) ?? []), s])
  }

  let champion: string | null = null

  const rounds = Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, list]) => ({
      round,
      name: roundName(round, totalRounds),
      matchups: list.map((s) => {
        const homeTeamId = relId(s.homeTeam)
        const awayTeamId = relId(s.awayTeam)
        const winnerTeamId = relId(s.winner)
        const winnerName = winnerTeamId == null ? null : relName(s.winner, 'name') || `Team ${winnerTeamId}`
        if (round === totalRounds && winnerName) champion = winnerName

        const game = s.game && typeof s.game === 'object' ? (s.game as Record<string, unknown>) : null
        const bye = round === 1 && isBye({ homeTeamId, awayTeamId })

        let holdReason: string | null = null
        if (winnerTeamId == null) {
          if (bye) holdReason = null
          else if (!isPlayable({ homeTeamId, awayTeamId })) holdReason = 'Waiting for the earlier round to finish.'
          else if (!game) holdReason = 'This matchup has no game yet. Publish the bracket to create it, then set its date.'
          else {
            const decision = decideSeriesWinner({
              status: String(game.status ?? 'scheduled'),
              homeScore: game.homeScore as number | null,
              awayScore: game.awayScore as number | null,
              homeTeamId,
              awayTeamId,
              forfeit: (game.forfeit ?? null) as never,
            })
            holdReason = decision.kind === 'advance' ? null : decision.because
          }
        }

        return {
          id: s.id as string | number,
          slot: Number(s.slot ?? 0),
          homeSeed: (s.homeSeed as number) ?? null,
          awaySeed: (s.awaySeed as number) ?? null,
          homeTeamId,
          awayTeamId,
          homeTeamName: relName(s.homeTeam, 'name') || (round === 1 ? (bye ? 'Bye' : 'Not set') : 'To be decided'),
          awayTeamName: relName(s.awayTeam, 'name') || (round === 1 ? (bye ? 'Bye' : 'Not set') : 'To be decided'),
          winnerTeamId,
          winnerName,
          winnerSetBy: (s.winnerSetBy as string) ?? null,
          gameId: relId(s.game),
          gameStatus: game ? String(game.status ?? '') : null,
          gameWhen: game?.startAt ? leagueDateTime(game.startAt as string) : null,
          gameVenue: game ? relName(game.venue, 'name') || null : null,
          holdReason,
          isBye: bye,
          isPlayable: isPlayable({ homeTeamId, awayTeamId }),
        }
      }),
    }))

  return {
    id: bracket.id as string | number,
    name: String(bracket.name ?? 'Bracket'),
    divisionName: relName(bracket.division, 'displayLabel', 'fullPath') || 'Division',
    divisionId: relId(bracket.division),
    status: String(bracket.status ?? 'draft'),
    publishState: String(bracket.publishState ?? 'draft'),
    totalRounds,
    champion,
    rounds,
  }
}
