import { describe, expect, it } from 'vitest'

import { GAME_CONFIG, type GameConfig } from '../gameConfig'
import {
  distanceForStreak,
  evaluateStaticShot,
  hoopAt,
  swayAmplitudeForStreak,
  windForStreak,
  type Vec3,
} from '../physics'

const rim = (): Vec3 => ({ x: 0, y: GAME_CONFIG.rimHeight, z: -GAME_CONFIG.baseDistance })

/** Count how many powers across [0,1] make a centred static shot. */
function makeablePowers(cfg: GameConfig = GAME_CONFIG, forgiveness = cfg.makeForgiveness): number {
  const c: GameConfig = { ...cfg, makeForgiveness: forgiveness }
  let makes = 0
  for (let p = 0; p <= 1.0001; p += 0.02) {
    if (evaluateStaticShot(0, p, rim(), c).outcome === 'make') makes++
  }
  return makes
}

describe('shot physics - playability', () => {
  it('has at least one making power for a centred free throw (the game is winnable)', () => {
    expect(makeablePowers()).toBeGreaterThan(0)
  })

  it('a wider scoring zone makes more shots land (forgiveness is a real knob)', () => {
    const narrow = makeablePowers(GAME_CONFIG, 0.3)
    const wide = makeablePowers(GAME_CONFIG, 0.8)
    expect(wide).toBeGreaterThan(narrow)
  })

  it('too little power falls short (a miss)', () => {
    expect(evaluateStaticShot(0, 0.0, rim()).outcome).not.toBe('make')
    expect(evaluateStaticShot(0, 0.05, rim()).outcome).not.toBe('make')
  })

  it('a hard left/right aim misses a centred hoop', () => {
    // Find a power that makes the centred shot, then push aim fully to the side.
    let madePower = -1
    for (let p = 0; p <= 1.0001; p += 0.02) {
      if (evaluateStaticShot(0, p, rim()).outcome === 'make') {
        madePower = p
        break
      }
    }
    expect(madePower).toBeGreaterThanOrEqual(0)
    expect(evaluateStaticShot(1, madePower, rim()).outcome).not.toBe('make')
    expect(evaluateStaticShot(-1, madePower, rim()).outcome).not.toBe('make')
  })
})

describe('difficulty ramp', () => {
  it('distance is flat until the ramp, then grows and caps', () => {
    expect(distanceForStreak(0)).toBe(0)
    expect(distanceForStreak(GAME_CONFIG.distanceStartStreak)).toBe(0)
    expect(distanceForStreak(GAME_CONFIG.distanceStartStreak + GAME_CONFIG.distanceEveryStreak)).toBeGreaterThan(0)
    expect(distanceForStreak(999)).toBeLessThanOrEqual(GAME_CONFIG.distanceMax)
  })

  it('sway is zero before the ramp, then grows and caps', () => {
    expect(swayAmplitudeForStreak(GAME_CONFIG.swayStartStreak - 1)).toBe(0)
    expect(swayAmplitudeForStreak(GAME_CONFIG.swayStartStreak)).toBeGreaterThan(0)
    expect(swayAmplitudeForStreak(999)).toBeLessThanOrEqual(GAME_CONFIG.swayRangeMax)
  })

  it('wind is zero before the ramp, then grows and caps', () => {
    expect(windForStreak(GAME_CONFIG.windStartStreak - 1)).toBe(0)
    expect(windForStreak(GAME_CONFIG.windStartStreak)).toBeGreaterThan(0)
    expect(windForStreak(999)).toBeLessThanOrEqual(GAME_CONFIG.windMax)
  })

  it('the hoop backs away and sways as the streak climbs', () => {
    const early = hoopAt(0, 0)
    const late = hoopAt(0, 999)
    expect(Math.abs(late.z)).toBeGreaterThan(Math.abs(early.z)) // farther away
    // Sway means x varies with time once past the sway ramp.
    const a = hoopAt(0, 999).x
    const b = hoopAt(1.0, 999).x
    expect(a).not.toBe(b)
  })
})
