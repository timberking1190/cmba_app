/*
 * Headless playtest harness. Models players of two skill levels as gaussian noise
 * on aim and power, plus timing error against the swaying hoop, and reports the
 * make rate per streak and the streak distribution over many runs. Used to tune
 * GAME_CONFIG toward the targets in docs/VERIFICATION.md. Run: npx tsx scripts/arcade-playtest.ts
 */
import { GAME_CONFIG as C } from '../src/components/fx/arcade/gameConfig'
import {
  distanceForStreak,
  evaluateStaticShot,
  swayAmplitudeForStreak,
  windForStreak,
  type Vec3,
} from '../src/components/fx/arcade/physics'

function gauss(sd: number): number {
  // Box-Muller
  const u = 1 - Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd
}

function idealPower(streak: number): number {
  const z = -(C.baseDistance + distanceForStreak(streak))
  const rim: Vec3 = { x: 0, y: C.rimHeight, z }
  const making: number[] = []
  for (let p = 0; p <= 1.0001; p += 0.01) {
    if (evaluateStaticShot(0, p, rim).outcome === 'make') making.push(p)
  }
  if (making.length) return making[Math.floor(making.length / 2)] // centre of the making band
  // No make possible: return the power with the closest approach.
  let best = 0.5
  let bestDist = Infinity
  for (let p = 0; p <= 1.0001; p += 0.01) {
    const r = evaluateStaticShot(0, p, rim)
    if (r.minDist < bestDist) {
      bestDist = r.minDist
      best = p
    }
  }
  return best
}

function shotMakes(streak: number, aimSd: number, powerSd: number): boolean {
  const z = -(C.baseDistance + distanceForStreak(streak))
  // Timing error against the sway: where the hoop is when the ball arrives.
  const amp = swayAmplitudeForStreak(streak)
  const timing = gauss(0.6) // radians of release-timing error
  const hoopX = amp === 0 ? 0 : amp * Math.sin(timing)
  const rim: Vec3 = { x: hoopX, y: C.rimHeight, z }
  const aim = gauss(aimSd)
  const power = Math.max(0, Math.min(1, idealPower(streak) + gauss(powerSd)))
  const wind = windForStreak(streak) * (Math.random() < 0.5 ? -1 : 1)
  return evaluateStaticShot(aim, power, rim, C, wind).outcome === 'make'
}

function run(aimSd: number, powerSd: number): number {
  let streak = 0
  for (let i = 0; i < 200; i++) {
    if (shotMakes(streak, aimSd, powerSd)) streak++
    else break
  }
  return streak
}

function report(label: string, aimSd: number, powerSd: number) {
  const N = 4000
  const streaks: number[] = []
  for (let i = 0; i < N; i++) streaks.push(run(aimSd, powerSd))
  streaks.sort((a, b) => a - b)
  const avg = streaks.reduce((s, x) => s + x, 0) / N
  const max = streaks[N - 1]
  const median = streaks[Math.floor(N / 2)]
  const p90 = streaks[Math.floor(N * 0.9)]
  const reach = (t: number) => ((streaks.filter((s) => s >= t).length / N) * 100).toFixed(1)
  // First-three make rate for a fresh player (streak 0 make prob, 3 tries).
  let firstMakes = 0
  for (let i = 0; i < N; i++) if (shotMakes(0, aimSd, powerSd)) firstMakes++
  const p0 = firstMakes / N
  const oneOfThree = (1 - (1 - p0) ** 3) * 100
  console.log(`\n${label} (aimSd=${aimSd}, powerSd=${powerSd})`)
  console.log(`  first-shot make rate: ${(p0 * 100).toFixed(1)}%   one-of-first-three: ${oneOfThree.toFixed(1)}%`)
  console.log(`  avg streak: ${avg.toFixed(2)}   median: ${median}   p90: ${p90}   max: ${max}`)
  console.log(`  reach >=5: ${reach(5)}%   >=8: ${reach(8)}%   >=12: ${reach(12)}%   >=15: ${reach(15)}%`)
}

console.log('Arcade physics playtest (deterministic engine, noisy players)')
report('New player', 0.28, 0.16)
report('Focused player', 0.14, 0.08)
