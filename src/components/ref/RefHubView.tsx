"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Flag, FileText, BookOpen, Trophy, ChevronRight, Play, Lock, AlertCircle,
  ExternalLink, CheckCircle, Circle, Zap, Star, Target, ChevronDown, ChevronUp,
} from "lucide-react";
import { XP_LEVELS, type Badge } from "@/lib/gamification";
import type { PathwayLevel } from "@/components/coach/CoachPathwayView";

type Props = {
  levels: PathwayLevel[];
  signedIn: boolean;
  userName?: string | null;
  xp: number;
  level: number;
  levelTitle: string;
  nextLevelXp: number;
  progress: number;
  earnedBadges: Badge[];
  lockedBadges: Badge[];
};

const quickActions = [
  { label: "Quick Reference Card", href: "/ref/quick-ref", icon: FileText, desc: "Pre-game essentials" },
  { label: "Signals Guide", href: "/ref/signals", icon: BookOpen, desc: "All officiating signals" },
  { label: "Rules Library", href: "/rules", icon: Flag, desc: "Interpretations & mods" },
  { label: "Game Report", href: "/game-report", icon: Play, desc: "Submit a report" },
];

const poeItems = [
  "Consistent travelling calls across all divisions",
  "Proper use of the shot clock in U14+ games",
  "Emphasis on sportsmanship and bench conduct",
  "Lane violation enforcement timing in U12",
];

