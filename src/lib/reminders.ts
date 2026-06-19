/*
 * Pure selection logic for the certification expiry-reminder cron, kept separate
 * so the "selects the right records" rule is unit-testable. A reminder fires
 * once when a certification is exactly 60 / 30 / 7 days from expiry, and once on
 * the day it lapses (daysUntil === 0). Firing on exact day-counts means no
 * per-cert "last reminded" state is needed and users aren't spammed daily.
 */
import { daysUntil } from './certStatus'

export type ReminderBucket = '60' | '30' | '7' | 'lapsed'

export const REMINDER_DAYS = [60, 30, 7] as const

export function reminderBucketFor(
  expiryDate: string | Date | null | undefined,
  now: Date = new Date(),
): ReminderBucket | null {
  const d = daysUntil(expiryDate, now)
  if (d == null) return null
  if (d === 0) return 'lapsed'
  if (d === 60) return '60'
  if (d === 30) return '30'
  if (d === 7) return '7'
  return null
}
