import 'server-only'
import type { Payload } from 'payload'

/*
 * The season dashboard: what needs attention right now, counted live, each one
 * click from the screen that fixes it.
 *
 * Everything here is a count query rather than a fetch of the rows, so the home
 * screen stays fast on a season with thousands of games.
 */

export type AttentionItem = {
  key: string
  /** What the number means, in the words a volunteer would use. */
  label: string
  count: number
  href: string
  /** What to do about it. Shown under the number. */
  action: string
  tone: 'urgent' | 'todo' | 'calm'
}

export type SeasonSnapshot = {
  items: AttentionItem[]
  totals: { games: number; published: number; teams: number; officials: number }
  allClear: boolean
}

async function countOf(payload: Payload, collection: string, where: Record<string, unknown>): Promise<number> {
  const res = await payload.count({ collection: collection as never, where: where as never, overrideAccess: true }).catch(() => null)
  if (res && typeof res.totalDocs === 'number') return res.totalDocs
  // count is the cheap path; fall back to a limit-0 find if it is unavailable.
  const f = await payload.find({ collection: collection as never, where: where as never, limit: 0, depth: 0, overrideAccess: true }).catch(() => null)
  return f?.totalDocs ?? 0
}

export async function loadSeasonSnapshot(payload: Payload): Promise<SeasonSnapshot> {
  const now = new Date().toISOString()

  const [contested, awaitingConfirm, unpublished, upcoming, draftBrackets, totalGames, publishedGames, teams, officials] = await Promise.all([
    countOf(payload, 'games', { status: { equals: 'contested' } }),
    countOf(payload, 'games', { status: { equals: 'reported' } }),
    countOf(payload, 'games', { and: [{ publishState: { equals: 'draft' } }, { isBye: { not_equals: true } }] }),
    countOf(payload, 'games', {
      and: [{ isBye: { not_equals: true } }, { startAt: { greater_than_equal: now } }, { status: { in: ['scheduled', 'reported'] } }],
    }),
    countOf(payload, 'playoff-brackets', { publishState: { equals: 'draft' } }),
    countOf(payload, 'games', { isBye: { not_equals: true } }),
    countOf(payload, 'games', { and: [{ publishState: { equals: 'published' } }, { isBye: { not_equals: true } }] }),
    countOf(payload, 'teams', {}),
    countOf(payload, 'officials', { active: { not_equals: false } }),
  ])

  /*
   * Games with nobody officiating them. There is no flag for this, so it is the
   * upcoming games minus the ones that already have an assignment. The assignment
   * ids are fetched at depth 0 and deduped, which stays cheap because it is only
   * the assignments, not the games.
   */
  const assignedRows = await payload
    .find({ collection: 'game-officials', depth: 0, limit: 5000, overrideAccess: true })
    .catch(() => ({ docs: [] as unknown[] }))
  const assignedGameIds = new Set(
    (assignedRows.docs as Array<{ game?: unknown }>).map((r) => (r.game && typeof r.game === 'object' ? (r.game as { id: unknown }).id : r.game)).map(String),
  )
  const upcomingRows = await payload
    .find({
      collection: 'games',
      where: { and: [{ isBye: { not_equals: true } }, { startAt: { greater_than_equal: now } }, { status: { in: ['scheduled', 'reported'] } }] },
      depth: 0,
      limit: 3000,
      overrideAccess: true,
    })
    .catch(() => ({ docs: [] as unknown[] }))
  const unstaffed = (upcomingRows.docs as Array<{ id: unknown }>).filter((g) => !assignedGameIds.has(String(g.id))).length

  const items: AttentionItem[] = [
    {
      key: 'contested',
      label: 'Contested results',
      count: contested,
      href: '/manage/contested',
      action: 'Two teams disagree about a score. Decide each one.',
      tone: 'urgent',
    },
    {
      key: 'awaiting',
      label: 'Waiting for the other team',
      count: awaitingConfirm,
      href: '/manage/contested',
      action: 'One team reported a score and the other has not confirmed it.',
      tone: 'todo',
    },
    {
      key: 'unstaffed',
      label: 'Upcoming games with no officials',
      count: unstaffed,
      href: '/manage/officials?unstaffed=1',
      action: 'Staff them on the assignment board, a whole weekend at a time.',
      tone: unstaffed > 0 ? 'urgent' : 'calm',
    },
    {
      key: 'unpublished',
      label: 'Games not on the public site',
      count: unpublished,
      href: '/manage/schedule?publish=draft',
      action: 'Families cannot see these yet. Publish the ones that are settled.',
      tone: 'todo',
    },
    {
      key: 'draft-brackets',
      label: 'Brackets still in draft',
      count: draftBrackets,
      href: '/manage/brackets',
      action: 'Publish a bracket to put its playoff games on the public schedule.',
      tone: 'todo',
    },
    {
      key: 'upcoming',
      label: 'Games still to play',
      count: upcoming,
      href: '/manage/schedule',
      action: 'The rest of the season from today onward.',
      tone: 'calm',
    },
  ]

  return {
    items,
    totals: { games: totalGames, published: publishedGames, teams, officials },
    allClear: contested === 0 && unstaffed === 0 && awaitingConfirm === 0,
  }
}
