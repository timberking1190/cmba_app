/*
 * Pure per-row CSV validators for the schedule importer. They take parsed rows and
 * INJECTED lookup maps (divisions, teams, venues, courts, officials, clubs) so they
 * are fully unit-testable without a database. Errors block the row; warnings need an
 * acknowledgement in the preview. Matching is case-insensitive and trimmed but the
 * original text is preserved for display. See docs/CSV_IMPORT_SPEC.md.
 */
import type { ImportKind } from './parse'

export type Severity = 'error' | 'warning'
export type RowIssue = { severity: Severity; message: string; value?: string }
export type RowStatus = 'ready' | 'warning' | 'error'
export type ValidatedRow = { row: number; data: Record<string, string>; status: RowStatus; issues: RowIssue[] }
export type ValidationSummary = { ready: number; warnings: number; errors: number }
export type ValidationResult = { kind: ImportKind; rows: ValidatedRow[]; summary: ValidationSummary }

export type LookupRef = { id: string | number }
export type Lookups = {
  divisionsByPath: Map<string, LookupRef>
  teamsByDivisionAndName: Map<string, LookupRef>
  venuesByName: Map<string, LookupRef>
  courtsByVenueAndName: Map<string, LookupRef>
  officialsByName: Map<string, LookupRef>
  clubsByName: Map<string, LookupRef>
  existingGameKeys?: Set<string>
}

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase()
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
const RAMP_LEVELS = new Set(['level 1', 'level 2', 'level 3'])

function isRealDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const [, y, mo, d] = m
  const dt = new Date(Date.UTC(+y, +mo - 1, +d))
  return dt.getUTCFullYear() === +y && dt.getUTCMonth() === +mo - 1 && dt.getUTCDate() === +d
}

function classify(issues: RowIssue[]): RowStatus {
  if (issues.some((i) => i.severity === 'error')) return 'error'
  if (issues.some((i) => i.severity === 'warning')) return 'warning'
  return 'ready'
}

function summarize(kind: ImportKind, rows: ValidatedRow[]): ValidationResult {
  const summary = { ready: 0, warnings: 0, errors: 0 }
  for (const r of rows) {
    if (r.status === 'ready') summary.ready++
    else if (r.status === 'warning') summary.warnings++
    else summary.errors++
  }
  return { kind, rows, summary }
}

export function validateCsv(
  kind: ImportKind,
  rows: Array<{ row: number; data: Record<string, string> }>,
  lookups: Lookups,
  now: Date = new Date(),
): ValidationResult {
  const today = now.toISOString().slice(0, 10)
  if (kind === 'teams') return summarize(kind, validateTeamsBatch(rows, lookups))
  if (kind === 'venues') return summarize(kind, rows.map(validateVenue(new Set())))
  if (kind === 'officials') return summarize(kind, rows.map(validateOfficial(new Set())))
  return summarize(kind, rows.map((r) => validateGame(r, lookups, today)))
}

function validateTeam(r: { row: number; data: Record<string, string> }, lk: Lookups): ValidatedRow {
  const issues: RowIssue[] = []
  const d = r.data
  const name = d.team_name
  const div = d.division
  if (!name) issues.push({ severity: 'error', message: 'Team name is required.' })
  if (!div) issues.push({ severity: 'error', message: 'Division is required.' })

  const divRef = div ? lk.divisionsByPath.get(norm(div)) : undefined
  if (div && !divRef) issues.push({ severity: 'error', message: 'Division not found.', value: div })

  if (name && div) {
    if (divRef && lk.teamsByDivisionAndName.has(`${divRef.id}|${norm(name)}`)) {
      issues.push({ severity: 'warning', message: 'A team with this name already exists in this division.', value: name })
    }
  }
  if (d.contact_email && !isEmail(d.contact_email)) {
    issues.push({ severity: 'warning', message: 'Contact email does not look valid.', value: d.contact_email })
  }
  if (d.club && !lk.clubsByName.has(norm(d.club))) {
    issues.push({ severity: 'warning', message: 'Club not found. It will be created when you approve the import.', value: d.club })
  }
  return { row: r.row, data: d, status: classify(issues), issues }
}

// Venues and Officials track in-file duplicates via a closure-scoped Set.
function validateVenue(seen: Set<string>) {
  return (r: { row: number; data: Record<string, string> }): ValidatedRow => {
    const issues: RowIssue[] = []
    const d = r.data
    if (!d.venue_name) issues.push({ severity: 'error', message: 'Venue name is required.' })
    if (d.venue_name) {
      const key = `${norm(d.venue_name)}|${norm(d.court_name)}`
      if (seen.has(key)) issues.push({ severity: 'error', message: 'This venue and court pair appears twice in the file.', value: d.venue_name })
      else seen.add(key)
    }
    if (!d.address) issues.push({ severity: 'warning', message: 'Address is blank. Families use it for directions.' })
    return { row: r.row, data: d, status: classify(issues), issues }
  }
}

