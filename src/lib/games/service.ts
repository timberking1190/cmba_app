import type { Payload, PayloadRequest } from 'payload'

import { advanceBracketOnFinal } from '../brackets/service'
import type { ForfeitOutcome } from '../gameStateMachine'
import { isFinalized } from '../gameStateMachine'
import type { GameStatus } from '../scheduleUtils'
import { recomputeDivision } from '../standings'

// When called from inside a collection hook, the parent request (and its open
// transaction) is threaded through so nested writes join the same transaction.
// Without this, a nested write runs on a separate connection and deadlocks on the
// row the parent transaction already locked.
type Req = PayloadRequest | undefined

/*
 * The games service is the ONLY writer of a game's status, scores, publish state,
 * and forfeit. Reps never write a Game directly. Every change runs through here so
 * it appends to the change log, writes an append-only AuditLog row, and recomputes
 * the division standings when the game enters OR leaves the final/forfeit set.
 *
 * The report -> final transition (the rep confirm path, wired in B2) uses
 * transitionGame, a conditional update guarded on version AND status, so two
 * concurrent confirms racing one reported game produce exactly one final and one
 * 409, independent of any idempotency key.
 */

export type ActorUser = { id: string | number; email?: string | null }

const relId = (r: unknown): string | number | undefined => {
  if (r == null) return undefined
  if (typeof r === 'object') return (r as { id: string | number }).id
  return r as string | number
}

export async function writeAudit(
  payload: Payload,
  args: { actor?: ActorUser | null; action: string; entity: string; entityId: string | number; before?: unknown; after?: unknown; reason?: string },
  req?: Req,
): Promise<void> {
  await payload.create({
    collection: 'audit-log',
    overrideAccess: true,
    req,
    data: {
      actor: args.actor?.id,
      actorEmail: args.actor?.email ?? null,
      action: args.action,
      entity: args.entity,
      entityId: String(args.entityId),
      before: (args.before ?? null) as Record<string, unknown> | null,
      after: (args.after ?? null) as Record<string, unknown> | null,
      reason: args.reason ?? null,
      at: new Date().toISOString(),
    } as never,
  })
}

export async function recomputeForGame(payload: Payload, gameId: string | number, req?: Req): Promise<void> {
  const game = await payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true, req }).catch(() => null)
  if (!game) return
  const divId = relId((game as { division?: unknown }).division)
  if (divId != null) await recomputeDivision(payload, divId, req)
  // When a game becomes final, advance any playoff bracket it belongs to.
  if (isFinalized((game as { status?: GameStatus }).status ?? 'scheduled')) {
    await advanceBracketOnFinal(payload, gameId, req)
  }
}

/*
 * Conditional state transition. Updates the game only when its version AND status
 * still match what the caller read; 0 rows updated means another writer won the
 * race (the caller returns 409). This is the single serialization point for
 * finalizing a game.
 */
export async function transitionGame(
  payload: Payload,
  opts: { gameId: string | number; expectedVersion: number; fromStatus: GameStatus; toStatus: GameStatus; extraData?: Record<string, unknown> },
  req?: Req,
): Promise<{ ok: boolean }> {
  const res = await payload.update({
    collection: 'games',
    where: { and: [{ id: { equals: opts.gameId } }, { version: { equals: opts.expectedVersion } }, { status: { equals: opts.fromStatus } }] },
    data: { ...(opts.extraData ?? {}), status: opts.toStatus, version: opts.expectedVersion + 1 } as never,
    overrideAccess: true,
    req,
  })
  return { ok: Boolean((res as { docs?: unknown[] }).docs?.length) }
}

type GameDoc = {
  id: string | number
  status: GameStatus
  version?: number
  homeScore?: number | null
  awayScore?: number | null
  publishState?: string
  division?: unknown
  changeLog?: Array<Record<string, unknown>>
}

