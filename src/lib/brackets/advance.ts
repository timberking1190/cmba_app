/*
 * Who advances out of a bracket matchup, and when we deliberately do not decide.
 * Pure, no I/O, so every rule below is testable and the service and the screens
 * agree on the wording.
 *
 * The rules the league asked for:
 *  - A final with a winning score advances that team.
 *  - A one sided forfeit advances the team that did NOT forfeit.
 *  - A double forfeit or a no contest advances nobody. Someone has to decide.
 *  - A contested result advances nobody until it is resolved.
 *  - A tie in a playoff game advances nobody. Playoff games are not drawn.
 *  - If a game that already advanced someone stops being final, the advancement
 *    is retracted, so a correction cannot leave a ghost team in the next round.
 */

export type BracketGameLike = {
  status: string
  homeScore?: number | null
  awayScore?: number | null
  homeTeamId?: string | number | null
  awayTeamId?: string | number | null
  forfeit?: { outcome?: string | null; forfeitingTeam?: string | number | null } | null
}

export type AdvanceDecision =
  | { kind: 'advance'; winnerTeamId: string | number; because: string }
  | { kind: 'hold'; because: string }
  | { kind: 'retract'; because: string }

const key = (v: unknown) => (v == null ? '' : String(v))

export function decideSeriesWinner(game: BracketGameLike): AdvanceDecision {
  const { status } = game

  if (status === 'contested') {
    return { kind: 'retract', because: 'This result is contested, so nobody advances until it is resolved.' }
  }
  if (status === 'cancelled') {
    return { kind: 'retract', because: 'This game was cancelled, so nobody advances. Reschedule it or decide the matchup by hand.' }
  }
  if (status === 'postponed') {
    return { kind: 'retract', because: 'This game was postponed, so nobody advances until it is played.' }
  }

  if (status === 'forfeit') {
    const outcome = game.forfeit?.outcome ?? null
    if (outcome === 'double_forfeit') {
      return { kind: 'retract', because: 'Both teams forfeited, so nobody advances. Choose who goes through by hand.' }
    }
    if (outcome === 'no_contest') {
      return { kind: 'retract', because: 'This game was recorded as no contest, so nobody advances. Choose who goes through by hand.' }
    }
    const forfeiting = key(game.forfeit?.forfeitingTeam)
    const home = key(game.homeTeamId)
    const away = key(game.awayTeamId)
    if (!forfeiting || (forfeiting !== home && forfeiting !== away)) {
      return { kind: 'hold', because: 'This forfeit does not say which team forfeited, so nobody advances yet. Open the game and record who forfeited.' }
    }
    const winner = forfeiting === home ? game.awayTeamId : game.homeTeamId
    if (winner == null) return { kind: 'hold', because: 'This matchup does not have both teams yet, so nobody advances.' }
    return { kind: 'advance', winnerTeamId: winner, because: 'The other team forfeited.' }
  }

  if (status === 'final') {
    const { homeScore: h, awayScore: a } = game
    if (h == null || a == null) {
      return { kind: 'hold', because: 'This game is final but has no score, so nobody advances yet. Add the score.' }
    }
    if (h === a) {
      return { kind: 'hold', because: 'This game is tied, and a playoff game cannot end tied. Correct the score or decide the matchup by hand.' }
    }
    const winner = h > a ? game.homeTeamId : game.awayTeamId
    if (winner == null) return { kind: 'hold', because: 'This matchup does not have both teams yet, so nobody advances.' }
    return { kind: 'advance', winnerTeamId: winner, because: 'They won the game.' }
  }

  // scheduled, reported, or anything else: not decided yet.
  return { kind: 'hold', because: 'This game has not finished yet.' }
}

/*
 * A bye is a matchup with exactly one team. The team present advances without
 * playing, and no game is ever created for it.
 */
export function isBye(series: { homeTeamId?: string | number | null; awayTeamId?: string | number | null }): boolean {
  const h = series.homeTeamId != null
  const a = series.awayTeamId != null
  return h !== a
}

export function byeWinner(series: { homeTeamId?: string | number | null; awayTeamId?: string | number | null }): string | number | null {
  if (!isBye(series)) return null
  return series.homeTeamId ?? series.awayTeamId ?? null
}

/** A matchup can only be played once both teams are known. */
export function isPlayable(series: { homeTeamId?: string | number | null; awayTeamId?: string | number | null }): boolean {
  return series.homeTeamId != null && series.awayTeamId != null
}

export type RoundName = string

/**
 * Human round names counted back from the last round: Final, Semi finals, and so
 * on. A first time scheduler should never have to work out what "round 3" means.
 */
export function roundName(round: number, totalRounds: number): RoundName {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semi finals'
  if (fromEnd === 2) return 'Quarter finals'
  return `Round ${round}`
}
