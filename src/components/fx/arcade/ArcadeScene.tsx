'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

import { GAME_CONFIG } from './gameConfig'
import { distanceForStreak, swayAmplitudeForStreak, type ShotOutcome, type Vec3 } from './physics'

/*
 * The three.js layer, rendered inside <Canvas>. Deliberately low fidelity: flat
 * shaded facets, a tiny light rig, and a limited palette, upscaled from a low
 * internal resolution (see the Canvas dpr and CSS image-rendering in ArcadeGame)
 * so it reads as early-arcade. Per-frame values (aim, power, hoop x, ball flight)
 * come in through refs so animating the ball never re-renders React.
 */

const C = GAME_CONFIG
const SEAM = '#0b0b0d'
const ORANGE = '#e0561f'
const RED = '#eb1c24'

export interface ActiveShot {
  id: number
  points: Vec3[]
  outcome: ShotOutcome
}

export interface ArcadeSceneProps {
  phase: string
  streak: number
  aimXRef: { current: number }
  powerRef: { current: number }
  hoopXRef: { current: number }
  activeShot: ActiveShot | null
  calm: boolean
  onArrived: (outcome: ShotOutcome) => void
}

function Ball({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const R = C.ballRadius
  // Equator + three vertical great circles: the basketball seam pattern.
  const rings: [number, number, number][] = [
    [Math.PI / 2, 0, 0],
    [0, 0, 0],
    [0, Math.PI / 3, 0],
    [0, (2 * Math.PI) / 3, 0],
  ]
  return (
    <group ref={groupRef}>
      <mesh castShadow>
        {/* low segment count + flat shading gives retro facets, not a smooth sphere */}
        <sphereGeometry args={[R, 20, 16]} />
        <meshLambertMaterial color={ORANGE} flatShading emissive={ORANGE} emissiveIntensity={0.12} />
      </mesh>
      {rings.map((rot, i) => (
        <mesh key={i} rotation={rot}>
          <torusGeometry args={[R + 0.004, 0.02, 8, 40]} />
          <meshBasicMaterial color={SEAM} />
        </mesh>
      ))}
    </group>
  )
}

function Hoop({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={groupRef}>
      {/* Backboard */}
      <mesh position={[0, C.rimHeight + 0.5, -0.28]}>
        <boxGeometry args={[2.0, 1.3, 0.06]} />
        <meshLambertMaterial color="#f2f2f2" transparent opacity={0.82} flatShading />
      </mesh>
      {/* Backboard target square */}
      <mesh position={[0, C.rimHeight + 0.32, -0.24]}>
        <boxGeometry args={[0.72, 0.5, 0.02]} />
        <meshBasicMaterial color={RED} wireframe />
      </mesh>
      {/* Rim */}
      <mesh position={[0, C.rimHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[C.rimRadius, 0.05, 8, 28]} />
        <meshLambertMaterial color={RED} emissive={RED} emissiveIntensity={0.3} flatShading />
      </mesh>
      {/* Net: an open truncated cone in wireframe hanging from the rim */}
      <mesh position={[0, C.rimHeight - 0.3, 0]}>
        <cylinderGeometry args={[C.rimRadius * 0.94, C.rimRadius * 0.5, 0.6, 12, 3, true]} />
        <meshBasicMaterial color="#dcdcdc" wireframe transparent opacity={0.5} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, C.rimHeight * 0.5, -0.55]}>
        <boxGeometry args={[0.12, C.rimHeight + 1.0, 0.12]} />
        <meshLambertMaterial color="#3a3a42" flatShading />
      </mesh>
    </group>
  )
}

function Reticle({ meshRef }: { meshRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.18, 0.03, 6, 20]} />
      <meshBasicMaterial color="#ffe14d" transparent opacity={0.9} />
    </mesh>
  )
}

export function ArcadeScene(props: ArcadeSceneProps) {
  const { aimXRef, powerRef, hoopXRef, activeShot, streak, phase, calm, onArrived } = props
  const ballGroup = useRef<THREE.Group | null>(null)
  const hoopGroup = useRef<THREE.Group | null>(null)
  const reticle = useRef<THREE.Mesh | null>(null)
  const flight = useRef<{ id: number; index: number; notified: boolean }>({ id: -1, index: 0, notified: false })

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const hoopZ = -(C.baseDistance + distanceForStreak(streak))
    const shooting = phase === 'shooting' && !!activeShot

    // Hoop sway while aiming; frozen (held) during a shot so the released shot is fair.
    if (hoopGroup.current) {
      if (!shooting) {
        const amp = swayAmplitudeForStreak(streak)
        hoopXRef.current = amp === 0 ? 0 : amp * Math.sin(t * C.swaySpeed)
      }
      hoopGroup.current.position.set(hoopXRef.current, 0, hoopZ)
    }

    // Reticle shows the current aim near the hoop plane.
    if (reticle.current) {
      const showReticle = phase === 'ready'
      reticle.current.visible = showReticle
      if (showReticle) {
        const spread = C.rimRadius * 3.2
        reticle.current.position.set(aimXRef.current * spread + hoopXRef.current * 0.4, C.rimHeight, hoopZ + 0.1)
        const s = 0.8 + powerRef.current * 0.6
        reticle.current.scale.set(s, s, s)
      }
    }

    const ball = ballGroup.current
    if (!ball) return

    if (shooting && activeShot) {
      if (flight.current.id !== activeShot.id) {
        flight.current = { id: activeShot.id, index: 0, notified: false }
      }
      const pts = activeShot.points
      flight.current.index += delta / C.dt // play the sampled path back at real time
      const i = Math.min(pts.length - 1, Math.floor(flight.current.index))
      const p = pts[i]
      ball.position.set(p.x, p.y, p.z)
      const spin = (calm ? C.spinPerSecond * 0.4 : C.spinPerSecond) * delta
      ball.rotation.x += spin
      ball.rotation.z += spin * 0.4
      if (i >= pts.length - 1 && !flight.current.notified) {
        flight.current.notified = true
        onArrived(activeShot.outcome)
      }
    } else {
      // Idle at the release spot with a slow spin.
      ball.position.set(0, C.startHeight, 0)
      ball.rotation.y += (calm ? 0.15 : 0.4) * delta
    }
  })

  return (
    <>
      <ambientLight intensity={0.72} />
      <directionalLight position={[3, 6, 4]} intensity={1.1} />
      <pointLight position={[-4, 2, 2]} intensity={0.4} color={RED} />
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3.5]}>
        <planeGeometry args={[16, 20]} />
        <meshLambertMaterial color="#141418" flatShading />
      </mesh>
      {/* Free-throw line marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.1]}>
        <planeGeometry args={[2.4, 0.08]} />
        <meshBasicMaterial color="#2a2a33" />
      </mesh>
      <Hoop groupRef={hoopGroup} />
      <Ball groupRef={ballGroup} />
      <Reticle meshRef={reticle} />
    </>
  )
}
