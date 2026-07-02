'use client'

import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ArcadeScene, type ActiveShot } from './ArcadeScene'
import styles from './ArcadeGame.module.css'
import { GAME_CONFIG } from './gameConfig'
import { checkName, INITIALS_LEN } from '@/lib/arcade/nameFilter'
import {
  distanceForStreak,
  launchVelocity,
  simulateShot,
  windForStreak,
  type ShotOutcome,
} from './physics'
import { ArcadeAudio } from './sound'
import { TurnstileWidget } from '@/components/security/TurnstileWidget'
import { useArcadeScores } from './useArcadeScores'

const C = GAME_CONFIG
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const TOP_N = 10
const SOUND_KEY = 'cmba_arcade_sound'
const CALM_KEY = 'cmba_arcade_calm'

type Phase = 'attract' | 'ready' | 'shooting' | 'result' | 'gameover' | 'entry' | 'submitted'

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}

export function ArcadeGame() {
  const { scores, submit, report } = useArcadeScores(TOP_N)

  const [phase, setPhase] = useState<Phase>('attract')
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [finalStreak, setFinalStreak] = useState(0)
  const [lastOutcome, setLastOutcome] = useState<ShotOutcome | null>(null)
  const [activeShot, setActiveShot] = useState<ActiveShot | null>(null)
  const [power, setPower] = useState(0)
  const [initials, setInitials] = useState<string[]>(['A', 'A', 'A'])
  const [cursor, setCursor] = useState(0)
  const [entryMsg, setEntryMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newEntryId, setNewEntryId] = useState<number | null>(null)
  const [announce, setAnnounce] = useState('')
  const [shakeOn, setShakeOn] = useState(false)
  const [flashOn, setFlashOn] = useState(false)

  const [reducedMotion, setReducedMotion] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [calmUser, setCalmUser] = useState(false)
  const calm = calmUser || reducedMotion

  const aimXRef = useRef(0)
  const powerRef = useRef(0)
  const hoopXRef = useRef(0)
  const chargingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef(0)
  const shotSeqRef = useRef(0)
  const phaseRef = useRef<Phase>('attract')
  const streakRef = useRef(0)
  const audioRef = useRef<ArcadeAudio | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)
  const timersRef = useRef<number[]>([])
  const initialsRef = useRef<string[]>(['A', 'A', 'A']) // mirrors initials for imperative reads

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(() => {
    streakRef.current = streak
  }, [streak])
  useEffect(() => {
    initialsRef.current = initials
  }, [initials])

  // Init preferences + audio + reduced-motion.
  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const s = readBool(SOUND_KEY, false)
    const cm = readBool(CALM_KEY, false)
    setSoundOn(s)
    setCalmUser(cm)
    audioRef.current = new ArcadeAudio()
    audioRef.current.setEnabled(s)
    const timers = timersRef.current // stable array; cleared on unmount
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timersRef.current.push(id)
  }, [])

  const audio = () => audioRef.current

  const stopCharge = useCallback(() => {
    chargingRef.current = false
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const shoot = useCallback(
    (p: number) => {
      const st = streakRef.current
      const rim = { x: hoopXRef.current, y: C.rimHeight, z: -(C.baseDistance + distanceForStreak(st)) }
      const dir = shotSeqRef.current % 2 === 0 ? 1 : -1
      const wind = windForStreak(st) * dir
      const vel = launchVelocity(aimXRef.current, p)
      const result = simulateShot({ x: 0, y: C.startHeight, z: 0 }, vel, { hoop: () => rim, wind })
      shotSeqRef.current += 1
      setActiveShot({ id: shotSeqRef.current, points: result.points, outcome: result.outcome })
      setPhase('shooting')
      setPower(0)
      powerRef.current = 0
      audio()?.shoot()
    },
    [],
  )

  const startCharge = useCallback(() => {
    if (chargingRef.current) return
    chargingRef.current = true
    powerRef.current = 0
    setPower(0)
    lastTsRef.current = performance.now()
    const tick = (ts: number) => {
      if (!chargingRef.current) return
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000)
      lastTsRef.current = ts
      powerRef.current = Math.min(1, powerRef.current + C.powerFillPerSecond * dt)
      setPower(powerRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const releaseCharge = useCallback(() => {
    if (!chargingRef.current) return
    const p = powerRef.current
    stopCharge()
    shoot(p)
  }, [shoot, stopCharge])

  const beginRun = useCallback(() => {
    setStreak(0)
    streakRef.current = 0
    setFinalStreak(0)
    setLastOutcome(null)
    setActiveShot(null)
    setNewEntryId(null)
    setPhase('ready')
    audio()?.start()
    containerRef.current?.focus()
  }, [])

  const qualifies = useCallback(
    (score: number): boolean => {
      if (score < C.minQualifyingScore) return false
      if (scores.length < TOP_N) return true
      const lowest = scores[scores.length - 1]?.score ?? 0
      return score > lowest
    },
    [scores],
  )

  const endRun = useCallback(() => {
    const finalS = streakRef.current
    setFinalStreak(finalS)
    setAnnounce(`Missed. Game over. Streak ${finalS}.`)
    audio()?.gameover()
    if (qualifies(finalS)) {
      setInitials(['A', 'A', 'A'])
      setCursor(0)
      setEntryMsg('')
      setPhase('entry')
    } else {
      setPhase('gameover')
    }
  }, [qualifies])

  const onArrived = useCallback(
    (outcome: ShotOutcome) => {
      setLastOutcome(outcome)
      if (outcome === 'make') {
        const next = streakRef.current + 1
        streakRef.current = next
        setStreak(next)
        setBest((b) => Math.max(b, next))
        setAnnounce(`Made it. Streak ${next}.`)
        audio()?.make()
        if (!calm) {
          setShakeOn(true)
          if (C.flashOnMake) setFlashOn(true)
          later(() => setShakeOn(false), 340)
          later(() => setFlashOn(false), 300)
        }
        setPhase('result')
        later(() => {
          setActiveShot(null)
          setPhase('ready')
        }, 650)
      } else {
        audio()?.[outcome === 'rim' ? 'rim' : 'miss']()
        setPhase('result')
        later(() => {
          setActiveShot(null)
          endRun()
        }, 900)
      }
    },
    [calm, endRun, later],
  )

  // ---- input ----
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'ready') return
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    aimXRef.current = Math.max(-1, Math.min(1, nx * C.aimSensitivityPointer))
  }

  const onPointerDown = () => {
    const p = phaseRef.current
    if (p === 'attract' || p === 'gameover' || p === 'submitted') {
      beginRun()
      return
    }
    if (p === 'ready') startCharge()
  }

  const onPointerUp = () => {
    if (phaseRef.current === 'ready') releaseCharge()
  }

  const cycleLetter = (delta: number) => {
    setInitials((prev) => {
      const next = [...prev]
      const idx = ALPHABET.indexOf(next[cursor])
      const ni = (idx + delta + ALPHABET.length) % ALPHABET.length
      next[cursor] = ALPHABET[ni]
      return next
    })
    audio()?.select()
  }

  const submitEntry = useCallback(async () => {
    if (submitting) return
    const name = initialsRef.current.join('').trim()
    const local = checkName(name, { maxLen: INITIALS_LEN })
    if (!local.ok) {
      setEntryMsg(local.message || 'PICK ANOTHER NAME')
      audio()?.rim()
      return
    }
    setSubmitting(true)
    setEntryMsg('')
    const res = await submit({ name, score: finalStreak, honeypot: honeypotRef.current?.value })
    setSubmitting(false)
    if (res.ok) {
      setNewEntryId(res.id ?? null)
      setPhase('submitted')
      setStreak(0)
      streakRef.current = 0
      audio()?.make()
    } else {
      setEntryMsg((res.error || 'TRY AGAIN').toUpperCase())
      audio()?.rim()
    }
  }, [finalStreak, submit, submitting])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const p = phaseRef.current
    if (p === 'entry') {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        cycleLetter(1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        cycleLetter(-1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCursor((c) => Math.max(0, c - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCursor((c) => Math.min(INITIALS_LEN - 1, c + 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        void submitEntry()
      }
      return
    }
    if (e.key === 'ArrowLeft') {
      if (p === 'ready') {
        e.preventDefault()
        aimXRef.current = Math.max(-1, aimXRef.current - C.aimSensitivityKeyPerSecond * 0.06)
      }
    } else if (e.key === 'ArrowRight') {
      if (p === 'ready') {
        e.preventDefault()
        aimXRef.current = Math.min(1, aimXRef.current + C.aimSensitivityKeyPerSecond * 0.06)
      }
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (p === 'attract' || p === 'gameover' || p === 'submitted') beginRun()
      else if (p === 'ready' && !e.repeat) startCharge()
    }
  }

  const onKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && phaseRef.current === 'ready') {
      e.preventDefault()
      releaseCharge()
    }
  }

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    audio()?.setEnabled(next)
    try {
      localStorage.setItem(SOUND_KEY, next ? '1' : '0')
    } catch {}
  }
  const toggleCalm = () => {
    const next = !calmUser
    setCalmUser(next)
    try {
      localStorage.setItem(CALM_KEY, next ? '1' : '0')
    } catch {}
  }

  // Test seam for the Playwright e2e. Only attached when the spec sets the flag on
  // window before load; it drives the state machine deterministically since the
  // physics-and-aim shot cannot be driven by synthetic input. Never active for real
  // users (the flag is never set in production).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as unknown as { __ARCADE_E2E__?: boolean; __arcade?: unknown }
    if (!w.__ARCADE_E2E__) return
    w.__arcade = {
      start: () => beginRun(),
      make: () => onArrived('make'),
      miss: () => onArrived('miss'),
      setName: (name: string) => {
        const chars = name.toUpperCase().slice(0, 3).padEnd(3, 'A').split('')
        initialsRef.current = chars // set synchronously so a follow-up submit() reads it
        setInitials(chars)
      },
      submit: () => void submitEntry(),
      phase: () => phaseRef.current,
      streak: () => streakRef.current,
    }
  }, [beginRun, onArrived, submitEntry])

  const showScores = phase === 'attract' || phase === 'gameover' || phase === 'submitted'

  return (
    <div
      ref={containerRef}
      className={`${styles.screen} ${shakeOn ? styles.shake : ''} ${flashOn ? styles.flash : ''}`}
      role="application"
      aria-label="Retro basketball arcade game. Press space or tap to start. Arrow keys aim, hold space to charge power, release to shoot."
      tabIndex={0}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      <div className={styles.canvasWrap}>
        <Canvas
          dpr={[0.5, 0.75]}
          camera={{ position: [0, 2.4, 5.4], fov: 46 }}
          gl={{ antialias: false, powerPreference: 'low-power' }}
          onCreated={({ camera }) => camera.lookAt(0, 2.1, -C.baseDistance)}
          aria-hidden="true"
        >
          <ArcadeScene
            phase={phase}
            streak={streak}
            aimXRef={aimXRef}
            powerRef={powerRef}
            hoopXRef={hoopXRef}
            activeShot={activeShot}
            calm={calm}
            onArrived={onArrived}
          />
        </Canvas>
      </div>

      <div className={styles.crt} aria-hidden="true" />

      <div className={styles.hud}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.label}>Streak</div>
            <div>{String(streak).padStart(3, '0')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className={styles.label}>CMBA Hoops</div>
            {windForStreak(streak) > 0 && phase !== 'attract' ? (
              <div className={styles.label} style={{ color: '#eb1c24' }}>
                Wind {shotSeqRef.current % 2 === 0 ? 'RIGHT' : 'LEFT'}
              </div>
            ) : null}
          </div>
          <div style={{ textAlign: 'right', display: 'flex', gap: 6 }}>
            <button className={styles.iconBtn} onClick={toggleSound} aria-pressed={soundOn} type="button">
              Sound {soundOn ? 'ON' : 'OFF'}
            </button>
            <button className={styles.iconBtn} onClick={toggleCalm} aria-pressed={calm} type="button">
              Calm {calm ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className={styles.center}>
          {phase === 'attract' && (
            <>
              <div className={styles.title}>CMBA HOOPS</div>
              <div className={`${calm ? '' : styles.blink} ${styles.label}`} style={{ fontSize: 11 }}>
                Press Start
              </div>
              <HighScores scores={scores} newId={newEntryId} onReport={report} />
              <button className={styles.btn} onClick={beginRun} type="button">
                Start
              </button>
              <p className={styles.hint}>
                Aim with the mouse or arrow keys. Hold to charge power, release to shoot. Make shots in a row.
              </p>
            </>
          )}

          {(phase === 'ready' || phase === 'shooting' || phase === 'result') && (
            <>
              <div className={styles.label}>Streak</div>
              <div className={styles.bigStreak}>{streak}</div>
              {phase === 'result' && lastOutcome === 'make' && <div className={styles.title}>SWISH</div>}
              {phase === 'result' && lastOutcome !== 'make' && (
                <div className={styles.title}>{lastOutcome === 'rim' ? 'RIM OUT' : 'MISS'}</div>
              )}
              <div className={styles.powerTrack} aria-hidden="true">
                <div className={styles.powerFill} style={{ width: `${Math.round(power * 100)}%` }} />
              </div>
              <div className={styles.label}>{phase === 'ready' ? 'Hold to charge, release to shoot' : ''}</div>
            </>
          )}

          {phase === 'gameover' && (
            <>
              <div className={styles.title}>GAME OVER</div>
              <div className={styles.label}>Streak</div>
              <div className={styles.bigStreak}>{finalStreak}</div>
              <HighScores scores={scores} newId={newEntryId} onReport={report} />
              <button className={styles.btn} onClick={beginRun} type="button">
                Play Again
              </button>
            </>
          )}

          {phase === 'entry' && (
            <>
              <div className={styles.title}>NEW HIGH SCORE</div>
              <div className={styles.label}>Streak {finalStreak}. Enter your initials.</div>
              <div className={styles.initials} data-interactive>
                {initials.map((ch, i) => (
                  <div key={i} className={styles.initialCol}>
                    <button
                      className={styles.arrowBtn}
                      aria-label={`Letter ${i + 1} up`}
                      onClick={() => {
                        setCursor(i)
                        cycleLetter(1)
                      }}
                      type="button"
                    >
                      {'▲'}
                    </button>
                    <div
                      className={`${styles.initialChar} ${i === cursor ? styles.initialActive : ''}`}
                      onClick={() => setCursor(i)}
                    >
                      {ch}
                    </div>
                    <button
                      className={styles.arrowBtn}
                      aria-label={`Letter ${i + 1} down`}
                      onClick={() => {
                        setCursor(i)
                        cycleLetter(-1)
                      }}
                      type="button"
                    >
                      {'▼'}
                    </button>
                  </div>
                ))}
              </div>
              {/* Honeypot: real players never fill this. */}
              <input
                ref={honeypotRef}
                className={styles.hpField}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                name="website"
              />
              <TurnstileWidget />
              <div className={styles.msg} role="alert">
                {entryMsg}
              </div>
              <button className={styles.btn} onClick={() => void submitEntry()} type="button" disabled={submitting}>
                {submitting ? 'Saving...' : 'Submit'}
              </button>
            </>
          )}

          {phase === 'submitted' && (
            <>
              <div className={styles.title}>HIGH SCORES</div>
              <HighScores scores={scores} newId={newEntryId} onReport={report} />
              <button className={styles.btn} onClick={beginRun} type="button">
                Play Again
              </button>
            </>
          )}
        </div>

        {!showScores && (
          <div className={styles.topbar}>
            <div className={styles.label}>Best {best}</div>
            <div className={styles.label}>{calm ? 'Calm mode' : ''}</div>
          </div>
        )}
      </div>

      <div aria-live="polite" className={styles.hpField}>
        {announce}
      </div>
    </div>
  )
}

function HighScores({
  scores,
  newId,
  onReport,
}: {
  scores: { id: number; name: string; score: number }[]
  newId: number | null
  onReport: (id: number) => void | Promise<unknown>
}) {
  const [reported, setReported] = useState<Set<number>>(new Set())
  return (
    <div className={styles.scores} data-interactive>
      <div className={styles.scoreRow} style={{ color: '#9aa0b0' }}>
        <span>#</span>
        <span>Name</span>
        <span>Streak</span>
        <span />
      </div>
      {scores.length === 0 && <div className={styles.label}>No scores yet. Be the first.</div>}
      {scores.map((s, i) => (
        <div key={s.id} className={`${styles.scoreRow} ${s.id === newId ? styles.scoreRowNew : ''}`}>
          <span>{String(i + 1).padStart(2, '0')}</span>
          <span>{s.name}</span>
          <span>{s.score}</span>
          <button
            className={styles.reportBtn}
            type="button"
            aria-label={`Report ${s.name}`}
            disabled={reported.has(s.id)}
            onClick={() => {
              setReported((r) => new Set(r).add(s.id))
              void onReport(s.id)
            }}
          >
            {reported.has(s.id) ? 'reported' : 'report'}
          </button>
        </div>
      ))}
    </div>
  )
}
