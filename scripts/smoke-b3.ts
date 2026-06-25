/*
 * B3 integration smoke against the live ca-central-1 DB. Creates a season with the
 * two divisions the shipped templates reference, then imports the real Teams,
 * Venues, Officials, and Games template files through the import service (validate
 * -> commit), undoes the games import, re-imports published, and runs an admin
 * override. Cleans up all test scheduling data afterward. Run: npm run smoke:b3
 */
import 'dotenv/config'
import fs from 'fs'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import config from '@payload-config'

import { buildPreview, commitImport, undoImport } from '../src/lib/csvImport/commit'
import { parseCsv } from '../src/lib/csvImport/parse'
import { adminOverride } from '../src/lib/games/service'

const TEMPLATE_CLUBS = ['excel', 'comba', 'okotoks', 'dms']
let ok = true
const check = (label: string, cond: boolean) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) ok = false }

async function cleanVolatile(payload: Payload) {
  const all = { id: { exists: true } } as never
  for (const c of ['game-officials', 'confirmations', 'disputes', 'score-reports', 'standings-cache', 'team-memberships', 'games', 'teams', 'courts', 'venues', 'officials', 'import-batches', 'divisions', 'seasons'] as const) {
    await payload.delete({ collection: c, where: all, overrideAccess: true }).catch(() => {})
  }
  for (const name of TEMPLATE_CLUBS) {
    await payload.delete({ collection: 'clubs', where: { name: { like: name } } as never, overrideAccess: true }).catch(() => {})
  }
}

function readTemplate(name: string): string {
  return fs.readFileSync(`public/templates/${name}`, 'utf8')
}

async function importKind(payload: Payload, csvName: string, kind: 'teams' | 'venues' | 'officials' | 'games', actor: { id: number | string }, seasonId: number | string, publishMode: 'draft' | 'published' = 'draft') {
  const rows = parseCsv(readTemplate(csvName)).rows
  const preview = await buildPreview(payload, kind, rows, seasonId)
  const res = await commitImport(payload, { kind, rows, publishMode, acknowledged: true, actor, seasonId })
  return { preview, res }
}

async function main() {
  const payload = await getPayload({ config })
  await cleanVolatile(payload)

  try {
    const actor = { id: (await payload.find({ collection: 'users', where: { roles: { contains: 'super_admin' } }, limit: 1, overrideAccess: true })).docs[0]?.id ?? 1 }
    const season = await payload.create({ collection: 'seasons', overrideAccess: true, data: { name: 'SMOKE-B3 Season', status: 'active', startDate: '2026-01-01', endDate: '2026-12-31' } as never })
    // The two divisions the Teams and Games templates reference, with exact fullPaths.
    for (const fullPath of ['Weekend Rec League / U13 Boys / A', 'Weekend Rec League / U13 Girls / B']) {
      await payload.create({ collection: 'divisions', overrideAccess: true, data: { fullPath, displayLabel: fullPath.split('/').pop()?.trim() || fullPath, leagueName: 'Weekend Rec League', ageGroup: 'U13', season: season.id } as never })
    }

    const teams = await importKind(payload, 'CMBA_Teams_Template.csv', 'teams', actor, season.id)
    check('Teams import committed 4 teams', (teams.res.counts?.teams ?? 0) === 4)

    const venues = await importKind(payload, 'CMBA_Venues_Template.csv', 'venues', actor, season.id)
    check('Venues import created venues + courts', (venues.res.counts?.venues ?? 0) >= 3 && (venues.res.counts?.courts ?? 0) >= 4)

    const officials = await importKind(payload, 'CMBA_Officials_Template.csv', 'officials', actor, season.id)
    check('Officials import created 3 officials', (officials.res.counts?.officials ?? 0) === 3)

    const games = await importKind(payload, 'CMBA_Games_Template.csv', 'games', actor, season.id, 'draft')
    check('Games preview has past-date warnings (2026-01 dates)', games.preview.validation.summary.warnings >= 1)
    check('Games preview has zero errors', games.preview.validation.summary.errors === 0)
    check('Games import created 3 games', (games.res.counts?.games ?? 0) === 3)
    check('Games import created referee assignments', (games.res.counts?.['game-officials'] ?? 0) >= 1)

    // The games are draft, so the public schedule query (published only) sees none.
    const publishedCount = await payload.count({ collection: 'games', where: { publishState: { equals: 'published' } }, overrideAccess: true })
    check('imported games are draft (not public)', publishedCount.totalDocs === 0)

    // Undo the games import.
    const undo = await undoImport(payload, games.res.batchId!, actor)
    check('undo removed the imported games', undo.ok === true)
    const afterUndo = await payload.count({ collection: 'games', overrideAccess: true })
    check('games are gone after undo', afterUndo.totalDocs === 0)

    // Re-import games as published.
    const games2 = await importKind(payload, 'CMBA_Games_Template.csv', 'games', actor, season.id, 'published')
    check('re-import published 3 games', (games2.res.counts?.games ?? 0) === 3)
    const pub2 = await payload.count({ collection: 'games', where: { publishState: { equals: 'published' } }, overrideAccess: true })
    check('re-imported games are public', pub2.totalDocs === 3)

    // Admin override: finalize the first game.
    const firstGame = (await payload.find({ collection: 'games', where: { isBye: { not_equals: true } }, sort: ['startAt'], limit: 1, overrideAccess: true })).docs[0]
    await adminOverride(payload, firstGame.id, actor, { status: 'final', homeScore: 55, awayScore: 50 }, 'Smoke test finalize')
    const finalized = await payload.findByID({ collection: 'games', id: firstGame.id, overrideAccess: true })
    check('admin override finalized the game with the score', (finalized as { status?: string; homeScore?: number }).status === 'final' && (finalized as { homeScore?: number }).homeScore === 55)
    const cache = await payload.find({ collection: 'standings-cache', limit: 5, overrideAccess: true })
    check('standings recomputed after the override', cache.docs.length >= 1)
  } finally {
    await cleanVolatile(payload)
    console.log('\nCleaned up B3 test data (audit rows left by design).')
  }

  console.log(ok ? '\nB3 SMOKE: ALL GREEN' : '\nB3 SMOKE: FAILURES ABOVE')
  process.exit(ok ? 0 : 1)
}

main().catch((err) => { console.error(err); process.exit(1) })
