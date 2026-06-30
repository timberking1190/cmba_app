/*
 * Streak computation - pure (no DB). Streaks are a materialized view of XpEvents:
 * given the distinct active day keys (YYYY-MM-DD, UTC) a user has any XP event on,
 * compute the current and longest run of consecutive days. The current streak
 * counts back from the most recent active day ONLY if that day is today or
 * yesterday; otherwise the streak is broken and current is 0. This is the sole
 * source of streak truth, recomputed by the streak-rollup cron.
 */
export type StreakResult = {
  currentStreakDays: number
  longestStreakDays: number
  lastActiveDay: string | null
}

/** UTC date key (YYYY-MM-DD) for a date or ISO string. */
export function dayKey(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toISOString().slice(0, 10)
}

/** Shift a YYYY-MM-DD key by whole days, in UTC. */
function addDaysKey(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function computeStreakFromDays(dayKeys: string[], todayKey: string): StreakResult {
  const uniq = Array.from(new Set(dayKeys)).sort()
  if (uniq.length === 0) return { currentStreakDays: 0, longestStreakDays: 0, lastActiveDay: null }

  // Longest run of consecutive days anywhere in the history.
  let longest = 1
  let run = 1
  for (let i = 1; i < uniq.length; i++) {
    run = uniq[i] === addDaysKey(uniq[i - 1], 1) ? run + 1 : 1
    if (run > longest) longest = run
  }

  // Current run ending at the most recent active day, valid only if that day is
  // today or yesterday (else the streak has lapsed).
  const last = uniq[uniq.length - 1]
  let current = 0
  if (last === todayKey || last === addDaysKey(todayKey, -1)) {
    current = 1
    for (let i = uniq.length - 2; i >= 0; i--) {
      if (uniq[i] === addDaysKey(uniq[i + 1], -1)) current++
      else break
    }
  }

  return { currentStreakDays: current, longestStreakDays: longest, lastActiveDay: last }
}
