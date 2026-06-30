/*
 * The single sanctioned display-name helper for any NON-OWNER surface.
 *
 * For a minor (Users.isMinor) a non-owner may only ever see a privacy-safe name:
 * first name + last initial (e.g. "Jordan M."), or a team handle. The full name
 * of a minor is never shown publicly or to other members; only the owner/guardian
 * and admins see it. This replaces the ad-hoc name splitting in PersonalizedStrip
 * and MUST be used by every roster, leaderboard, player-card, and recognition
 * surface that renders someone other than the viewer.
 *
 * Callers (especially server pages) MUST pass the authoritative `isMinor` from a
 * server fetch, never a cached or client-supplied prop.
 */

export type NameUserLike = {
  fullName?: string | null
  preferredName?: string | null
  isMinor?: boolean | null
}

const bestName = (user: NameUserLike): string => (user.preferredName || user.fullName || '').trim()

/** First token of the best available name (preferred name wins over full name). */
export function firstName(user: NameUserLike): string {
  return bestName(user).split(/\s+/).filter(Boolean)[0] ?? ''
}

/**
 * A name safe to show to anyone.
 *
 *  - Minor: forced to "First L." (first name + last initial). If a `teamHandle`
 *    is supplied it is used instead, for surfaces where even a first name is too
 *    much (e.g. cross-team leaderboards). Falls back to "Player" when no name is
 *    available.
 *  - Adult: returns the preferred/full name as given (adults may be shown fully).
 */
export function privacySafeName(user: NameUserLike, opts?: { teamHandle?: string | null }): string {
  const full = bestName(user)
  if (!user.isMinor) return full
  if (opts?.teamHandle) return opts.teamHandle
  const parts = full.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Player'
  const first = parts[0]
  const last = parts[parts.length - 1]
  const lastInitial = parts.length > 1 && last ? last[0].toUpperCase() : ''
  return lastInitial ? `${first} ${lastInitial}.` : first
}
