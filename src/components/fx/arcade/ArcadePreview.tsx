'use client'

import Link from 'next/link'

import styles from './ArcadeGame.module.css'
import { Basketball3DLazy } from '@/components/fx/Basketball3DLazy'
import { useArcadeScores } from './useArcadeScores'

/*
 * Home-page teaser for the arcade game. Deliberately lightweight: it shows the
 * retro screen, a spinning basketball (the small idle three.js ball, reused), the
 * current top scores, and a PLAY call to action. It does NOT load the full game
 * engine; the whole tile links to the dedicated /arcade page where the game lives.
 * This keeps the home page fast while still previewing the feature.
 */
export function ArcadePreview() {
  const { scores } = useArcadeScores(3)

  return (
    <Link href="/arcade" className={styles.screen} aria-label="Play CMBA Hoops, the arcade basketball game">
      <div className={styles.canvasWrap} aria-hidden="true">
        <Basketball3DLazy />
      </div>
      <div className={styles.crt} aria-hidden="true" />
      <div className={styles.hud}>
        <div className={styles.center}>
          <div className={styles.title}>CMBA HOOPS</div>
          <div className={styles.subtitle}>Free throw arcade</div>
          {scores.length > 0 && (
            <div className={styles.scores}>
              <div className={`${styles.scoreRow} ${styles.scoreHead}`}>
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
          )}
          <span className={styles.btn}>Play</span>
          <p className={styles.hint}>Make shots in a row. Beat the high score.</p>
        </div>
      </div>
    </Link>
  )
}