export function RefHubView({
  levels, signedIn, userName, xp, level, levelTitle, nextLevelXp, progress, earnedBadges, lockedBadges,
}: Props) {
  const firstIncomplete = levels.findIndex((l) => !l.complete);
  const [expanded, setExpanded] = useState<number>(firstIncomplete < 0 ? 0 : firstIncomplete);
  const completedStages = levels.filter((l) => l.complete).length;

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
                <Flag size={14} className="text-cmba-red" />
                <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Referee Hub</span>
              </div>
              <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
                REFEREE <span className="text-cmba-red">DASHBOARD</span>
              </h1>
              <p className="text-cmba-grey mt-2">
                Signals, mechanics, rule interpretations, and certification tracking.
                {!signedIn && " Sign in to track your real RAMP progress."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/ref/quick-ref" className="bg-cmba-red hover:bg-cmba-red-dark text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">Quick Ref Card</Link>
              <Link href="/ref/signals" className="border border-cmba-grey-dark text-cmba-grey-light hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">Signals Guide</Link>
            </div>
          </div>
        </div>
      </section>

      {/* XP bar (real data, signed in) */}
      {signedIn && (
        <section className="bg-cmba-black-light border-b border-cmba-grey-dark/20">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-cmba-red/20 flex items-center justify-center">
                    <span className="font-display font-black text-xl text-cmba-red">{level}</span>
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm text-white uppercase tracking-wider">{levelTitle}</div>
                    <div className="font-mono text-[10px] text-cmba-grey-mid">{xp} / {nextLevelXp} XP</div>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-cmba-grey-dark/30 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cmba-red to-cmba-red-dark rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/20 flex items-center justify-center"><Target size={24} className="text-green-400" /></div>
                  <div>
                    <div className="font-display font-bold text-2xl text-white">{completedStages}<span className="text-cmba-grey-mid text-lg">/{levels.length}</span></div>
                    <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Stages complete</div>
                  </div>
                </div>
              </div>
              <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-4">
                <h2 className="font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest mb-2 flex items-center gap-2"><Star size={14} className="text-cmba-red" /> Badges</h2>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                  {earnedBadges.map((b) => <span key={b.id} title={b.name} className="text-xl shrink-0">{b.icon}</span>)}
                  {lockedBadges.map((b) => <span key={b.id} title={b.name} className="text-xl shrink-0 grayscale opacity-40">{b.icon}</span>)}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href} className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/50 p-5 transition-all card-hover group">
              <action.icon size={24} className="text-cmba-red mb-3" />
              <h2 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-0.5 group-hover:text-cmba-red transition-colors">{action.label}</h2>
              <p className="text-xs text-cmba-grey">{action.desc}</p>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">RAMP Certification <span className="text-cmba-red">Pathway</span></h2>
              {levels.map((cert, idx) => {
                const locked = signedIn && idx > 0 && !levels[idx - 1].complete;
                const open = expanded === idx;
                return (
                  <div key={cert.name} className={`bg-cmba-black-card border ${cert.complete ? "border-green-500/30" : open ? "border-cmba-red/40" : "border-cmba-grey-dark/20"}`}>
                    <button onClick={() => setExpanded(open ? -1 : idx)} className="w-full flex items-center gap-4 px-5 py-4 text-left">
                      <div className="shrink-0">
                        {cert.complete
                          ? <div className="w-10 h-10 bg-green-500/20 flex items-center justify-center"><Trophy size={18} className="text-green-400" /></div>
                          : locked
                            ? <div className="w-10 h-10 bg-cmba-grey-dark/20 flex items-center justify-center"><Lock size={18} className="text-cmba-grey-mid" /></div>
                            : <div className="w-10 h-10 bg-cmba-red/20 flex items-center justify-center"><Play size={18} className="text-cmba-red" /></div>}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">{cert.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-cmba-grey-dark/30 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${cert.complete ? "bg-green-500" : "bg-cmba-red"}`} style={{ width: `${cert.percent}%` }} />
                          </div>
                          <span className="font-mono text-xs text-cmba-grey-mid">{signedIn ? `${cert.percent}%` : `${cert.requiredCount} reqs`}</span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-cmba-red">+{cert.xpReward} XP</span>
                      {open ? <ChevronUp size={16} className="text-cmba-grey-mid" /> : <ChevronDown size={16} className="text-cmba-grey-mid" />}
                    </button>
                    {open && (
                      <div className="px-5 pb-5 space-y-2">
                        {cert.description && <p className="text-xs text-cmba-grey mb-3">{cert.description}</p>}
                        {cert.requirements.map((req) => (
                          <div key={req.name} className={`flex items-start gap-3 px-3 py-2.5 ${req.held ? "bg-green-500/5 border border-green-500/20" : "bg-cmba-black-surface/50 border border-cmba-grey-dark/10"}`}>
                            {req.held ? <CheckCircle size={16} className="text-green-400 shrink-0 mt-0.5" /> : locked ? <Lock size={14} className="text-cmba-grey-dark shrink-0 mt-0.5" /> : <Circle size={16} className="text-cmba-grey-mid shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm ${req.held ? "text-green-300" : "text-cmba-grey"}`}>{req.name}</span>
                              {!req.held && req.renewalUrl && (
                                <a href={req.renewalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 ml-3 text-xs font-display font-bold text-cmba-red uppercase tracking-wider hover:text-cmba-red-dark transition-colors"><ExternalLink size={12} />Get it</a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="flex items-center justify-between px-6 py-4 border-b border-cmba-grey-dark/20">
                <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">Rule Interpretations</h2>
                <Link href="/rules" className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider flex items-center gap-1">Full Library <ChevronRight size={14} /></Link>
              </div>
              <div className="divide-y divide-cmba-grey-dark/10">
                {["Travelling & Double Dribble", "Backcourt Violations", "Shot Clock Administration", "Foul Types & Penalties", "Lane Violation Timing"].map((rule) => (
                  <Link key={rule} href="/rules" className="flex items-center gap-3 px-6 py-3 hover:bg-cmba-red/5 transition-colors group">
                    <BookOpen size={16} className="text-cmba-red/50 shrink-0" />
                    <span className="text-sm text-cmba-grey group-hover:text-white transition-colors">{rule}</span>
                    <ChevronRight size={14} className="text-cmba-grey-dark ml-auto" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-cmba-black-card border border-cmba-red/30">
              <div className="px-5 py-3 border-b border-cmba-red/20 bg-cmba-red/5">
                <h3 className="font-display font-bold text-sm text-cmba-red uppercase tracking-wider flex items-center gap-2"><AlertCircle size={16} />Points of Emphasis</h3>
                <span className="font-mono text-[10px] text-cmba-grey-mid">Current Season</span>
              </div>
              <div className="p-5 space-y-3">
                {poeItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-cmba-red mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-xs text-cmba-grey leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile / sign-in */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-6 text-center">
              {signedIn ? (
                <>
                  <h3 className="font-display font-bold text-lg text-white uppercase">{userName}</h3>
                  <p className="text-xs text-cmba-grey-mid mt-1">Official</p>
                  <div className="flex justify-center gap-2 mt-3">
                    <span className="font-mono text-[10px] bg-cmba-red/15 text-cmba-red px-2 py-1">Level {level}</span>
                    <span className="font-mono text-[10px] bg-green-500/15 text-green-400 px-2 py-1">{completedStages} stages</span>
                  </div>
                  <Link href="/account" className="inline-block mt-4 font-mono text-xs text-cmba-red hover:text-white uppercase tracking-wider">My account →</Link>
                </>
              ) : (
                <>
                  <h3 className="font-display font-bold text-base text-white uppercase">Track your progress</h3>
                  <p className="text-xs text-cmba-grey mt-1 mb-3">Sign in to see your real RAMP progress, certifications, and XP.</p>
                  <Link href="/login?redirect=/ref" className="inline-block bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-xs uppercase tracking-wider px-4 py-2 transition-colors">Sign in</Link>
                </>
              )}
            </div>

            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="px-5 py-3 border-b border-cmba-grey-dark/20">
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2"><Zap size={16} className="text-cmba-red" />XP Levels</h3>
              </div>
              <div className="p-4 space-y-2">
                {XP_LEVELS.map((lvl) => (
                  <div key={lvl.level} className={`flex items-center gap-3 px-3 py-2 ${xp >= lvl.xp ? "bg-cmba-red/5 border border-cmba-red/20" : "opacity-40"}`}>
                    <span className="font-display font-black text-lg text-cmba-red/40 w-6">{lvl.level}</span>
                    <span className="font-display font-bold text-xs text-white uppercase tracking-wider flex-1">{lvl.title}</span>
                    <span className="font-mono text-[10px] text-cmba-grey-mid">{lvl.xp} XP</span>
                    {xp >= lvl.xp && <CheckCircle size={12} className="text-green-400" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
