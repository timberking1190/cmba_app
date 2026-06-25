import type { Payload } from 'payload'

import { detectConflicts, type Conflict, type ConflictGame } from '../conflicts/detect'
import { buildLookups, publishedConflictGames, type ImportLookups } from './lookups'
import type { ImportKind } from './parse'
import { validateCsv, type ValidationResult } from './validate'

/*
 * Server side of the CSV importer: the dry-run preview (validate + conflict check,
 * writes nothing) and the transactional commit and undo. The commit re-enforces the
 * acknowledge gate (never trusts the browser), writes an ImportBatch FIRST in a
 * pending state with the planned counts, creates the rows in ONE transaction
 * recording their ids, then flips the batch to committed. A failure rolls the rows
 * back and leaves a pending batch, never orphaned rows. Undo reverses the manifest.
 */

type Row = { row: number; data: Record<string, string> }
const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase()
const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

const TZ = 'America/Edmonton'
function tzOffsetMinutes(date: Date): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const local = new Date(date.toLocaleString('en-US', { timeZone: TZ }))
  return Math.round((local.getTime() - utc.getTime()) / 60000)
}
export function edmontonToUtcISO(dateStr: string, timeStr: string): string {
  const naive = new Date(`${dateStr}T${timeStr}:00Z`)
  const off = tzOffsetMinutes(naive)
  return new Date(naive.getTime() - off * 60000).toISOString()
}

export const DEFAULT_GAME_LENGTH = 60
export const DEFAULT_BUFFER = 15
export const MAX_IMPORT_ROWS = 2000

export type ImportPreview = {
  validation: ValidationResult
  conflicts: Conflict[]
  canImport: boolean // errors === 0
  needsAck: boolean // warnings or conflicts present
}

// Build candidate conflict games from valid game rows (ids resolved via lookups).
function candidateGames(rows: Row[], lk: ImportLookups): ConflictGame[] {
  const out: ConflictGame[] = []
  for (const r of rows) {
    const d = r.data
    const div = lk.divisionsByPath.get(norm(d.division))
    const venue = lk.venuesByName.get(norm(d.venue))
    const home = div ? lk.teamsByDivisionAndName.get(`${div.id}|${norm(d.home_team)}`) : undefined
    const away = div ? lk.teamsByDivisionAndName.get(`${div.id}|${norm(d.away_team)}`) : undefined
    if (!home || !away || !d.date || !d.time) continue
    const court = venue ? lk.courtsByVenueAndName.get(`${venue.id}|${norm(d.court)}`) : undefined
    const officialIds: (string | number)[] = []
    for (const f of ['referee_1', 'referee_2']) {
      const o = d[f] ? lk.officialsFull.get(norm(d[f])) : undefined
      if (o) officialIds.push(o.id)
    }
    out.push({ id: `row-${r.row}`, startAt: edmontonToUtcISO(d.date, d.time), venueId: venue?.id, courtId: court?.id, homeTeamId: home.id, awayTeamId: away.id, officialIds })
  }
  return out
}

export async function buildPreview(payload: Payload, kind: ImportKind, rows: Row[], seasonId?: string | number): Promise<ImportPreview> {
  const lk = await buildLookups(payload, seasonId)
  const validation = validateCsv(kind, rows, lk)

  let conflicts: Conflict[] = []
  if (kind === 'games') {
    const okRows = validation.rows.filter((r) => r.status !== 'error').map((r) => ({ row: r.row, data: r.data }))
    const candidates = candidateGames(okRows, lk)
    const published = await publishedConflictGames(payload, seasonId)
    conflicts = detectConflicts(candidates, published, { gameLengthMinutes: DEFAULT_GAME_LENGTH, bufferMinutes: DEFAULT_BUFFER })
  }
  const canImport = validation.summary.errors === 0
  const needsAck = validation.summary.warnings > 0 || conflicts.length > 0
  return { validation, conflicts, canImport, needsAck }
}

type Created = { collection: string; id: string | number }

export type CommitResult = { ok: boolean; batchId?: string | number; counts?: Record<string, number>; error?: string }

