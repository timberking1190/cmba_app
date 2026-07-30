/*
 * Pure conflict detection, shared by the CSV importer, the schedule generator, and
 * the officials assigning screen. No I/O. The three double-booking checks are
 * BLOCKING errors (publish is blocked until resolved or acknowledged); the two
 * official checks are acknowledgeable warnings. Byes are excluded from every check.
 * Each candidate game is compared against the other candidates AND against the
 * already-published games. Output is deterministically ordered.
 */

import { leagueDayKey } from '../leagueTime'

export type ConflictGame = {
  id: string | number
  startAt: string // ISO
  venueId?: string | number | null
  courtId?: string | number | null
  homeTeamId: string | number
  awayTeamId: string | number
  officialIds?: (string | number)[] | null
  isBye?: boolean | null
}

export type ConflictKind = 'VENUE_COURT_DOUBLE_BOOK' | 'TEAM_DOUBLE_BOOK' | 'OFFICIAL_DOUBLE_BOOK'

export type Conflict = {
  kind: ConflictKind
  gameA: string | number
  gameB: string | number
  sharedKey: string
  window: { start: string; end: string }
}

const key = (id: string | number) => String(id)

function windowOf(g: ConflictGame, totalMinutes: number): { start: number; end: number } {
  const start = new Date(g.startAt).getTime()
  return { start, end: start + totalMinutes * 60_000 }
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): { start: number; end: number } | null {
  if (a.start < b.end && b.start < a.end) {
    return { start: Math.max(a.start, b.start), end: Math.min(a.end, b.end) }
  }
  return null
}

function sharedTeam(a: ConflictGame, b: ConflictGame): string | null {
  const aTeams = [key(a.homeTeamId), key(a.awayTeamId)]
  const bTeams = new Set([key(b.homeTeamId), key(b.awayTeamId)])
  const hit = aTeams.find((t) => bTeams.has(t))
  return hit ?? null
}

function sharedOfficial(a: ConflictGame, b: ConflictGame): string | null {
  const aOff = (a.officialIds ?? []).map(key)
  const bOff = new Set((b.officialIds ?? []).map(key))
  const hit = aOff.find((o) => bOff.has(o))
  return hit ?? null
}

export function detectConflicts(
  candidates: ConflictGame[],
  published: ConflictGame[],
  opts: { gameLengthMinutes: number; bufferMinutes: number },
): Conflict[] {
  const total = opts.gameLengthMinutes + opts.bufferMinutes
  const cands = candidates.filter((g) => !g.isBye)
  const pub = published.filter((g) => !g.isBye)
  const out: Conflict[] = []

  const compare = (a: ConflictGame, b: ConflictGame) => {
    const ov = overlaps(windowOf(a, total), windowOf(b, total))
    if (!ov) return
    const win = { start: new Date(ov.start).toISOString(), end: new Date(ov.end).toISOString() }

    if (a.venueId != null && a.courtId != null && key(a.venueId) === key(b.venueId ?? '') && key(a.courtId) === key(b.courtId ?? '')) {
      out.push({ kind: 'VENUE_COURT_DOUBLE_BOOK', gameA: a.id, gameB: b.id, sharedKey: `${key(a.venueId)}/${key(a.courtId)}`, window: win })
    }
    const team = sharedTeam(a, b)
    if (team) out.push({ kind: 'TEAM_DOUBLE_BOOK', gameA: a.id, gameB: b.id, sharedKey: team, window: win })

    const official = sharedOfficial(a, b)
    if (official) out.push({ kind: 'OFFICIAL_DOUBLE_BOOK', gameA: a.id, gameB: b.id, sharedKey: official, window: win })
  }

  // candidate vs candidate (each unordered pair once)
  for (let i = 0; i < cands.length; i++) {
    for (let j = i + 1; j < cands.length; j++) compare(cands[i], cands[j])
  }
  // candidate vs already-published
  for (const c of cands) {
    for (const p of pub) compare(c, p)
  }

  // Deterministic order so the same inputs always render the same preview.
  out.sort((x, y) => x.kind.localeCompare(y.kind) || key(x.gameA).localeCompare(key(y.gameA)) || key(x.gameB).localeCompare(key(y.gameB)) || x.sharedKey.localeCompare(y.sharedKey))
  return out
}

/* Official assignment warnings (acknowledgeable, not blocking). */
export type OfficialWarningKind = 'OFFICIAL_OVER_MAX' | 'OFFICIAL_RAMP_BELOW'
export type OfficialWarning = { kind: OfficialWarningKind; officialId: string | number; detail: string }

export type OfficialAssignment = {
  gameId: string | number
  startAt: string
  officialId: string | number
  rampLevel?: string | null // 'level1' | 'level2' | 'level3' | null
  maxGamesPerDay?: number | null
  requiredRampLevel?: string | null // 'none' | 'level1' | 'level2' | 'level3'
}

const RAMP_RANK: Record<string, number> = { none: 0, level1: 1, level2: 2, level3: 3 }

export function detectOfficialWarnings(assignments: OfficialAssignment[]): OfficialWarning[] {
  const out: OfficialWarning[] = []

  // Over max games per day, grouped by official and calendar day.
  const perOfficialDay = new Map<string, { count: number; max: number | null }>()
  for (const a of assignments) {
    // The LEAGUE day, not the UTC day: an evening Calgary game is the next day
    // in UTC, and grouping on that split a Saturday slate across two days.
    const day = leagueDayKey(a.startAt)
    const k = `${key(a.officialId)}|${day}`
    const cur = perOfficialDay.get(k) ?? { count: 0, max: a.maxGamesPerDay ?? null }
    cur.count += 1
    if (a.maxGamesPerDay != null) cur.max = a.maxGamesPerDay
    perOfficialDay.set(k, cur)
  }
  for (const [k, v] of perOfficialDay) {
    const [officialId, day] = k.split('|')
    if (v.max != null && v.count > v.max) {
      out.push({ kind: 'OFFICIAL_OVER_MAX', officialId, detail: `${v.count} games on ${day} exceeds the max of ${v.max}.` })
    }
  }

  // Ramp level below the division requirement.
  for (const a of assignments) {
    const required = a.requiredRampLevel ?? 'none'
    if (required === 'none') continue
    const have = RAMP_RANK[a.rampLevel ?? 'none'] ?? 0
    if (have < (RAMP_RANK[required] ?? 0)) {
      out.push({ kind: 'OFFICIAL_RAMP_BELOW', officialId: a.officialId, detail: `Ramp level ${a.rampLevel ?? 'none'} is below the required ${required}.` })
    }
  }

  out.sort((x, y) => x.kind.localeCompare(y.kind) || key(x.officialId).localeCompare(key(y.officialId)) || x.detail.localeCompare(y.detail))
  return out
}
