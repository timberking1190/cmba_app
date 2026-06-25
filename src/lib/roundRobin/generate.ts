/*
 * Pure round robin schedule generator (circle method) plus greedy slot assignment.
 * No I/O. For an odd number of teams a synthetic bye sentinel is added so the
 * circle method works; the team paired with the sentinel byes that round and is
 * emitted as a bye fixture with no opponent and no court, never as a real game.
 * The bye sentinel is filtered out BEFORE any home/away swap and before slot
 * assignment, so no generated game ever references it. The full set is always run
 * through detectConflicts before anything is committed.
 */

const BYE = '__BYE__'

export type Fixture = {
  round: number
  homeTeamId?: string | number
  awayTeamId?: string | number
  isBye?: boolean
  byeTeamId?: string | number
}

function singleLeg(teamIds: (string | number)[]): Fixture[] {
  const teams: (string | number)[] = [...teamIds]
  if (teams.length % 2 === 1) teams.push(BYE)
  const n = teams.length
  const rounds = n - 1
  const half = n / 2
  const out: Fixture[] = []

  let arr = [...teams]
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = arr[i]
      const away = arr[n - 1 - i]
      if (home === BYE) out.push({ round: r + 1, isBye: true, byeTeamId: away })
      else if (away === BYE) out.push({ round: r + 1, isBye: true, byeTeamId: home })
      else out.push({ round: r + 1, homeTeamId: home, awayTeamId: away })
    }
    // Rotate keeping the first element fixed.
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)]
  }
  return out
}

export function generateRoundRobin(teamIds: (string | number)[], opts: { double?: boolean } = {}): Fixture[] {
  const first = singleLeg(teamIds)
  if (!opts.double) return first

  const rounds = (teamIds.length % 2 === 1 ? teamIds.length + 1 : teamIds.length) - 1
  const second: Fixture[] = first.map((f) =>
    f.isBye
      ? { ...f, round: f.round + rounds }
      : { round: f.round + rounds, homeTeamId: f.awayTeamId, awayTeamId: f.homeTeamId },
  )
  return [...first, ...second]
}

export type Slot = { start: string; venueId: string | number; courtId: string | number }

/*
 * Greedily pack real (non-bye) fixtures into the available slots in time order,
 * skipping any slot whose calendar day is blacked out. Fixtures with no remaining
 * slot are returned as unplaceable warnings rather than being dropped silently.
 */
export function assignSlots(
  fixtures: Fixture[],
  slots: Slot[],
  opts: { blackoutDates?: string[] } = {},
): { scheduled: { fixture: Fixture; slot: Slot }[]; unplaceable: Fixture[] } {
  const blackout = new Set(opts.blackoutDates ?? [])
  const available = [...slots]
    .filter((s) => !blackout.has(s.start.slice(0, 10)))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  const real = fixtures.filter((f) => !f.isBye)
  const scheduled: { fixture: Fixture; slot: Slot }[] = []
  const unplaceable: Fixture[] = []

  let s = 0
  for (const f of real) {
    if (s < available.length) {
      scheduled.push({ fixture: f, slot: available[s] })
      s += 1
    } else {
      unplaceable.push(f)
    }
  }
  return { scheduled, unplaceable }
}
