/*
 * Forgiving date and time parsing for the schedule importer. Pure, no I/O.
 *
 * Why this exists: schedulers build the file in a spreadsheet, and a spreadsheet
 * rewrites what they typed. 08:00 comes back as "8:00", "8:00 AM", or as the raw
 * serial number 0.3333333333333333 when the cell was left on the General format.
 * The importer used to accept strict 24 hour time only, so a correct schedule was
 * rejected row by row and the scheduler had no way to tell why.
 *
 * The rule we follow: accept anything a human or a spreadsheet can reasonably mean
 * by a clock time, normalize it to 24 hour HH:MM for storage, and hand back a
 * plain sentence when we had to make a judgement call so the preview can show it.
 * Never guess when guessing could move a real game: an ambiguous slash date such
 * as 04/11/2026 is April 11 in one country and November 4 in another, so that is
 * an error with instructions, not a silent choice.
 */

export type ParseOk = { ok: true; value: string; note?: string }
export type ParseFail = { ok: false; reason: string }
export type ParseResult = ParseOk | ParseFail

/*
 * Spreadsheets and copy and paste inject characters that look like a plain space
 * but are not: a byte order mark, a non breaking space, and the narrow no break
 * space Excel puts before AM and PM in some locales.
 */
export function cleanCell(raw: string | undefined | null): string {
  return String(raw ?? '')
    .replace(/﻿/g, '') // byte order mark, anywhere in the cell
    .replace(/[    ]/g, ' ') // non breaking and narrow spaces
    .trim()
    .replace(/\s+/g, ' ')
}

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (h: number, m: number) => `${pad(h)}:${pad(m)}`