function validateOfficial(seen: Set<string>) {
  return (r: { row: number; data: Record<string, string> }): ValidatedRow => {
    const issues: RowIssue[] = []
    const d = r.data
    if (!d.official_name) issues.push({ severity: 'error', message: 'Official name is required.' })
    if (d.official_name) {
      const key = `${norm(d.official_name)}|${norm(d.email)}`
      if (seen.has(key)) issues.push({ severity: 'error', message: 'This official appears twice in the file.', value: d.official_name })
      else seen.add(key)
    }
    if (d.email && !isEmail(d.email)) issues.push({ severity: 'warning', message: 'Email does not look valid.', value: d.email })
    if (d.ramp_level && !RAMP_LEVELS.has(norm(d.ramp_level))) {
      issues.push({ severity: 'warning', message: 'Ramp level is not one of the known levels.', value: d.ramp_level })
    }
    return { row: r.row, data: d, status: classify(issues), issues }
  }
}

function validateGame(r: { row: number; data: Record<string, string> }, lk: Lookups, today: string): ValidatedRow {
  const issues: RowIssue[] = []
  const d = r.data
  const req: Array<[string, string]> = [
    ['date', 'Date'],
    ['time', 'Time'],
    ['division', 'Division'],
    ['home_team', 'Home team'],
    ['away_team', 'Away team'],
    ['venue', 'Venue'],
  ]
  for (const [field, label] of req) {
    if (!d[field]) issues.push({ severity: 'error', message: `${label} is required.` })
  }

  if (d.date && !isRealDate(d.date)) issues.push({ severity: 'error', message: 'Date is not a real calendar date.', value: d.date })
  if (d.time && !isTime(d.time)) issues.push({ severity: 'error', message: 'Time is not valid 24 hour time.', value: d.time })

  const divRef = d.division ? lk.divisionsByPath.get(norm(d.division)) : undefined
  if (d.division && !divRef) issues.push({ severity: 'error', message: 'Division not found.', value: d.division })

  const venueRef = d.venue ? lk.venuesByName.get(norm(d.venue)) : undefined
  if (d.venue && !venueRef) issues.push({ severity: 'error', message: 'Venue not found.', value: d.venue })

  if (d.home_team && d.away_team && norm(d.home_team) === norm(d.away_team)) {
    issues.push({ severity: 'error', message: 'Home team and away team cannot be the same.', value: d.home_team })
  }

  if (d.home_team && divRef && !lk.teamsByDivisionAndName.has(`${divRef.id}|${norm(d.home_team)}`)) {
    issues.push({ severity: 'error', message: 'Home team not found in this division.', value: d.home_team })
  }
  if (d.away_team && divRef && !lk.teamsByDivisionAndName.has(`${divRef.id}|${norm(d.away_team)}`)) {
    issues.push({ severity: 'error', message: 'Away team not found in this division.', value: d.away_team })
  }
  if (d.court && venueRef && !lk.courtsByVenueAndName.has(`${venueRef.id}|${norm(d.court)}`)) {
    issues.push({ severity: 'error', message: 'Court not found at this venue.', value: d.court })
  }
  for (const refField of ['referee_1', 'referee_2']) {
    if (d[refField] && !lk.officialsByName.has(norm(d[refField]))) {
      issues.push({ severity: 'error', message: 'Referee not found in the officials roster.', value: d[refField] })
    }
  }

  // Warnings
  if (d.date && isRealDate(d.date) && d.date < today) {
    issues.push({ severity: 'warning', message: 'This game is in the past.', value: d.date })
  }
  const gameKey = `${norm(d.division)}|${norm(d.home_team)}|${norm(d.away_team)}|${d.date}|${d.time}`
  if (lk.existingGameKeys?.has(gameKey)) {
    issues.push({ severity: 'warning', message: 'An identical game already exists.', value: `${d.date} ${d.time}` })
  }

  return { row: r.row, data: d, status: classify(issues), issues }
}

// Re-validate teams with in-file duplicate detection across the whole batch.
export function validateTeamsBatch(rows: Array<{ row: number; data: Record<string, string> }>, lk: Lookups): ValidatedRow[] {
  const seen = new Set<string>()
  return rows.map((r) => {
    const base = validateTeam(r, lk)
    const name = r.data.team_name
    const div = r.data.division
    if (name && div) {
      const key = `${norm(div)}|${norm(name)}`
      if (seen.has(key)) {
        base.issues.unshift({ severity: 'error', message: 'This team appears twice in the same division in the file.', value: name })
        base.status = classify(base.issues)
      } else {
        seen.add(key)
      }
    }
    return base
  })
}
