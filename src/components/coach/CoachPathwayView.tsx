"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy, CheckCircle, Lock, Circle, ExternalLink, Zap, Star, ChevronDown, ChevronUp,
} from "lucide-react";
import { XP_LEVELS, type Badge } from "@/lib/gamification";

export type PathwayLevel = {
  name: string;
  description?: string | null;
  order: number;
  xpReward: number;
  requirements: { name: string; held: boolean; renewalUrl?: string | null }[];
  heldCount: number;
  requiredCount: number;
  percent: number;
  complete: boolean;
};

type Props = {
  levels: PathwayLevel[];
  signedIn: boolean;
  xp: number;
  level: number;
  levelTitle: string;
  nextLevelXp: number;
  progress: number;
  earnedBadges: Badge[];
  lockedBadges: Badge[];
};

export function CoachPathwayView({
  levels, signedIn, xp, level, levelTitle, nextLevelXp, progress, earnedBadges, lockedBadges,
}: Props) {
  const firstIncomplete = levels.findIndex((l) => !l.complete);
  const [expanded, setExpanded] = useState<number>(firstIncomplete < 0 ? 0 : firstIncomplete);

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <Trophy size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Coach Certification</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            CERTIFICATION <span className="text-cmba-red">PATHWAY</span>
          </h1>
          <p className="text-cmba-grey mt-2 max-w-lg">
            Progress through the CMBA coaching levels. {signedIn
              ? "Your progress below is based on your verified certifications."
              : "Sign in to track your real progress, XP, and badges."}
          </p>
          {!signedIn && (
            <Link href="/login?redirect=/coach/pathway"
              className="inline-flex items-center gap-2 mt-4 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-4 py-2 transition-colors">
              Sign in to track progress
            </Link>
          )}
        </div>
      </section>

      {/* XP bar (signed in only — real data) */}
      {signedIn && (
        <section className="bg-cmba-black-light border-b border-cmba-grey-dark/20">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
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

            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-4 lg:col-span-2">
              <h3 className="font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest mb-3 flex items-center gap-2">
                <Star size={14} className="text-cmba-red" /> Badges
              </h3>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                {earnedBadges.map((b) => (
                  <div key={b.id} className="shrink-0 bg-cmba-black-card border border-cmba-red/30 p-2 text-center w-20">
                    <div className="text-xl mb-1">{b.icon}</div>
                    <div className="font-display font-bold text-[9px] text-white uppercase tracking-wider leading-tight">{b.name}</div>
                  </div>
                ))}
                {lockedBadges.map((b) => (
                  <div key={b.id} className="shrink-0 bg-cmba-black-card border border-cmba-grey-dark/20 p-2 text-center w-20 opacity-40">
                    <div className="text-xl mb-1 grayscale">{b.icon}</div>
                    <div className="font-display font-bold text-[9px] text-cmba-grey-mid uppercase tracking-wider leading-tight">{b.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Levels */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-6">
        {levels.map((lvl, idx) => {
          const locked = !signedIn ? false : idx > 0 && !levels[idx - 1].complete;
          const open = expanded === idx;
          return (
            <div key={lvl.name} className={`bg-cmba-black-card border ${lvl.complete ? "border-green-500/30" : open ? "border-cmba-red/40" : "border-cmba-grey-dark/20"}`}>
              <button onClick={() => setExpanded(open ? -1 : idx)}
                className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-5 border-b border-cmba-grey-dark/10 text-left">
                <div className="font-display font-black text-5xl text-cmba-red/20">{String(idx + 1).padStart(2, "0")}</div>
                <div className="flex-1">
                  <h2 className="font-display font-black text-xl text-white uppercase tracking-wider">{lvl.name}</h2>
                  {lvl.description && <p className="text-xs text-cmba-grey mt-0.5">{lvl.description}</p>}
                </div>
                {signedIn && (
                  <div className="text-right mr-2">
                    <div className="font-display font-black text-2xl text-cmba-red">{lvl.percent}%</div>
                    <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">{lvl.heldCount}/{lvl.requiredCount}</div>
                  </div>
                )}
                {open ? <ChevronUp size={20} className="text-cmba-grey-mid" /> : <ChevronDown size={20} className="text-cmba-grey-mid" />}
              </button>

              {open && (
                <div className="p-6">
                  <div className="bg-cmba-red/5 border border-cmba-red/20 px-4 py-3 mb-6 flex items-center gap-3">
                    <Zap size={18} className="text-cmba-red" />
                    <span className="font-display font-bold text-sm text-cmba-red uppercase tracking-wider">+{lvl.xpReward} XP</span>
                    <span className="text-xs text-cmba-grey ml-auto">for completing this level</span>
                  </div>
                  <div className="space-y-3">
                    {lvl.requirements.map((req) => (
                      <div key={req.name}
                        className={`flex items-start gap-3 px-4 py-3 ${req.held ? "bg-green-500/5 border border-green-500/20" : "bg-cmba-black-surface/50 border border-cmba-grey-dark/10"}`}>
                        {req.held
                          ? <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />
                          : locked
                            ? <Lock size={16} className="text-cmba-grey-dark shrink-0 mt-0.5" />
                            : <Circle size={18} className="text-cmba-grey-mid shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-semibold ${req.held ? "text-green-300" : "text-cmba-grey-light"}`}>{req.name}</span>
                          {!req.held && req.renewalUrl && (
                            <a href={req.renewalUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 ml-3 text-xs font-display font-bold text-cmba-red uppercase tracking-wider hover:text-cmba-red-dark transition-colors">
                              <ExternalLink size={12} /> Get it
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* XP legend */}
      <section className="bg-cmba-black-light border-t border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
          <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider mb-6">XP <span className="text-cmba-red">Levels</span></h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {XP_LEVELS.map((l) => (
              <div key={l.level} className={`bg-cmba-black-card border p-4 text-center ${xp >= l.xp ? "border-cmba-red/30" : "border-cmba-grey-dark/20 opacity-50"}`}>
                <div className="font-display font-black text-3xl text-cmba-red/40 mb-1">{l.level}</div>
                <div className="font-display font-bold text-xs text-white uppercase tracking-wider">{l.title}</div>
                <div className="font-mono text-[10px] text-cmba-grey-mid mt-1">{l.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
