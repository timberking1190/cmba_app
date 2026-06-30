import type { Payload } from 'payload'

/*
 * Resolve the team ids a user is a VERIFIED member of. Used by the async access
 * functions on Games, ScoreReports, ScoresheetFiles, and Confirmations to scope
 * reads to the teams a rep actually represents, and by the rep dashboard. Runs as
 * a trusted server query (overrideAccess) but only ever returns the requester's
 * own verified team ids, so it never widens what they can see beyond their teams.
 */
export async function getVerifiedTeamIds(payload: Payload, userId: string | number): Promise<(string | number)[]> {
  const res = await payload.find({
    collection: 'team-memberships',
    where: { and: [{ user: { equals: userId } }, { verified: { equals: true } }] },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  const ids: (string | number)[] = []
  for (const d of res.docs as Array<{ team?: string | number | { id: string | number } | null }>) {
    const t = d.team
    if (t == null) continue
    ids.push(typeof t === 'object' ? t.id : t)
  }
  return ids
}

/*
 * The team ids a user is a VERIFIED member of WITH a specific role (rep, coach,
 * manager). Used by the challenge coach-verify route to authorize a verified coach
 * to verify submissions for teams they actually coach. Trusted server query
 * (overrideAccess) that only returns the requester's own role-scoped teams.
 */
export async function getVerifiedTeamIdsForRole(
  payload: Payload,
  userId: string | number,
  role: 'rep' | 'coach' | 'manager',
): Promise<(string | number)[]> {
  const res = await payload.find({
    collection: 'team-memberships',
    where: { and: [{ user: { equals: userId } }, { verified: { equals: true } }, { role: { equals: role } }] },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  const ids: (string | number)[] = []
  for (const d of res.docs as Array<{ team?: string | number | { id: string | number } | null }>) {
    const t = d.team
    if (t == null) continue
    ids.push(typeof t === 'object' ? t.id : t)
  }
  return ids
}

/*
 * The game ids a user can see private content for: every game one of their
 * verified teams plays in. Used by the scoresheet-photo read scope so a rep can
 * view photos for their own games and no others. Re-derived per request from the
 * CURRENT verified memberships, so a rep who is un-verified loses access at once.
 */
export async function getVerifiedGameIds(payload: Payload, userId: string | number): Promise<(string | number)[]> {
  const teamIds = await getVerifiedTeamIds(payload, userId)
  if (!teamIds.length) return []
  const res = await payload.find({
    collection: 'games',
    where: { or: [{ homeTeam: { in: teamIds } }, { awayTeam: { in: teamIds } }] },
    limit: 2000,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs.map((d) => d.id)
}
