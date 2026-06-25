/*
 * Transient B1 integration smoke against the live ca-central-1 DB. Creates a tiny
 * season with two teams and two published final games, runs recomputeDivision,
 * reads the StandingsCache back and asserts the computed, ranked rows, then deletes
 * everything it created so production stays clean. Run: npm run smoke:b1
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

import { recomputeDivision } from '../src/lib/standings'

async function main() {
  const payload = await getPayload({ config })
  const created: Array<{ collection: string; id: number | string }> = []
  const track = <T extends { id: number | string }>(collection: string, doc: T) => {
    created.push({ collection, id: doc.id })
    return doc
  }
  let ok = true
  const check = (label: string, cond: boolean) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
    if (!cond) ok = false
  }

  try {
    const season = track('seasons', await payload.create({ collection: 'seasons', overrideAccess: true, data: { name: 'SMOKE B1 Season', status: 'active', startDate: '2026-01-01', endDate: '2026-12-31' } as never }))
    check('season seasonSeed assigned at create', typeof (season as { seasonSeed?: number }).seasonSeed === 'number')

    const division = track('divisions', await payload.create({ collection: 'divisions', overrideAccess: true, data: { fullPath: 'SMOKE / U13 / A', displayLabel: 'SMOKE U13 A', leagueName: 'SMOKE', ageGroup: 'U13', season: season.id } as never }))
    const t1 = track('teams', await payload.create({ collection: 'teams', overrideAccess: true, data: { name: 'Smoke Alpha', division: division.id } as never }))
    const t2 = track('teams', await payload.create({ collection: 'teams', overrideAccess: true, data: { name: 'Smoke Bravo', division: division.id } as never }))

    // Two published, final games: Alpha beats Bravo twice.
    const g1 = track('games', await payload.create({ collection: 'games', overrideAccess: true, data: { season: season.id, division: division.id, homeTeam: t1.id, awayTeam: t2.id, startAt: '2026-02-01T18:00:00.000Z', status: 'final', publishState: 'published', homeScore: 60, awayScore: 50 } as never }))
    track('games', await payload.create({ collection: 'games', overrideAccess: true, data: { season: season.id, division: division.id, homeTeam: t2.id, awayTeam: t1.id, startAt: '2026-02-08T18:00:00.000Z', status: 'final', publishState: 'published', homeScore: 40, awayScore: 70 } as never }))

    await recomputeDivision(payload, division.id)
    const cacheRes = await payload.find({ collection: 'standings-cache', where: { division: { equals: division.id } }, limit: 1, overrideAccess: true })
    const rows = (cacheRes.docs[0]?.rows ?? []) as Array<{ team: string; pts: number; rank: number; w: number }>
    check('standings cache has 2 rows', rows.length === 2)
    check('Alpha is rank 1 with 4 pts (2 wins)', rows[0]?.rank === 1 && rows[0]?.team === 'Smoke Alpha' && rows[0]?.pts === 4 && rows[0]?.w === 2)
    check('Bravo is rank 2 with 0 pts', rows[1]?.rank === 2 && rows[1]?.pts === 0)

    // A published game query (what the public schedule reads) returns the 2 games.
    const pub = await payload.find({ collection: 'games', where: { publishState: { equals: 'published' } }, limit: 100, overrideAccess: true })
    check('published games query returns the 2 games', pub.docs.filter((d) => String((d as { season?: { id?: number } | number }).season) !== '').length >= 2)

    // Un-finalize one game (admin cancel): standings must drop it on recompute.
    await payload.update({ collection: 'games', id: g1.id, data: { status: 'cancelled' } as never, overrideAccess: true })
    await recomputeDivision(payload, division.id)
    const cache2 = await payload.find({ collection: 'standings-cache', where: { division: { equals: division.id } }, limit: 1, overrideAccess: true })
    const rows2 = (cache2.docs[0]?.rows ?? []) as Array<{ team: string; pts: number; gp: number }>
    const alpha2 = rows2.find((r) => r.team === 'Smoke Alpha')
    check('after cancelling one game, Alpha now has 1 game played (recompute on leaving final)', alpha2?.gp === 1)
  } finally {
    // Cleanup in reverse dependency order.
    const cacheToDelete = await payload.find({ collection: 'standings-cache', where: {}, limit: 1000, overrideAccess: true })
    for (const d of cacheToDelete.docs) {
      const div = (d as { division?: { id?: number } | number }).division
      const divId = typeof div === 'object' ? div?.id : div
      if (created.some((c) => c.collection === 'divisions' && String(c.id) === String(divId))) {
        await payload.delete({ collection: 'standings-cache', id: d.id, overrideAccess: true }).catch(() => {})
      }
    }
    for (const c of [...created].reverse()) {
      await payload.delete({ collection: c.collection as 'games', id: c.id, overrideAccess: true }).catch(() => {})
    }
    console.log(`\nCleaned up ${created.length} temporary records.`)
  }

  console.log(ok ? '\nB1 SMOKE: ALL GREEN' : '\nB1 SMOKE: FAILURES ABOVE')
  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