function diffChangeLog(game: GameDoc, patch: Record<string, unknown>, actor: ActorUser, reason: string) {
  const log = [...(game.changeLog ?? [])]
  for (const [field, to] of Object.entries(patch)) {
    if (typeof to === 'object') continue // only log scalar field changes
    const from = (game as unknown as Record<string, unknown>)[field]
    if (String(from ?? '') !== String(to ?? '')) {
      log.push({ at: new Date().toISOString(), actor: actor.id, actorEmail: actor.email ?? null, field, from: String(from ?? ''), to: String(to ?? ''), reason })
    }
  }
  return log
}

/*
 * Admin override of a game (edit, finalize, postpone, cancel, correct scores). The
 * caller (the override route) enforces that finalized games are super-admin only
 * and that a club admin is scoped to their own club. Recomputes standings when the
 * game enters or leaves the final/forfeit set.
 */
export async function adminOverride(
  payload: Payload,
  gameId: string | number,
  actor: ActorUser,
  patch: Record<string, unknown>,
  reason: string,
): Promise<{ ok: boolean }> {
  const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true }).catch(() => null)) as GameDoc | null
  if (!game) return { ok: false }

  const before = { status: game.status, homeScore: game.homeScore, awayScore: game.awayScore, publishState: game.publishState }
  const changeLog = diffChangeLog(game, patch, actor, reason)
  await payload.update({ collection: 'games', id: gameId, data: { ...patch, version: (game.version ?? 1) + 1, changeLog } as never, overrideAccess: true })
  await writeAudit(payload, { actor, action: 'game.override', entity: 'games', entityId: gameId, before, after: patch, reason })

  const wasFinal = isFinalized(game.status)
  const nowFinal = isFinalized(((patch.status as GameStatus) ?? game.status))
  if (wasFinal || nowFinal) await recomputeForGame(payload, gameId)
  return { ok: true }
}

export async function applyForfeit(
  payload: Payload,
  gameId: string | number,
  actor: ActorUser,
  outcome: ForfeitOutcome,
  forfeitingTeamId: string | number | null,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  if ((outcome === 'home_forfeit' || outcome === 'away_forfeit') && forfeitingTeamId == null) {
    return { ok: false, error: 'A forfeiting team is required for a one-sided forfeit.' }
  }
  const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true }).catch(() => null)) as GameDoc | null
  if (!game) return { ok: false }

  await payload.update({
    collection: 'games',
    id: gameId,
    data: {
      status: 'forfeit',
      forfeit: { isForfeit: true, outcome, forfeitingTeam: forfeitingTeamId ?? undefined, reason },
      version: (game.version ?? 1) + 1,
      changeLog: [
        ...(game.changeLog ?? []),
        { at: new Date().toISOString(), actor: actor.id, actorEmail: actor.email ?? null, field: 'status', from: game.status, to: 'forfeit', reason },
      ],
    } as never,
    overrideAccess: true,
  })
  await writeAudit(payload, { actor, action: 'game.forfeit', entity: 'games', entityId: gameId, before: { status: game.status }, after: { status: 'forfeit', outcome }, reason })
  await recomputeForGame(payload, gameId)
  return { ok: true }
}

export async function setPublishState(
  payload: Payload,
  gameId: string | number,
  actor: ActorUser,
  publishState: 'draft' | 'published',
): Promise<{ ok: boolean }> {
  const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 0, overrideAccess: true }).catch(() => null)) as GameDoc | null
  if (!game) return { ok: false }
  await payload.update({ collection: 'games', id: gameId, data: { publishState, version: (game.version ?? 1) + 1 } as never, overrideAccess: true })
  await writeAudit(payload, { actor, action: publishState === 'published' ? 'game.publish' : 'game.draft', entity: 'games', entityId: gameId, before: { publishState: game.publishState }, after: { publishState }, reason: '' })
  // Publishing or unpublishing a finalized game changes what the public standings include.
  if (isFinalized(game.status)) await recomputeForGame(payload, gameId)
  return { ok: true }
}
