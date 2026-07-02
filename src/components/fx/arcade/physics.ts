import { GAME_CONFIG, type GameConfig } from './gameConfig'

/*
 * Pure, deterministic shot physics. No three.js and no React here so the game's
 * feel can be unit tested and so an outcome is known the instant the ball is
 * released (the scene just animates the returned path). "Making it" means the
 * ball's descending arc passes through a scoring sphere at the rim whose radius is
 * GAME_CONFIG.makeForgiveness. The hoop may be moving, so scoring checks the ball
 * against the rim's position AT THE MOMENT the ball is there, which makes a moving
 * hoop a fair timing-and-aim challenge rather than a coin flip.
 */
export interface Vec3 {
  x: number
  y: number
  z: number
}

export type ShotOutcome = 'make' | 'rim' | 'miss'

export interface ShotResult {
  outcome: ShotOutcome
  points: Vec3[] // sampled flight path for the scene to animate along
  minDist: number // closest approach to the rim centre while descending
  closestIndex: number
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const degToRad = (d: number) => (d * Math.PI) / 180
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

/** Launch velocity from aim (-1..1 left/right) and power (0..1) at the fixed arc angle. */
export function launchVelocity(aimX: number, power: number, cfg: GameConfig = GAME_CONFIG): Vec3 {
  const speed = cfg.minPower + (cfg.maxPower - cfg.minPower) * clamp01(power)
  const elev = degToRad(cfg.launchAngleDeg)
  const yaw = Math.max(-1, Math.min(1, aimX)) * degToRad(cfg.aimYawRangeDeg)
  const horizontal = speed * Math.cos(elev)
  return {
    x: horizontal * Math.sin(yaw),
    y: speed * Math.sin(elev),
    z: -horizontal * Math.cos(yaw), // forward is -z
  }
}

/** Added hoop distance for a streak (the hoop backs away as you get hot). */
export function distanceForStreak(streak: number, cfg: GameConfig = GAME_CONFIG): number {
  if (streak <= cfg.distanceStartStreak) return 0
  const steps = Math.floor((streak - cfg.distanceStartStreak) / cfg.distanceEveryStreak)
  return Math.min(cfg.distanceMax, steps * cfg.distancePerStep)
}

/** Side-to-side sway amplitude for a streak (0 until the ramp begins). */
export function swayAmplitudeForStreak(streak: number, cfg: GameConfig = GAME_CONFIG): number {
  if (streak < cfg.swayStartStreak) return 0
  return Math.min(cfg.swayRangeMax, (streak - cfg.swayStartStreak + 1) * cfg.swayRangePerStreak)
}

/** Crosswind acceleration magnitude for a streak (0 until the ramp begins). */
export function windForStreak(streak: number, cfg: GameConfig = GAME_CONFIG): number {
  if (streak < cfg.windStartStreak) return 0
  return Math.min(cfg.windMax, (streak - cfg.windStartStreak + 1) * cfg.windPerStreak)
}

/** Rim centre position at an absolute time, given the current streak's difficulty. */
export function hoopAt(time: number, streak: number, cfg: GameConfig = GAME_CONFIG): Vec3 {
  const amp = swayAmplitudeForStreak(streak, cfg)
  return {
    x: amp * Math.sin(time * cfg.swaySpeed),
    y: cfg.rimHeight,
    z: -(cfg.baseDistance + distanceForStreak(streak, cfg)),
  }
}

export interface SimulateOptions {
  /** Rim centre as a function of flight-relative time (moving hoop). */
  hoop: (t: number) => Vec3
  /** Constant crosswind acceleration along x (world units / s^2). */
  wind?: number
  cfg?: GameConfig
}

/**
 * Integrate one shot and classify it. Deterministic given its inputs. The scene
 * animates `points`; the HUD reveals `outcome` when the ball reaches the rim.
 */
export function simulateShot(start: Vec3, velocity: Vec3, opts: SimulateOptions): ShotResult {
  const cfg = opts.cfg ?? GAME_CONFIG
  const wind = opts.wind ?? 0
  const dt = cfg.dt
  const points: Vec3[] = []
  const p: Vec3 = { ...start }
  const v: Vec3 = { ...velocity }

  let minDist = Infinity
  let closestIndex = 0
  let descendingAtClosest = false

  for (let t = 0; t <= cfg.maxFlightTime; t += dt) {
    points.push({ x: p.x, y: p.y, z: p.z })
    const rim = opts.hoop(t)
    const d = distance(p, rim)
    if (d < minDist) {
      minDist = d
      closestIndex = points.length - 1
      descendingAtClosest = v.y < 0
    }
    // Stop once the ball has clearly dropped below the floor or passed behind the hoop.
    if (p.y < cfg.groundY - cfg.ballRadius && v.y < 0) break
    if (p.z < rim.z - cfg.ballRadius * 3 && v.y < 0) break

    // Integrate (semi-implicit Euler): gravity down, wind sideways.
    v.y -= cfg.gravity * dt
    v.x += wind * dt
    p.x += v.x * dt
    p.y += v.y * dt
    p.z += v.z * dt
  }

  let outcome: ShotOutcome = 'miss'
  if (descendingAtClosest && minDist <= cfg.makeForgiveness) outcome = 'make'
  else if (minDist <= cfg.makeForgiveness + cfg.rimBand) outcome = 'rim'

  return { outcome, points, minDist, closestIndex }
}

/** Convenience: launch + simulate against a static rim (used in tests and the scene). */
export function evaluateStaticShot(
  aimX: number,
  power: number,
  rim: Vec3,
  cfg: GameConfig = GAME_CONFIG,
  wind = 0,
): ShotResult {
  const start: Vec3 = { x: 0, y: cfg.startHeight, z: 0 }
  const velocity = launchVelocity(aimX, power, cfg)
  return simulateShot(start, velocity, { hoop: () => rim, wind, cfg })
}
