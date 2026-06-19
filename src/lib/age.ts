/*
 * Pure age helper, shared by the Users hooks and tests. A "minor" is anyone
 * under 18 by date of birth (the guardian-flow threshold).
 *
 * Uses UTC components throughout so date-only DOB strings (stored as UTC
 * midnight) aren't shifted a day by the server's local timezone.
 */
export function isUnder18(dob: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!dob) return false
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return false
  let age = now.getUTCFullYear() - d.getUTCFullYear()
  const m = now.getUTCMonth() - d.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--
  return age < 18
}
