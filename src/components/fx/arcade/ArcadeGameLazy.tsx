'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

import styles from './ArcadeGame.module.css'
import { useArcadeScores } from './useArcadeScores'

// Code-split the three.js game; never SSR'd, and only loaded when scrolled into view.
const ArcadeGame = dynamic(() => import('./ArcadeGame').then((m) => m.ArcadeGame), { ssr: false })

function webglSupported(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')))
  } catch {
    return false
  }
}

/* Shown before load, and permanently when WebGL is unavailable: a static retro
   panel with a basketball and the live shared high-score table (read-only). */
function StaticFallback({ note }: { note?: string }) {
  const { scores } = useArcadeScores(10)
  return (
    <div className={styles.screen}>
      <div className={styles.crt} aria-hidden="true" />
      <div className={styles.hud}>
        <div className={styles.center}>
          <svg viewBox="0 0 120 120" width="72" height="72" aria-hidden="true">
            <circle cx="60" cy="60" r="54" fill="#e0561f" />
            <g stroke="#0b0b0d" strokeWidth="3" fill="none">
              <circle cx="60" cy="60" r="54" />
              <path d="M60 6 V114" />
              <path d="M6 60 H114" />
              <path d="M20 24 C 54 55, 54 65, 20 96" />
              <path d="M100 24 C 66 55, 66 65, 100 96" />
            </g>
          </svg>
          <div className={styles.title}>CMBA HOOPS</div>
          <div className={styles.scores}>
            <div className={styles.scoreRow} style={{ color: '#9aa0b0' }}>
              <span>#</span>
              <span>Name</span>
              <span>Streak</span>
              <span />
            </div>
            {scores.map((s, i) => (
              <div key={s.id} className={styles.scoreRow}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span>{s.name}</span>
                <span>{s.score}</span>
                <span />
              </div>
            ))}
          </div>
          <div className={styles.hint}>{note || 'Loading...'}</div>
        </div>
      </div>
    </div>
  )
}

export function ArcadeGameLazy() {
  const ref = useRef<HTMLDivElement>(null)
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    setWebgl(webglSupported())
  }, [])

  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className="absolute inset-0">
      {webgl === false ? (
        <StaticFallback note="This mini game needs WebGL. Here are the current high scores." />
      ) : webgl && inView ? (
        <ArcadeGame />
      ) : (
        <StaticFallback note="Loading the arcade..." />
      )}
    </div>
  )
}
