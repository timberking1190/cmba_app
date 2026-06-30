import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/auth'
import { checkCronAuth } from '@/lib/cron'
import { XP_REWARDS } from '@/lib/gamification'
import { awardXp } from '@/lib/gamification/engine'
import { computeStreakFromDays, dayKey } from '@/lib/gamification/streaks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const ledgerEnabled = () => process.env.FEATURE_GAMIFICATION_LEDGER === 'true'

const relId = (r: unknown): number | string | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: number | string }).id : (r as number | string)

/*
 * Nightly: recompute each active user's streak from their XP-event days (Streaks
 * is a pure materialized view of XpEvents, and this cron is its SOLE writer), and
 * award the 7-day / 30-day streak bonuses once per user (idempotent on dedupeKey).
 * Skips entirely unless FEATURE_GAMIFICATION_LEDGER is on, so it never queries the
 * engagement tables in an environment where they are dormant. Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  const denied = checkCronAuth(req)
  if (denied) return denied
  if (!ledgerEnabled()) return NextResponse.json({ skipped: 'FEATURE_GAMIFICATION_LEDGER is off' })

  const payload = await getPayloadClient()
  const now = new Date()
  const todayKey = dayKey(now)

  // Gather distinct active days per user from the XP ledger.
  const byUser = new Map<string, { id: number | string; days: Set<string> }>()
  const pageSize = 500
  let page = 1
  for (;;) {
    const res = await payload.find({ collection: 'xp-events', depth: 0, limit: pageSize, page, overrideAccess: true })
    for (const ev of res.docs) {
      const id = relId((ev as { user?: unknown }).user)
      if (id == null) continue
      const key = String(id)
      const entry = byUser.get(key) ?? { id, days: new Set<string>() }
      entry.days.add(dayKey((ev as { occurredAt: string }).occurredAt))
      byUser.set(key, entry)
    }
    if (page >= res.totalPages) break
    page++
  }

  let usersProcessed = 0
  let streaksWritten = 0
  let bonusesAwarded = 0

  for (const { id, days } of byUser.values()) {
    usersProcessed++
    const streak = computeStreakFromDays([...days], todayKey)

    const existing = await payload.find({ collection: 'streaks', where: { user: { equals: id } }, limit: 1, depth: 0, overrideAccess: true })
    if (existing.docs[0]) {
      const prevLongest = (existing.docs[0] as { longestStreakDays?: number | null }).longestStreakDays ?? 0
      await payload.update({
        collection: 'streaks',
        id: existing.docs[0].id,
        overrideAccess: true,
        data: { currentStreakDays: streak.currentStreakDays, longestStreakDays: Math.max(prevLongest, streak.longestStreakDays), lastActiveDay: streak.lastActiveDay } as never,
      })
    } else {
      await payload.create({
        collection: 'streaks',
        overrideAccess: true,
        data: { user: id, currentStreakDays: streak.currentStreakDays, longestStreakDays: streak.longestStreakDays, lastActiveDay: streak.lastActiveDay, streakKind: 'activity' } as never,
      })
    }
    streaksWritten++

    // Streak bonuses are fun-only and granted once per user per threshold.
    if (streak.currentStreakDays >= 7) {
      const r = await awardXp(payload, { user: id, kind: 'streak_bonus', amount: XP_REWARDS.streakBonus7, counts: 'fun_only', verified: false, dedupeKey: `streak7:${id}` })
      if (r.created) bonusesAwarded++
    }
    if (streak.currentStreakDays >= 30) {
      const r = await awardXp(payload, { user: id, kind: 'streak_bonus', amount: XP_REWARDS.streakBonus30, counts: 'fun_only', verified: false, dedupeKey: `streak30:${id}` })
      if (r.created) bonusesAwarded++
    }
  }

  const summary = { usersProcessed, streaksWritten, bonusesAwarded, ranAt: now.toISOString() }
  payload.logger.info(`[cron] streak-rollup ${JSON.stringify(summary)}`)
  return NextResponse.json(summary)
}
