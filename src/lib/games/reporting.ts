import type { Payload, PayloadRequest } from 'payload'

import { emailReportRequest } from '../emailEvents'
import { recomputeForGame, transitionGame, writeAudit } from './service'

/*
 * Orchestration for the rep reporting and confirmation flow, invoked from the
 * ScoreReports and Confirmations afterChange hooks. The collection hooks are the
 * hard authorization gate; this module drives the resulting game state transition.
 *
 * Reporting is RECONCILED, not decided from a single read: two reports submitted at
 * the same time each open a transaction that cannot see the other's uncommitted
 * row, so a one-shot decision would leave the game stuck at "reported" with a hidden
 * mismatch. Instead, after each report we re-read the committed state and apply the
 * right transition through transitionGame (the conditional version+status update);
 * if the conditional update loses a race, we retry, and by then the winning report
 * has committed so both reports are visible and we resolve final or contested
 * correctly. Every nested write threads the hook req to join the parent transaction.
 */

const relId = (r: unknown): string | number | undefined =>
  r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number)

type ReportDoc = {
  id: string | number
  game: unknown
  submittedForTeam: unknown
  homeScore: number
  awayScore: number
}

async function teamRepEmail(payload: Payload, teamId: string | number, req: PayloadRequest): Promise<string | null> {
  const res = await payload.find({
    collection: 'team-memberships',
    where: { and: [{ team: { equals: teamId } }, { verified: { equals: true } }] },
    depth: 1,
    limit: 10,
    overrideAccess: true,
    req,
  })
  for (const m of res.docs as Array<{ user?: { email?: string | null } | unknown }>) {
    const u = m.user
    if (u && typeof u === 'object' && 'email' in u && (u as { email?: string }).email) return (u as { email?: string }).email ?? null
  }
  return null
}

export async function onScoreReportCreated(req: PayloadRequest, report: ReportDoc): Promise<void> {
  await reconcileGame(req, relId(report.game))
}

async function reconcileGame(req: PayloadRequest, gameId: string | number | undefined): Promise<void> {
  if (gameId == null) return
  const payload = req.payload

  for (let attempt = 0; attempt < 4; attempt++) {
    const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true, req }).catch(() => null)) as
      | { status: string; version?: number; homeTeam?: unknown; awayTeam?: unknown }
      | null
    if (!game) return
    const st = game.status
    if (st !== 'scheduled' && st !== 'reported') return // already contested/final/etc: nothing to reconcile
    const home = relId(game.homeTeam)
    const away = relId(game.awayTeam)
    const version = game.version ?? 1

    const reportsRes = await payload.find({ collection: 'score-reports', where: { game: { equals: gameId } }, limit: 20, depth: 0, overrideAccess: true, req })
    const byTeam = new Map<string, ReportDoc>()
    for (const r of reportsRes.docs as ReportDoc[]) byTeam.set(String(relId(r.submittedForTeam)), r)

    if (byTeam.size >= 2) {
      const list = [...byTeam.values()]
      const a = byTeam.get(String(home)) ?? list[0]
      const b = byTeam.get(String(away)) ?? list[1]
      const match = a.homeScore === b.homeScore && a.awayScore === b.awayScore
      if (match) {
        const res = await transitionGame(payload, { gameId, expectedVersion: version, fromStatus: st as never, toStatus: 'final', extraData: { homeScore: a.homeScore, awayScore: a.awayScore } }, req)
        if (res.ok) {
          await writeAudit(payload, { actor: req.user as never, action: 'game.final.dual_match', entity: 'games', entityId: gameId, after: { homeScore: a.homeScore, awayScore: a.awayScore } }, req)
          await recomputeForGame(payload, gameId, req)
          return
        }
        continue // version changed under us; re-read and retry
      }
      // Mismatch: open a dispute (Disputes.afterChange sets contested + escalates).
      // Disputes dedupes open disputes per game, so concurrent paths collapse to one.
      await payload.create({ collection: 'disputes', overrideAccess: true, req, data: { game: gameId, raisedBy: req.user?.id, reason: 'The scores reported by the two teams do not match.', status: 'open' } as never }).catch(() => {})
      return
    }

    // Single report so far: move the game to reported with this report's scores and
    // ask the opposing rep to confirm.
    const only = [...byTeam.values()][0]
    if (!only) return
    if (st === 'reported') return // already reported; the opposing side will confirm
    const res = await transitionGame(payload, { gameId, expectedVersion: version, fromStatus: 'scheduled', toStatus: 'reported', extraData: { homeScore: only.homeScore, awayScore: only.awayScore } }, req)
    if (res.ok) {
      const opposingTeamId = String(home) === String(relId(only.submittedForTeam)) ? away : home
      const email = opposingTeamId != null ? await teamRepEmail(payload, opposingTeamId, req) : null
      await emailReportRequest(payload, { toEmail: email })
      return
    }
    // Another report won the scheduled->reported race; retry to handle dual entry.
  }
}

export async function onConfirmationCreated(req: PayloadRequest, confirmation: { scoreReport: unknown; decision: string; notes?: string | null }): Promise<void> {
  const payload = req.payload
  const reportId = relId(confirmation.scoreReport)
  if (reportId == null) return
  const report = (await payload.findByID({ collection: 'score-reports', id: reportId, depth: 0, overrideAccess: true, req }).catch(() => null)) as ReportDoc | null
  if (!report) return
  const gameId = relId(report.game)
  if (gameId == null) return
  const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true, req }).catch(() => null)) as { status: string; version?: number } | null
  if (!game) return

  if (confirmation.decision === 'confirmed') {
    if (game.status === 'reported') {
      const res = await transitionGame(payload, { gameId, expectedVersion: game.version ?? 1, fromStatus: 'reported', toStatus: 'final', extraData: { homeScore: report.homeScore, awayScore: report.awayScore } }, req)
      if (res.ok) {
        await writeAudit(payload, { actor: req.user as never, action: 'game.final.confirmed', entity: 'games', entityId: gameId, after: { homeScore: report.homeScore, awayScore: report.awayScore } }, req)
        await recomputeForGame(payload, gameId, req)
      }
    }
  } else {
    await payload.create({ collection: 'disputes', overrideAccess: true, req, data: { game: gameId, raisedBy: req.user?.id, reason: confirmation.notes || 'The opposing team requested a review.', status: 'open' } as never }).catch(() => {})
  }
}
