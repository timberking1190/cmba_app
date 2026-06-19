import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Brain, Clock, Monitor, Award, ExternalLink, ArrowRight, Flame, Shield,
  Users, HeartPulse, Target, MessageSquare, Sparkles,
} from 'lucide-react'

import { managingTheMoment as course } from '@/lib/reach360CourseData'

export const metadata: Metadata = {
  title: 'Managing the Moment | CMBA Connect',
  description: course.description,
}

const moduleIcons = [Brain, Shield, Target, MessageSquare, Users, HeartPulse, Sparkles]

const simple = [
  { letter: 'S', word: 'Stop', desc: 'Pause and notice the moment.' },
  { letter: 'I', word: 'Inhale', desc: 'One slow breath to reset the body.' },
  { letter: 'M', word: 'Map', desc: 'Name what is in your control right now.' },
  { letter: 'P', word: 'Pick', desc: 'Choose the next single action.' },
  { letter: 'L', word: 'Lead', desc: 'Act with composure the team can mirror.' },
  { letter: 'E', word: 'Evaluate', desc: 'After the moment, reflect and adjust.' },
]

export default function ManagingTheMomentPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient border-b-2 border-cmba-red">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <div className="absolute -right-16 -top-10 w-80 h-80 rounded-full bg-cmba-red blur-3xl animate-pulse-red" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4 animate-slide-up">
            <Brain size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">CMBA Coach Education</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-6xl text-white uppercase tracking-tight leading-[0.92] animate-slide-up">
            Managing <span className="text-cmba-red">the Moment</span>
          </h1>
          <p className="text-cmba-grey mt-4 max-w-2xl text-base lg:text-lg leading-relaxed animate-slide-up">
            Sideline leadership for high-pressure games. Seven self-paced modules that help U9–U18 coaches
            stay composed, prepare athletes without fear, and lead the bench when it matters most.
          </p>

          {/* Stat chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-3xl">
            {[
              { icon: Monitor, label: 'Format', value: 'Online, self-paced' },
              { icon: Clock, label: 'Time', value: '~2–3 hours' },
              { icon: Target, label: 'Modules', value: `${course.modules.length} lessons` },
              { icon: Award, label: 'On completion', value: 'Certificate' },
            ].map((s) => (
              <div key={s.label} className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 p-4 card-hover">
                <s.icon size={18} className="text-cmba-red mb-2" />
                <div className="font-display font-bold text-sm text-white leading-tight">{s.value}</div>
                <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
            <a href={course.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
              Start the course <ExternalLink size={15} />
            </a>
            <Link href="/coach/pathway"
              className="inline-flex items-center gap-2 border border-cmba-grey-dark text-cmba-grey-light hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
              See where it fits <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-cmba-black-light border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Users size={18} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-white uppercase tracking-wider">Who it&apos;s for</span>
          </div>
          <p className="text-sm text-cmba-grey leading-relaxed">{course.targetAudience}.</p>
          <div className="flex flex-wrap gap-1.5 sm:ml-auto">
            {course.tags.map((t) => (
              <span key={t} className="font-mono text-[10px] uppercase tracking-wider bg-cmba-red/10 text-cmba-red border border-cmba-red/20 px-2 py-0.5">{t.replace(/-/g, ' ')}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Module timeline */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <h2 className="font-display font-black text-2xl lg:text-3xl text-white uppercase tracking-tight mb-2">
          What you&apos;ll <span className="text-cmba-red">learn</span>
        </h2>
        <p className="text-cmba-grey mb-8 max-w-2xl">Seven connected modules build from understanding pressure to leading through it — and recovering after.</p>

        <ol className="relative border-l-2 border-cmba-red/30 ml-3 space-y-5">
          {course.modules.map((m, i) => {
            const Icon = moduleIcons[i] ?? Brain
            return (
              <li key={m.number} className="relative pl-8 group">
                <span className="absolute -left-[1.30rem] top-0 w-9 h-9 rounded-full bg-cmba-black-card border-2 border-cmba-red/40 flex items-center justify-center group-hover:border-cmba-red group-hover:bg-cmba-red/10 transition-colors">
                  <Icon size={16} className="text-cmba-red" />
                </span>
                <div className="bg-cmba-black-card border border-white/12 p-4 lg:p-5 card-hover">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-black text-cmba-red/40 text-lg">{String(m.number).padStart(2, '0')}</span>
                    <h3 className="font-display font-bold text-white uppercase tracking-wide text-sm lg:text-base">{m.title}</h3>
                  </div>
                  <p className="text-sm text-cmba-grey leading-relaxed">{m.description}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* S.I.M.P.L.E. spotlight */}
      <section className="bg-cmba-black-light border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={18} className="text-cmba-red" />
            <span className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.18em]">From Module 6</span>
          </div>
          <h2 className="font-display font-black text-2xl lg:text-3xl text-white uppercase tracking-tight mb-6">
            The <span className="text-cmba-red">S.I.M.P.L.E.</span> reset
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {simple.map((s, i) => (
              <div key={s.letter} className="bg-cmba-black-card border border-white/12 p-4 card-hover animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="font-display font-black text-4xl text-cmba-red/30 leading-none">{s.letter}</div>
                <div className="font-display font-bold text-white uppercase tracking-wide text-sm mt-2">{s.word}</div>
                <p className="text-xs text-cmba-grey mt-1 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-cmba-grey-mid mt-4">A teachable, repeatable reset athletes can use under pressure — practiced in the course with downloadable tools.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 lg:px-6 py-12">
        <div className="bg-cmba-red/10 border border-cmba-red/30 p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">Ready to lead the moment?</h2>
            <p className="text-cmba-grey mt-1">Free, self-paced, and certificate-backed. Earn it toward your coaching pathway.</p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <a href={course.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
              Start now <ExternalLink size={15} />
            </a>
            <Link href="/coach/courses"
              className="inline-flex items-center gap-2 border border-cmba-grey-dark text-cmba-grey-light hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
              All courses
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
