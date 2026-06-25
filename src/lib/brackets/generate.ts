/*
 * Pure single-elimination bracket generator. Given a ranked list of seed team ids
 * (rank 1 first), it builds a well-formed bracket: top seed plays the lowest seed,
 * the field is padded to the next power of two with byes, and the top seeds get the
 * byes. Each series records which series it feeds into so the advancement service
 * can wire winners forward. No I/O.
 */

export type SeedSeries = {
  round: number
  slot: number
  homeSeed?: number
  awaySeed?: number
  homeTeamId?: string | number | null
  awayTeamId?: string | number | null
  feedsInto?: number // index into the returned array
  feedsIntoSlot?: 'home' | 'away'
}

// Classic bracket seeding order for a power-of-two field (1 vs N, then balanced).
function seedOrder(size: number): number[] {
  let pairs = [1, 2]
  while (pairs.length < size) {
    const sum = pairs.length * 2 + 1
    const next: number[] = []
    for (const p of pairs) {
      next.push(p)
      next.push(sum - p)
    }
    pairs = next
  }
  return pairs
}

export function generateSingleElim(seedTeamIds: (string | number)[]): SeedSeries[] {
  const n = seedTeamIds.length
  if (n < 2) return []
  let size = 1
  while (size < n) size *= 2
  const rounds = Math.log2(size)
  const order = seedOrder(size)

  const series: SeedSeries[] = []
  const idx = new Map<string, number>()
  const at = (r: number, s: number) => idx.get(`${r}-${s}`)!

  for (let r = 1; r <= rounds; r++) {
    const count = size / Math.pow(2, r)
    for (let s = 0; s < count; s++) {
      idx.set(`${r}-${s}`, series.length)
      series.push({ round: r, slot: s })
    }
  }

  // Round 1 seeds and teams (a seed beyond n is a bye).
  for (let s = 0; s < size / 2; s++) {
    const homeSeed = order[2 * s]
    const awaySeed = order[2 * s + 1]
    const sr = series[at(1, s)]
    sr.homeSeed = homeSeed
    sr.awaySeed = awaySeed
    sr.homeTeamId = homeSeed <= n ? seedTeamIds[homeSeed - 1] : null
    sr.awayTeamId = awaySeed <= n ? seedTeamIds[awaySeed - 1] : null
  }

  // feedsInto wiring.
  for (let r = 1; r < rounds; r++) {
    const count = size / Math.pow(2, r)
    for (let s = 0; s < count; s++) {
      series[at(r, s)].feedsInto = at(r + 1, Math.floor(s / 2))
      series[at(r, s)].feedsIntoSlot = s % 2 === 0 ? 'home' : 'away'
    }
  }

  // Resolve round-1 byes: the present team advances into its next series slot.
  for (let s = 0; s < size / 2; s++) {
    const sr = series[at(1, s)]
    const oneNull = (sr.homeTeamId == null) !== (sr.awayTeamId == null)
    const present = sr.homeTeamId ?? sr.awayTeamId
    if (oneNull && present != null && sr.feedsInto != null) {
      const target = series[sr.feedsInto]
      if (sr.feedsIntoSlot === 'home') target.homeTeamId = present
      else target.awayTeamId = present
    }
  }

  return series
}