export async function commitImport(
  payload: Payload,
  opts: { kind: ImportKind; rows: Row[]; publishMode: 'draft' | 'published'; acknowledged: boolean; actor: { id: string | number }; seasonId?: string | number },
): Promise<CommitResult> {
  const { kind, rows, publishMode, acknowledged, actor, seasonId } = opts
  if (rows.length > MAX_IMPORT_ROWS) return { ok: false, error: `This import has ${rows.length} rows, over the limit of ${MAX_IMPORT_ROWS}. Please split the file.` }

  // Re-validate server-side; never trust the browser acknowledge flag.
  const preview = await buildPreview(payload, kind, rows, seasonId)
  if (!preview.canImport) return { ok: false, error: 'The file has errors that must be fixed before importing.' }
  if (preview.needsAck && !acknowledged) return { ok: false, error: 'There are warnings or conflicts that must be acknowledged before importing.' }

  const lk = await buildLookups(payload, seasonId)
  const okRows = preview.validation.rows.filter((r) => r.status !== 'error').map((r) => ({ row: r.row, data: r.data }))

  // Write the batch FIRST in pending state.
  const batch = await payload.create({
    collection: 'import-batches',
    overrideAccess: true,
    data: { kind, status: 'pending', publishMode: kind === 'games' ? publishMode : undefined, committedBy: actor.id, counts: { ready: okRows.length, warnings: preview.validation.summary.warnings, errors: preview.validation.summary.errors } } as never,
  })

  const created: Created[] = []
  const transactionID = await payload.db.beginTransaction?.()
  const req = (transactionID != null ? { transactionID } : undefined) as never

  try {
    if (kind === 'teams') await commitTeams(payload, okRows, lk, batch.id, created, req)
    else if (kind === 'venues') await commitVenues(payload, okRows, created, req)
    else if (kind === 'officials') await commitOfficials(payload, okRows, batch.id, created, req)
    else await commitGames(payload, okRows, lk, publishMode, batch.id, actor, created, req)

    if (transactionID != null) await payload.db.commitTransaction?.(transactionID)
  } catch (err) {
    if (transactionID != null) await payload.db.rollbackTransaction?.(transactionID)
    payload.logger.error(`[import] commit failed (batch ${batch.id} left pending): ${String(err)}`)
    return { ok: false, batchId: batch.id, error: 'The import failed and was rolled back. No rows were created.' }
  }

  const undoWindowMinutes = 60
  await payload.update({
    collection: 'import-batches',
    id: batch.id,
    overrideAccess: true,
    data: { status: 'committed', createdRecords: created, committedAt: new Date().toISOString(), undoExpiresAt: new Date(Date.now() + undoWindowMinutes * 60_000).toISOString(), undoWindowMinutes, counts: { ready: okRows.length, warnings: preview.validation.summary.warnings, errors: 0, imported: created.length } } as never,
  })
  await payload.create({ collection: 'audit-log', overrideAccess: true, data: { actor: actor.id, action: 'import.commit', entity: 'import-batches', entityId: String(batch.id), after: { kind, imported: created.length, publishMode }, at: new Date().toISOString() } as never })

  const counts: Record<string, number> = {}
  for (const c of created) counts[c.collection] = (counts[c.collection] ?? 0) + 1
  return { ok: true, batchId: batch.id, counts }
}

async function commitTeams(payload: Payload, rows: Row[], lk: ImportLookups, batchId: string | number, created: Created[], req: never) {
  for (const r of rows) {
    const d = r.data
    const div = lk.divisionsByPath.get(norm(d.division))!
    let clubId = d.club ? relId(lk.clubsByName.get(norm(d.club))) : undefined
    if (d.club && clubId == null) {
      const club = await payload.create({ collection: 'clubs', overrideAccess: true, req, data: { name: d.club.trim() } as never })
      clubId = club.id
      created.push({ collection: 'clubs', id: club.id })
      lk.clubsByName.set(norm(d.club), { id: club.id })
    }
    const team = await payload.create({ collection: 'teams', overrideAccess: true, req, data: { name: d.team_name.trim(), division: div.id, club: clubId, color: d.team_color || undefined, externalId: d.external_id || undefined, importBatch: batchId } as never })
    created.push({ collection: 'teams', id: team.id })
    lk.teamsByDivisionAndName.set(`${div.id}|${norm(d.team_name)}`, { id: team.id })
  }
}

async function commitVenues(payload: Payload, rows: Row[], created: Created[], req: never) {
  const venueByName = new Map<string, string | number>()
  for (const r of rows) {
    const d = r.data
    const vkey = norm(d.venue_name)
    let venueId = venueByName.get(vkey)
    if (venueId == null) {
      const existing = await payload.find({ collection: 'venues', where: { name: { equals: d.venue_name.trim() } }, limit: 1, overrideAccess: true, req })
      if (existing.docs.length) venueId = existing.docs[0].id
      else {
        const venue = await payload.create({ collection: 'venues', overrideAccess: true, req, data: { name: d.venue_name.trim(), address: d.address || undefined, city: d.city || undefined, province: d.province || 'AB', postalCode: d.postal_code || undefined, mapsUrl: d.maps_url || undefined, notes: d.notes || undefined, externalId: d.external_id || undefined } as never })
        venueId = venue.id
        created.push({ collection: 'venues', id: venue.id })
      }
      venueByName.set(vkey, venueId)
    }
    const courtName = (d.court_name || 'Main').trim()
    const court = await payload.create({ collection: 'courts', overrideAccess: true, req, data: { name: courtName, venue: venueId, externalId: d.external_id || undefined } as never }).catch(() => null)
    if (court) created.push({ collection: 'courts', id: court.id })
  }
}

