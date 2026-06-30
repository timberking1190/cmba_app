/*
 * Shared audience taxonomy for CMBA Connect engagement features.
 *
 * Two related but distinct concepts:
 *  - Audience: the home/persona a member belongs to (athlete, coach, official,
 *    parent). Used by the role-based home (F4) and, later, the Badges catalog
 *    and recognition surfaces. This is the shared AUDIENCE list referenced by
 *    the Member-Value foundation.
 *  - Pathway audience: the certification pathway a user follows. Only coaches
 *    and officials have pathways today, so this is the narrower coach|official.
 *
 * `pathwayAudienceFor` centralises the coach > official > none ternary that was
 * duplicated in compliance.getUserProgress and the account page; `primaryAudience`
 * is the home-routing function for the role-based home.
 */

export type Audience = 'athlete' | 'coach' | 'official' | 'parent'

export const AUDIENCES: { label: string; value: Audience }[] = [
  { label: 'Athlete', value: 'athlete' },
  { label: 'Coach', value: 'coach' },
  { label: 'Official', value: 'official' },
  { label: 'Parent', value: 'parent' },
]

/** Certification-pathway audience. Only coaches and officials have pathways. */
export type PathwayAudience = 'coach' | 'official'

/**
 * The certification-pathway audience for a user, or undefined when they have
 * none (participants/parents). Centralises the coach > official > none ternary.
 */
export const pathwayAudienceFor = (
  roles: readonly string[] | null | undefined,
): PathwayAudience | undefined =>
  roles?.includes('coach') ? 'coach' : roles?.includes('official') ? 'official' : undefined

/**
 * The member's primary home audience, used to route the role-based home (F4).
 * Coach and official are role-derived. Athlete vs parent cannot be derived from
 * `roles` alone (there is no athlete/parent role), so a plain participant
 * resolves to 'athlete' here; the parent/guardian refinement lands with the
 * guardian-link + consent model (F0.5).
 */
export const primaryAudience = (roles: readonly string[] | null | undefined): Audience =>
  roles?.includes('coach')
    ? 'coach'
    : roles?.includes('official')
      ? 'official'
      : 'athlete'

/**
 * Every audience a user is eligible to earn badges in. A coach who is also an
 * official is eligible for both; a plain participant is an athlete. Parent is not
 * role-derivable (no parent role), so it is granted by the guardian-link flow,
 * not here. Used by the award engine to scope which badges a user can earn.
 */
export const eligibleAudiences = (roles: readonly string[] | null | undefined): Audience[] => {
  const out: Audience[] = []
  if (roles?.includes('coach')) out.push('coach')
  if (roles?.includes('official')) out.push('official')
  if (out.length === 0) out.push('athlete')
  return out
}
