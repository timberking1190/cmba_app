/*
 * GAME_CONFIG - every gameplay, physics, difficulty, and feedback value in one
 * place so tuning is fast and never means hunting through the scene code. All the
 * knobs from the tuning checklist live here. Units: world units (roughly metres),
 * seconds, and degrees. The playtest targets we tune toward:
 *   - A new player should make one of their first three shots.
 *   - A focused player usually reaches a streak of about 5 to 8 before it bites.
 *   - Streaks past about 12 to 15 are rare and earned.
 *   - One attempt from aim to result takes only a few seconds.
 *   - Difficulty should rise smoothly, so a run ends because it got hard.
 * See docs/VERIFICATION.md for the values that felt right after playtesting.
 */
export interface GameConfig {
  gravity: number
  launchAngleDeg: number
  dt: number
  maxFlightTime: number
  minPower: number
  maxPower: number
  powerFillPerSecond: number
  aimYawRangeDeg: number
  aimSensitivityPointer: number
  aimSensitivityKeyPerSecond: number
  ballRadius: number
  rimRadius: number
  rimHeight: number
  baseDistance: number
  startHeight: number
  groundY: number
  makeForgiveness: number
  rimBand: number
  rimRestitution: number
  backboardRestitution: number
  bounceFriction: number
  spinPerSecond: number
  swayStartStreak: number
  swaySpeed: number
  swayRangePerStreak: number
  swayRangeMax: number
  distanceStartStreak: number
  distanceEveryStreak: number
  distancePerStep: number
  distanceMax: number
  windStartStreak: number
  windPerStreak: number
  windMax: number
  shakeOnMake: number
  flashOnMake: boolean
  shakeOnMiss: number
  minQualifyingScore: number
}

export const GAME_CONFIG: GameConfig = {
  // Arc and gravity ---------------------------------------------------------
  gravity: 9.2, // higher is a flatter, faster fall; lower is floatier
  launchAngleDeg: 52, // fixed shot elevation; the arc's steepness
  dt: 1 / 120, // physics integration step
  maxFlightTime: 4, // safety cap on a single shot's simulation (seconds)

  // Power (maps the meter/charge to launch speed) ---------------------------
  minPower: 6.6, // launch speed at an empty meter
  maxPower: 9.6, // launch speed at a full meter (narrow range -> power noise matters less)
  powerFillPerSecond: 1.5, // how fast the charge meter fills (fraction per second)

  // Aim ---------------------------------------------------------------------
  aimYawRangeDeg: 26, // how far left/right full aim deflection points the shot
  aimSensitivityPointer: 1.0, // pointer/drag aim gain
  aimSensitivityKeyPerSecond: 1.3, // keyboard aim units per second held

  // Court geometry ----------------------------------------------------------
  ballRadius: 0.28,
  rimRadius: 0.42, // visual rim radius
  rimHeight: 3.05, // rim height above the floor
  baseDistance: 7.0, // starting hoop distance (the free-throw spot)
  startHeight: 1.9, // release height of the ball
  groundY: 0.0,

  // Make forgiveness (the scoring zone at the rim) --------------------------
  makeForgiveness: 0.9, // radius of the scoring sphere at the rim; widen to make early shots land
  rimBand: 0.32, // just outside the scoring zone reads as a rim rattle (still a miss)

  // Bounce (visual feel of a miss) ------------------------------------------
  rimRestitution: 0.55,
  backboardRestitution: 0.45,
  bounceFriction: 0.8,

  // Ball spin (visual) ------------------------------------------------------
  spinPerSecond: 6.0,

  // Difficulty ramp ---------------------------------------------------------
  swayStartStreak: 5, // streak at which the hoop starts sliding side to side
  swaySpeed: 1.35, // radians per second of the sway oscillation
  swayRangePerStreak: 0.14, // how much sway amplitude grows per make past the start
  swayRangeMax: 1.9, // cap on sway amplitude (world units)
  distanceStartStreak: 6, // streak at which the hoop starts moving back
  distanceEveryStreak: 2, // add distance every N makes past the start
  distancePerStep: 0.45, // world units added per step
  distanceMax: 3.4, // cap on total added distance
  windStartStreak: 8, // streak at which a light crosswind appears
  windPerStreak: 0.07, // horizontal acceleration added per make past the start
  windMax: 0.75, // cap on wind acceleration

  // Feedback ----------------------------------------------------------------
  shakeOnMake: 0.5, // screen-shake amount on a make (0..1); calm mode zeroes this
  flashOnMake: true, // brief flash on a make; calm mode disables
  shakeOnMiss: 0.25,

  // Qualifying for the table ------------------------------------------------
  minQualifyingScore: 1, // must make at least this many to enter a name
}

// Calm mode (prefers-reduced-motion or the in-game toggle) tones down motion.
export function calmConfig(cfg: GameConfig): GameConfig {
  return { ...cfg, shakeOnMake: 0, shakeOnMiss: 0, flashOnMake: false, spinPerSecond: cfg.spinPerSecond * 0.4 }
}
