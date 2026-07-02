import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { ArcadeGameLazy } from '@/components/fx/arcade/ArcadeGameLazy'

export const metadata: Metadata = {
  title: 'CMBA Hoops Arcade | CMBA Connect',
  description:
    'Play CMBA Hoops, a retro arcade free throw game. Line up your shot, charge the power, and make baskets in a row to climb the shared high score table.',
}

const howTo = [
  {
    title: 'How to play',
    body:
      'Aim with the mouse, a drag, or the arrow keys. Hold to charge the power meter, then release to shoot. Space works too, so it is fully keyboard playable.',
  },
  {
    title: 'Difficulty modes',
    body:
      'Pick Rookie, Standard, or Pro before you start. Higher tiers shrink the rim, so a clean release matters more. Your pick is remembered.',
  },
  {
    title: 'The challenge',
    body:
      'The hoop starts to sway at a streak of 5, backs away at 6, and a crosswind appears at 8. Long streaks are earned. A single miss ends the run.',
  },
  {
    title: 'Sound and calm mode',
    body:
      'Sound is off by default. Calm mode removes screen shake and flashing and respects reduced motion. Both settings are remembered on this device.',
  },
  {
    title: 'Shared high scores',
    body:
      'The top streaks land on a shared leaderboard for everyone. Enter three initials arcade style. Names are filtered, and anyone can report a bad one.',
  },
  {
    title: 'No WebGL?',
    body:
      'The game needs WebGL. If your device does not support it, you will still see the live high score table so you never hit a dead end.',
  },
]

export default function ArcadePage() {
  return (
    <div className="min-h-screen">
      <section className="max-w-5xl mx-auto px-4 lg:px-6 pt-10 lg:pt-14 pb-6 text-center">
        <span className="label-xs text-cmba-red">Arcade</span>
        <h1 className="font-display font-black uppercase tracking-tighter2 text-[clamp(30px,7vw,68px)] leading-[0.95] mt-1">
          CMBA <span className="text-cmba-red">Hoops</span>
        </h1>
        <p className="text-cmba-grey text-sm lg:text-base max-w-2xl mx-auto mt-3">
          A free throw arcade game. Line up your shot, charge the power, and make baskets in a row. Every make
          raises your streak, and the best streaks make the shared high score table.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 lg:px-6">
        <div className="relative w-full mx-auto min-h-[440px] h-[72vh] max-h-[760px] border border-white/12 rounded-[16px] overflow-hidden bg-black">
          <ArcadeGameLazy />
        </div>
        <p className="text-center text-xs text-cmba-grey-mid mt-3">
          Tip: click the game, then use the mouse or arrow keys. Hold to charge, release to shoot.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-6">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {howTo.map((c) => (
            <div key={c.title} className="bg-cmba-black-card border border-white/12 p-5">
              <h3 className="font-display font-bold text-white uppercase tracking-wide text-sm">{c.title}</h3>
              <p className="text-xs text-cmba-grey mt-2 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs text-cmba-red hover:text-white uppercase tracking-wider transition-colors"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>
      </section>
    </div>
  )
}
