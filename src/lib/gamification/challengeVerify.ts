/*
 * Pure authorization decision for verifying a challenge submission. A submission is
 * verifiable by an admin, or by a verified coach of the team on the submission. A
 * submission with no team can only be verified by an admin (a coach has nothing to
 * be scoped against). Kept pure so the trust boundary is unit-tested.
 */
export function canVerifyChallenge(opts: {
  isAdmin: boolean
  submissionTeamId?: string | number | null
  coachTeamIds: (string | number)[]
}): boolean {
  if (opts.isAdmin) return true
  if (opts.submissionTeamId == null) return false
  return opts.coachTeamIds.map(String).includes(String(opts.submissionTeamId))
}