/** 08:00 -> "8:00 AM". The format every human in the league reads. */
export function to12Hour(value: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(value)
  if (!m) return value
  const h = Number(m[1])
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m[2]} ${suffix}`
}

const TIME_HELP = 'Use a 12 hour time like 8:00 AM or a 24 hour time like 20:00.'

/*
 * Excel stores a time as a fraction of a day and a date and time as a whole
 * number of days plus that fraction. Only the fraction carries the clock time.
 */
function fromDayFraction(fraction: number): ParseResult {
  let minutes = Math.round(fraction * 24 * 60)
  if (minutes >= 24 * 60) minutes = 24 * 60 - 1 // a value a hair under midnight
  if (minutes < 0) return { ok: false, reason: `Time is not a clock time. ${TIME_HELP}` }
  return { ok: true, value: hhmm(Math.floor(minutes / 60), minutes % 60) }
}

/**
 * Parse any reasonable spelling of a clock time and normalize it to 24 hour HH:MM.
 * Accepts 08:00, 8:00, 8:00 AM, 8:00PM, 8:00 a.m., 20:00, 08:00:00, 0800, a bare
 * hour, and an Excel serial. Returns a plain sentence in `note` when a judgement
 * call was made, so the import preview can show the scheduler what was read.
 */
export function parseFlexibleTime(raw: string | undefined | null): ParseResult {
  const s = cleanCell(raw)
  if (!s) return { ok: false, reason: 'Time is required.' }

  // 8:00 AM, 8:00:00 p.m., 8 PM, 8:00am
  const withMeridiem = /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap])\.?\s*m?\.?$/i.exec(s)
  if (withMeridiem) {
    const h = Number(withMeridiem[1])
    const m = withMeridiem[2] == null ? 0 : Number(withMeridiem[2])
    const isPm = withMeridiem[3].toLowerCase() === 'p'
    if (h < 1 || h > 12) return { ok: false, reason: `An am or pm time needs an hour from 1 to 12. ${TIME_HELP}` }
    if (m > 59) return { ok: false, reason: `Minutes must be 00 to 59. ${TIME_HELP}` }
    const h24 = isPm ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h
    return { ok: true, value: hhmm(h24, m) }
  }

  // 20:00, 8:00, 08:00:00
  const colon = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s)
  if (colon) {
    const h = Number(colon[1])
    const m = Number(colon[2])
    if (h > 23) return { ok: false, reason: `Hours must be 00 to 23 without am or pm. ${TIME_HELP}` }
    if (m > 59) return { ok: false, reason: `Minutes must be 00 to 59. ${TIME_HELP}` }
    return { ok: true, value: hhmm(h, m) }
  }

  // 0800 or 800, the four digit form schedules are often written in.
  const military = /^(\d{1,2})(\d{2})$/.exec(s)
  if (military && s.length >= 3) {
    const h = Number(military[1])
    const m = Number(military[2])
    if (h <= 23 && m <= 59) return { ok: true, value: hhmm(h, m) }
  }

  // A bare hour. Real, but worth telling the scheduler what we read.
  const bareHour = /^(\d{1,2})$/.exec(s)
  if (bareHour) {
    const h = Number(bareHour[1])
    if (h <= 23) {
      const value = hhmm(h, 0)
      return { ok: true, value, note: `Time had no minutes, so it was read as ${to12Hour(value)}. Add minutes or am or pm to be certain.` }
    }
    return { ok: false, reason: `Hours must be 00 to 23 without am or pm. ${TIME_HELP}` }
  }

  // An Excel serial. Only a value carrying a fraction of a day is a clock time.
  const serial = /^\d+\.\d+$/.exec(s)
  if (serial) {
    const n = Number(s)
    const res = fromDayFraction(n - Math.floor(n))
    if (res.ok) return { ...res, note: `The spreadsheet stored this as a number, and it was read as ${to12Hour(res.value)}.` }
    return res
  }

  return { ok: false, reason: `Time is not a clock time we recognize. ${TIME_HELP}` }
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}

const DATE_HELP = 'Use the year first, in the format YYYY-MM-DD, like 2026-12-10.'

function isRealYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

/*
 * Excel counts days from 1900-01-01 as serial 1 and carries a deliberate bug: it
 * believes 1900 was a leap year. Anchoring at 1899-12-30 reproduces the same
 * arithmetic for every serial past that phantom day, which is every real season.
 */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)

/**
 * Parse any reasonable spelling of a calendar date and normalize it to YYYY-MM-DD.
 * Accepts 2026-12-10, 2026/12/10, an Excel date serial, and unambiguous month name
 * forms. Deliberately refuses a slash date like 04/11/2026, because day first and
 * month first schedulers mean different days by it and a wrong guess moves a game.
 */
export function parseFlexibleDate(raw: string | undefined | null): ParseResult {
  const s = cleanCell(raw)
  if (!s) return { ok: false, reason: 'Date is required.' }

  // Year first, the format the template asks for.
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s)
  if (iso) {
    const [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    if (!isRealYmd(y, m, d)) return { ok: false, reason: `Date is not a real calendar date. ${DATE_HELP}` }
    return { ok: true, value: ymd(y, m, d) }
  }

  // 10 Dec 2026 and 10-Dec-2026
  const dayFirst = /^(\d{1,2})[\s\-/]+([A-Za-z]{3,9})\.?[\s\-/,]+(\d{4})$/.exec(s)
  if (dayFirst) {
    const m = MONTHS[dayFirst[2].toLowerCase()]
    const [d, y] = [Number(dayFirst[1]), Number(dayFirst[3])]
    if (m && isRealYmd(y, m, d)) return { ok: true, value: ymd(y, m, d) }
    return { ok: false, reason: `Date is not a real calendar date. ${DATE_HELP}` }
  }

  // Dec 10, 2026 and December 10 2026
  const monthFirst = /^([A-Za-z]{3,9})\.?[\s\-/]+(\d{1,2})(?:st|nd|rd|th)?[\s\-/,]+(\d{4})$/.exec(s)
  if (monthFirst) {
    const m = MONTHS[monthFirst[1].toLowerCase()]
    const [d, y] = [Number(monthFirst[2]), Number(monthFirst[3])]
    if (m && isRealYmd(y, m, d)) return { ok: true, value: ymd(y, m, d) }
    return { ok: false, reason: `Date is not a real calendar date. ${DATE_HELP}` }
  }

  // An Excel date serial.
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Math.floor(Number(s))
    if (n > 60 && n < 200000) {
      const dt = new Date(EXCEL_EPOCH_MS + n * 86_400_000)
      return {
        ok: true,
        value: ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()),
        note: `The spreadsheet stored this as a number, and it was read as ${ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())}.`,
      }
    }
    return { ok: false, reason: `Date is not a real calendar date. ${DATE_HELP}` }
  }

  // Ambiguous on purpose: 04/11/2026 means two different days to two schedulers.
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(s)) {
    return { ok: false, reason: `This date could be read two ways, so it was not guessed. ${DATE_HELP}` }
  }

  return { ok: false, reason: `Date is not a calendar date we recognize. ${DATE_HELP}` }
}