async function commitOfficials(payload: Payload, rows: Row[], batchId: string | number, created: Created[], req: never) {
  const rampMap: Record<string, string> = { 'level 1': 'level1', 'level 2': 'level2', 'level 3': 'level3' }
  for (const r of rows) {
    const d = r.data
    const official = await payload.create({ collection: 'officials', overrideAccess: true, req, data: { name: d.official_name.trim(), email: d.email || undefined, phone: d.phone || undefined, rampLevel: rampMap[norm(d.ramp_level)] || undefined, maxGamesPerDay: d.max_games_per_day ? Number(d.max_games_per_day) : undefined, externalId: d.external_id || undefined, notes: d.notes || undefined, importBatch: batchId } as never })
    created.push({ collection: 'officials', id: official.id })
  }
}

async function commitGames(payload: Payload, rows: Row[], lk: ImportLookups, publishMode: 'draft' | 'published', batchId: string | number, actor: { id: string | number }, created: Created[], req: never) {
  for (const r of rows) {
    const d = r.data
    const div = lk.divisionsByPath.get(norm(d.division))!
    const venue = lk.venuesByName.get(norm(d.venue))
    const home = lk.teamsByDivisionAndName.get(`${div.id}|${norm(d.home_team)}`)!
    const away = lk.teamsByDivisionAndName.get(`${div.id}|${norm(d.away_team)}`)!
    const court = venue && d.court ? lk.courtsByVenueAndName.get(`${venue.id}|${norm(d.court)}`) : undefined
    // Resolve the season from the division.
    const division = await payload.findByID({ collection: 'divisions', id: div.id, depth: 0, overrideAccess: true, req })
    const seasonId = relId((division as { season?: unknown }).season)
    const game = await payload.create({
      collection: 'games',
      overrideAccess: true,
      req,
      data: { season: seasonId, division: div.id, homeTeam: home.id, awayTeam: away.id, venue: venue?.id, court: court?.id, startAt: edmontonToUtcISO(d.date, d.time), status: 'scheduled', publishState: publishMode, externalId: d.external_id || undefined, notes: d.notes || undefined, importBatch: batchId } as never,
    })
    created.push({ collection: 'games', id: game.id })
    for (const f of ['referee_1', 'referee_2'] as const) {
      const ref = d[f] ? lk.officialsFull.get(norm(d[f])) : undefined
      if (ref) {
        const ga = await payload.create({ collection: 'game-officials', overrideAccess: true, req, data: { game: game.id, official: ref.id, officialUserId: undefined, role: f === 'referee_1' ? 'referee1' : 'referee2', assignedBy: actor.id, assignedAt: new Date().toISOString() } as never }).catch(() => null)
        if (ga) created.push({ collection: 'game-officials', id: ga.id })
      }
    }
  }
}

export async function undoImport(payload: Payload, batchId: string | number, actor: { id: string | number }): Promise<{ ok: boolean; error?: string; removed?: number }> {
  const batch = (await payload.findByID({ collection: 'import-batches', id: batchId, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { status?: string; createdRecords?: Created[]; undoExpiresAt?: string }
    | null
  if (!batch) return { ok: false, error: 'Import batch not found.' }
  if (batch.status !== 'committed') return { ok: false, error: 'This import cannot be undone.' }
  if (batch.undoExpiresAt && new Date(batch.undoExpiresAt).getTime() < Date.now()) return { ok: false, error: 'The undo window for this import has passed.' }

  // Delete in reverse so child rows (game-officials, courts) go before parents.
  const order = ['game-officials', 'games', 'courts', 'teams', 'officials', 'venues', 'clubs']
  const records = [...(batch.createdRecords ?? [])].sort((a, b) => order.indexOf(a.collection) - order.indexOf(b.collection))
  let removed = 0
  for (const rec of records) {
    await payload.delete({ collection: rec.collection as 'games', id: rec.id, overrideAccess: true }).then(() => { removed++ }).catch(() => {})
  }
  await payload.update({ collection: 'import-batches', id: batchId, overrideAccess: true, data: { status: 'undone', undoneBy: actor.id, undoneAt: new Date().toISOString() } as never })
  await payload.create({ collection: 'audit-log', overrideAccess: true, data: { actor: actor.id, action: 'import.undo', entity: 'import-batches', entityId: String(batchId), after: { removed }, at: new Date().toISOString() } as never })
  return { ok: true, removed }
}
