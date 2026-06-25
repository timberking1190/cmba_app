/*
 * Pure CSV parser for the schedule importer. Handles UTF-8 with a BOM, quoted
 * fields containing commas, escaped double quotes, and CRLF or LF line endings.
 * Header names are lower-cased and trimmed; values are trimmed; fully blank rows
 * are skipped; extra columns are preserved in the row object but ignored by the
 * validators. No I/O.
 */

export type ParsedCsv = {
  header: string[]
  rows: Array<{ row: number; data: Record<string, string> }>
}

export function parseCsv(text: string): ParsedCsv {
  const s = text.replace(/^﻿/, '')
  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let inQuotes = false

  const pushField = () => {
    record.push(field)
    field = ''
  }
  const pushRecord = () => {
    records.push(record)
    record = []
  }

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      pushField()
    } else if (ch === '\n') {
      pushField()
      pushRecord()
    } else if (ch === '\r') {
      // ignore; the following \n closes the record
    } else {
      field += ch
    }
  }
  if (field.length > 0 || record.length > 0) {
    pushField()
    pushRecord()
  }

  const header = (records.shift() ?? []).map((h) => h.trim().toLowerCase())
  const rows: ParsedCsv['rows'] = []
  records.forEach((r, idx) => {
    if (!r.some((c) => c.trim() !== '')) return // skip blank rows
    const data: Record<string, string> = {}
    header.forEach((h, col) => {
      data[h] = (r[col] ?? '').trim()
    })
    // row numbers are 1-based and count the header as row 1, matching the UI copy
    rows.push({ row: idx + 2, data })
  })

  return { header, rows }
}

export type ImportKind = 'teams' | 'venues' | 'officials' | 'games'

export function detectKind(header: string[]): ImportKind | null {
  const h = new Set(header)
  if (h.has('home_team') && h.has('away_team')) return 'games'
  if (h.has('team_name')) return 'teams'
  if (h.has('venue_name')) return 'venues'
  if (h.has('official_name')) return 'officials'
  return null
}
