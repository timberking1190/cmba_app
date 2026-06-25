/*
 * B5 integration smoke against the live ca-central-1 DB. Builds a four-team
 * division with final games, computes standings, seeds a single-elimination
 * bracket from the standings, finalizes a bracket game and verifies the winner
 * advances, and checks the GameIncident filer gate. Cleans up. Run: npm run smoke:b5
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import config from '@payload-config'

import { seedBracket } from '../src/lib/brackets/service'
import { adminOverride } from '../src/lib/games/service'
import { recomputeDivision } from '../src/lib/standings'

let ok = true
const check = (label: string, cond: boolean) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) ok = false }
const relId = (r: unknown): string | number | undefined => (r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number))
async function throwsWith(label: string, fn: () => Promise<unknown>) {
  try { await fn(); check(label + ' (expected rejection)', false) } catch { check(label, true) }
}

async function cleanVolatile(payload: Payload) {
  const all = { id: { exists: true } } as never
  for (const c of ['bracket-series', 'playoff-brackets', 'game-incidents', 'game-officials', 'confirmations', 'disputes', 'score-reports', 'standings-cache', 'team-memberships', 'games', 'teams', 'divisions', 'seasons'] as const) {
    await payload.delete({ collection: c, where: all, overrideAccess: true }).catch(() => {})
  }
}

async function main() {
  const payload = await getPayload({ config })
  await cleanVolatile(payload)
  try {
    const actor = { id: (await payload.find({ collection: 'users', where: { roles: { contains: 'super_admin' } }, limit: 1, overrideAccess: true })).docs[0]?.id ?? 1 }
    const season = await payload.create({ collection: 'seasons', overrideAccess: true, data: { name: 'SMOKE-B5 Season', status: 'active', startDate: '2026-01-01', endDate: '2026-12-31' } as never })
    const division = await payload.create({ collection: 'divisions', overrideAccess: true, data: { fullPath: 'SMOKE / U13 / A', displayLabel: 'SMOKE U13 A', leagueName: 'SMOKE', ageGroup: 'U13', season: season.id } as never })
    const teams: Array<{ id: number | string }> = []
    for (let i = 1; i <= 4; i++) teams.push(await payload.create({ collection: 'teams', overrideAccess: true, data: { name: `SMOKE Team ${i}`, division: division.id } as never }))

    // Standings: team1 beats all, team2 beats 3&4, team3 beats 4 -> ranks 1,2,3,4.
    const results: Array<[number, number, number, number]> = [
      [0, 1, 60, 40], [0, 2, 60, 40], [0, 3, 60, 40], [1, 2, 55, 45], [1, 3, 55, 45], [2, 3, 50, 48],
    ]
    let t = 0
    for (const [h, a, hs, as] of results) {
      t++
      await payload.create({ collection: 'games', overrideAccess: true, data: { season: season.id, division: division.id, homeTeam: teams[h].id, awayTeam: teams[a].id, startAt: `2026-02-0${t}T18:00:00.000Z`, status: 'final', publishState: 'published', homeScore: hs, awayScore: as } as never })
    }
    await recomputeDivision(payload, division.id)
    const cache = await payload.find({ collection: 'standings-cache', where: { division: { equals: division.id } }, limit: 1, overrideAccess: true })
    const rows = (cache.docs[0]?.rows ?? []) as Array<{ teamId?: number | string; rank?: number }>
    check('standings ranked all 4 teams', rows.length === 4)

    // Seed the bracket from the standings.
    const seeded = await seedBracket(payload, { divisionId: division.id, name: 'SMOKE Playoffs', publish: true })
    check('bracket seeded', seeded.ok === true)
    const series = await payload.find({ collection: 'bracket-series', where: { bracket: { equals: seeded.bracketId } }, sort: ['round', 'slot'], depth: 0, overrideAccess: true })
    check('bracket has 3 series (2 round-1 + final)', series.docs.length === 3)
    const r1 = series.docs.filter((s) => (s as { round?: number }).round === 1)
    const top = rows.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))[0].teamId
    check('round-1 series exist with seeded teams', r1.length === 2 && r1.some((s) => String((s as { homeTeam?: unknown }).homeTeam) === String(top)))

    // Finalize a round-1 bracket game and verify advancement.
    const firstSeries = r1[0] as { id: number | string; homeTeam?: unknown; awayTeam?: unknown }
    const bg = await payload.create({ collection: 'games', overrideAccess: true, data: { season: season.id, division: division.id, homeTeam: firstSeries.homeTeam, awayTeam: firstSeries.awayTeam, startAt: '2026-03-01T18:00:00.000Z', status: 'scheduled', publishState: 'published' } as never })
    await payload.update({ collection: 'bracket-series', id: firstSeries.id, data: { game: bg.id } as never, overrideAccess: true })
    await adminOverride(payload, bg.id, actor, { status: 'final', homeScore: 70, awayScore: 50 }, 'Bracket game result')
    const updatedSeries = await payload.findByID({ collection: 'bracket-series', id: firstSeries.id, overrideAccess: true })
    check('the winner advanced (series winner set to the home team)', String(relId((updatedSeries as { winner?: unknown }).winner)) === String(relId(firstSeries.homeTeam)))
    const finalSeries = await payload.findByID({ collection: 'bracket-series', id: (series.docs.find((s) => (s as { round?: number }).round === 2) as { id: number | string }).id, overrideAccess: true })
    const finalHasWinner = String(relId((finalSeries as { homeTeam?: unknown }).homeTeam)) === String(relId(firstSeries.homeTeam)) || String(relId((finalSeries as { awayTeam?: unknown }).awayTeam)) === String(relId(firstSeries.homeTeam))
    check('the winner was wired into the final matchup', finalHasWinner)

    // GameIncident filer gate: a stranger cannot file; an admin can.
    const stranger = await payload.create({ collection: 'users', overrideAccess: true, context: { skipConsentEnforcement: true }, data: { email: `smoke-b5-stranger-${Date.now()}@example.com`, password: 'SmokeTest!2026', fullName: 'Stranger', dateOfBirth: '1990-01-01', roles: ['participant'] } as never })
    await throwsWith('a stranger cannot file a game incident', () =>
      payload.create({ collection: 'game-incidents', overrideAccess: false, user: stranger as never, data: { game: bg.id, type: 'conduct', description: 'x' } as never }))
    const adminUser = await payload.findByID({ collection: 'users', id: actor.id, overrideAccess: true })
    const incident = await payload.create({ collection: 'game-incidents', overrideAccess: false, user: adminUser as never, data: { game: bg.id, type: 'injury', description: 'Smoke incident' } as never }).catch(() => null)
    check('an admin can file a game incident', incident != null)

    await payload.delete({ collection: 'users', id: stranger.id, overrideAccess: true }).catch(() => {})
  } finally {
    await cleanVolatile(payload)
    console.log('\nCleaned up B5 test data (audit rows left by design).')
  }
  console.log(ok ? '\nB5 SMOKE: ALL GREEN' : '\nB5 SMOKE: FAILURES ABOVE')
  process.exit(ok ? 0 : 1)
}

main().catch((err) => { console.error(err); process.exit(1) })
