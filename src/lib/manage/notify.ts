import 'server-only'
import type { Payload } from 'payload'

/*
 * Telling the affected teams that a game changed.
 *
 * The rule from the brief: notifications degrade gracefully. If email is not
 * verified end to end, or SES is not reachable, the send is QUEUED and LOGGED
 * rather than failing the scheduler's action. A volunteer who moved forty games
 * must never see the whole thing fail because a mail server was slow.
 *
 * The queue is the audit log, with a distinct action, so an operator can see
 * exactly what would have gone out and to whom without a second system.
 */

export type GameChangeNotice = {
  gameId: string | number
  summary: string
  action: string
  actorEmail: string | null
}

const relId = (r: unknown): string | number | null =>
  r == null ? null : typeof r === 'object' ? ((r as { id: string | number }).id ?? null) : (r as string | number)

/*
 * Who hears about a changed game: the verified reps of the two teams. Teams
 * themselves carry no contact address, so the team memberships are the real
 * list. An unverified membership is skipped, because an unverified rep has not
 * proved they belong to that team.
 */
async function recipientsFor(payload: Payload, gameId: string | number): Promise<string[]> {
  const game = (await payload.findByID({ collection: 'games', id: gameId, depth: 1, overrideAccess: true }).catch(() => null)) as Record<string, unknown> | null
  if (!game) return []
  const teamIds = [relId(game.homeTeam), relId(game.awayTeam)].filter((v): v is string | number => v != null)
  if (!teamIds.length) return []

  const memberships = await payload
    .find({
      collection: 'team-memberships',
      where: { and: [{ team: { in: teamIds } }, { verified: { equals: true } }] },
      depth: 1,
      limit: 100,
      overrideAccess: true,
    })
    .catch(() => null)

  const out = new Set<string>()
  for (const m of (memberships?.docs ?? []) as unknown as Array<Record<string, unknown>>) {
    const user = m.user
    const email = user && typeof user === 'object' ? (user as { email?: string }).email : undefined
    if (email) out.add(email)
    else if (typeof m.invitedEmail === 'string' && m.invitedEmail) out.add(m.invitedEmail)
  }
  return Array.from(out)
}

/**
 * Queue a changed-game notice. Never throws, and never blocks the change that
 * caused it: a failure here is recorded and the scheduler's action still stands.
 */
export async function notifyGameChanged(payload: Payload, notice: GameChangeNotice): Promise<void> {
  try {
    const to = await recipientsFor(payload, notice.gameId)
    await payload.create({
      collection: 'audit-log',
      overrideAccess: true,
      data: {
        actorEmail: notice.actorEmail,
        action: 'notify.game.changed.queued',
        entity: 'games',
        entityId: String(notice.gameId),
        after: { to, summary: notice.summary, change: notice.action },
        reason: to.length ? 'Queued for the team contacts on this game.' : 'No team contact address on file, so nothing was sent.',
        at: new Date().toISOString(),
      } as never,
    })
  } catch (err) {
    // Logged, never rethrown. The scheduler's change is what matters.
    payload.logger?.warn?.(`[notify] could not queue a changed-game notice for game ${notice.gameId}: ${String(err)}`)
  }
}
