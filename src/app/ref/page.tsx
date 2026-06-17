"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Flag,
  FileText,
  BookOpen,
  Trophy,
  Calendar,
  ChevronRight,
  Play,
  Lock,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  Circle,
  Zap,
  Flame,
  Star,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getLevelForXP, XP_LEVELS, REF_BADGES } from "@/lib/gamification";

// Real RAMP certification pathway with Reach360 integration
const certPathway = [
  {
    level: "RAMP Basic",
    description: "Foundation certification for new officials entering the CMBA system.",
    status: "completed" as const,
    progress: 100,
    xpReward: 500,
    requirements: [
      {
        name: "Intro to Officiating CMBA (Reach360)",
        done: true,
        type: "course" as const,
        xp: 150,
        url: "https://cmba.reach360.com/share/course/2adf207a-4b56-48dd-9154-f671aa5ddbd8",
        description: "Foundation course covering basic rules, signals, 2-official mechanics, and CMBA-specific modifications.",
        mandatory: true,
      },
      {
        name: "Safe CMBA Interactions (Reach360)",
        done: true,
        type: "course" as const,
        xp: 150,
        url: "https://cmba.reach360.com/share/course/fc129e16-b677-4be8-b2ab-733ade3ee23a",
        description: "Rule of Two, codes of conduct, EDI policies, concussion awareness, reporting.",
        mandatory: true,
      },
      {
        name: "FIBA Rules Fundamentals Quiz",
        done: true,
        type: "quiz" as const,
        xp: 75,
        description: "Pass the basic FIBA rules knowledge assessment (70% minimum).",
        mandatory: true,
      },
      {
        name: "On-Court Mentored Games (3)",
        done: true,
        type: "clinic" as const,
        xp: 200,
        description: "Officiate 3 games with a senior referee mentor providing real-time feedback.",
        mandatory: true,
      },
    ],
  },
  {
    level: "RAMP Intermediate",
    description: "Intermediate certification for officials ready for competitive divisions.",
    status: "in_progress" as const,
    progress: 50,
    xpReward: 800,
    requirements: [
      {
        name: "RAMP Basic Certification",
        done: true,
        type: "milestone" as const,
        xp: 0,
        description: "Must have completed all RAMP Basic requirements.",
        mandatory: true,
      },
      {
        name: "Safe CMBA Interactions — Refresher",
        done: true,
        type: "course" as const,
        xp: 75,
        url: "https://cmba.reach360.com/share/course/fc129e16-b677-4be8-b2ab-733ade3ee23a",
        description: "Annual refresher of safe sport training.",
        mandatory: true,
      },
      {
        name: "Advanced Signals & Mechanics Workshop",
        done: false,
        type: "clinic" as const,
        xp: 200,
        description: "In-person clinic covering advanced 2-official mechanics, trail/lead positioning, and clock management.",
        mandatory: true,
      },
      {
        name: "Division Rule Modifications Quiz",
        done: false,
        type: "quiz" as const,
        xp: 100,
        description: "Demonstrate knowledge of U11-U18 specific rule modifications (80% minimum).",
        mandatory: true,
      },
      {
        name: "Referee Development Day Attendance",
        done: false,
        type: "clinic" as const,
        xp: 200,
        description: "Attend a full CMBA Referee Development Day session.",
        mandatory: true,
      },
      {
        name: "Game Experience (20+ games)",
        done: false,
        type: "milestone" as const,
        xp: 150,
        description: "Officiate a minimum of 20 CMBA games at any level.",
        mandatory: true,
      },
    ],
  },
  {
    level: "RAMP Advanced",
    description: "Advanced certification for experienced officials handling upper-division and playoff games.",
    status: "locked" as const,
    progress: 0,
    xpReward: 1200,
    requirements: [
      {
        name: "RAMP Intermediate Certification",
        done: false,
        type: "milestone" as const,
        xp: 0,
        description: "Must have completed all RAMP Intermediate requirements.",
        mandatory: true,
      },
      {
        name: "Alberta Basketball Officials Certification",
        done: false,
        type: "course" as const,
        xp: 300,
        description: "Provincial-level officiating certification through ABA.",
        mandatory: true,
      },
      {
        name: "Safe CMBA Interactions — Annual",
        done: false,
        type: "course" as const,
        xp: 75,
        url: "https://cmba.reach360.com/share/course/fc129e16-b677-4be8-b2ab-733ade3ee23a",
        description: "Continued annual safe sport commitment.",
        mandatory: true,
      },
      {
        name: "Game Management & Conflict Resolution",
        done: false,
        type: "clinic" as const,
        xp: 200,
        description: "Advanced workshop on managing coaches, game tension, and conflict situations.",
        mandatory: true,
      },
      {
        name: "Mentoring New Officials (3 sessions)",
        done: false,
        type: "milestone" as const,
        xp: 300,
        description: "Mentor 3 newer officials through on-court evaluation sessions.",
        mandatory: true,
      },
      {
        name: "Game Experience (50+ games)",
        done: false,
        type: "milestone" as const,
        xp: 200,
        description: "Officiate a minimum of 50 CMBA games total.",
        mandatory: true,
      },
      {
        name: "Playoff Officiating Assignment",
        done: false,
        type: "milestone" as const,
        xp: 250,
        description: "Successfully officiate at least one playoff round.",
        mandatory: true,
      },
    ],
  },
];

const poeItems = [
  "Consistent travelling calls across all divisions",
  "Proper use of the shot clock in U14+ games",
  "Emphasis on sportsmanship and bench conduct",
  "Lane violation enforcement timing in U12",
];

const quickActions = [
  { label: "Quick Reference Card", href: "/ref/quick-ref", icon: FileText, desc: "Pre-game essentials" },
  { label: "Signals Guide", href: "/ref/signals", icon: BookOpen, desc: "All officiating signals" },
  { label: "Mechanics Library", href: "/ref", icon: Flag, desc: "Positioning & rotation" },
  { label: "Video Examples", href: "/ref", icon: Play, desc: "Correct & incorrect calls" },
];

const typeColors = {
  course: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Online Course" },
  clinic: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", label: "In-Person" },
  quiz: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", label: "Quiz" },
  milestone: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", label: "Milestone" },
  streak: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20", label: "Streak" },
};

// Demo user
const DEMO_XP = 1050;
const DEMO_STREAK = 11;

export default function RefDashboard() {
  const [expandedLevel, setExpandedLevel] = useState<number>(1);
  const levelInfo = getLevelForXP(DEMO_XP);
  const earnedBadges = REF_BADGES.slice(0, 5);
  const lockedBadges = REF_BADGES.slice(5);

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
              <p className="text-cmba-grey mt-2">Signals, mechanics, rule interpretations, and certification tracking.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/ref/quick-ref" className="bg-cmba-red hover:bg-cmba-red-dark text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
                Quick Ref Card
              </Link>
              <Link href="/ref/signals" className="border border-cmba-grey-dark text-cmba-grey-light hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
                Signals Guide
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* XP & Gamification Bar */}
      <section className="bg-cmba-black-light border-b border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-cmba-red/20 flex items-center justify-center">
                  <span className="font-display font-black text-xl text-cmba-red">{levelInfo.level}</span>
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-white uppercase tracking-wider">{levelInfo.title}</div>
                  <div className="font-mono text-[10px] text-cmba-grey-mid">{DEMO_XP} / {levelInfo.nextLevelXp} XP</div>
                </div>
              </div>
              <div className="mt-3 h-2 bg-cmba-grey-dark/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cmba-red to-cmba-red-dark rounded-full transition-all duration-1000"
                  style={{ width: `${levelInfo.progress}%` }}
                />
              </div>
            </div>

            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500/20 flex items-center justify-center">
                  <Flame size={24} className="text-orange-400" />
                </div>
                <div>
                  <div className="font-display font-bold text-2xl text-white">{DEMO_STREAK}</div>
                  <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Day Streak</div>
                </div>
              </div>
              <div className="mt-3 flex gap-1">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className={`flex-1 h-2 rounded-full ${i < Math.min(DEMO_STREAK, 7) ? "bg-orange-400" : "bg-cmba-grey-dark/30"}`} />
                ))}
              </div>
            </div>

            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/20 flex items-center justify-center">
                  <Target size={24} className="text-green-400" />
                </div>
                <div>
                  <div className="font-display font-bold text-2xl text-white">2<span className="text-cmba-grey-mid text-lg">/6</span></div>
                  <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Level 2 Complete</div>
                </div>
              </div>
              <div className="mt-3 h-2 bg-cmba-grey-dark/30 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: "33%" }} />
              </div>
            </div>

            <div className="bg-cmba-black-card border border-cmba-red/30 p-4 animate-pulse-red">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-cmba-red/20 flex items-center justify-center">
                  <Zap size={24} className="text-cmba-red" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-white uppercase">Next: +200 XP</div>
                  <div className="font-mono text-[10px] text-cmba-grey-mid">Attend Mechanics Workshop</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="bg-cmba-black border-b border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
          <h3 className="font-display font-bold text-sm text-cmba-grey-mid uppercase tracking-widest mb-3 flex items-center gap-2">
            <Star size={14} className="text-cmba-red" /> Badges Earned
          </h3>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {earnedBadges.map((badge) => (
              <div key={badge.id} className="shrink-0 bg-cmba-black-card border border-cmba-red/30 p-3 text-center w-24">
                <div className="text-2xl mb-1">{badge.icon}</div>
                <div className="font-display font-bold text-[10px] text-white uppercase tracking-wider leading-tight">{badge.name}</div>
              </div>
            ))}
            {lockedBadges.map((badge) => (
              <div key={badge.id} className="shrink-0 bg-cmba-black-card border border-cmba-grey-dark/20 p-3 text-center w-24 opacity-40">
                <div className="text-2xl mb-1 grayscale">{badge.icon}</div>
                <div className="font-display font-bold text-[10px] text-cmba-grey-mid uppercase tracking-wider leading-tight">{badge.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href} className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/50 p-5 transition-all card-hover group">
              <action.icon size={24} className="text-cmba-red mb-3" />
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-0.5 group-hover:text-cmba-red transition-colors">{action.label}</h3>
              <p className="text-xs text-cmba-grey">{action.desc}</p>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* RAMP Certification Pathway */}
            <div className="space-y-4">
              <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                RAMP Certification <span className="text-cmba-red">Pathway</span>
              </h2>
              {certPathway.map((cert, idx) => (
                <div key={cert.level} className={`bg-cmba-black-card border ${cert.status === "in_progress" ? "border-cmba-red/40" : cert.status === "completed" ? "border-green-500/30" : "border-cmba-grey-dark/20"}`}>
                  <button
                    onClick={() => setExpandedLevel(expandedLevel === idx ? -1 : idx)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left"
                  >
                    <div className="shrink-0">
                      {cert.status === "completed" ? (
                        <div className="w-10 h-10 bg-green-500/20 flex items-center justify-center">
                          <Trophy size={18} className="text-green-400" />
                        </div>
                      ) : cert.status === "in_progress" ? (
                        <div className="w-10 h-10 bg-cmba-red/20 flex items-center justify-center">
                          <Play size={18} className="text-cmba-red" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-cmba-grey-dark/20 flex items-center justify-center">
                          <Lock size={18} className="text-cmba-grey-mid" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">{cert.level}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-cmba-grey-dark/30 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${cert.status === "completed" ? "bg-green-500" : "bg-cmba-red"}`} style={{ width: `${cert.progress}%` }} />
                        </div>
                        <span className="font-mono text-xs text-cmba-grey-mid">{cert.progress}%</span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-cmba-red">+{cert.xpReward} XP</span>
                    {expandedLevel === idx ? <ChevronUp size={16} className="text-cmba-grey-mid" /> : <ChevronDown size={16} className="text-cmba-grey-mid" />}
                  </button>

                  {expandedLevel === idx && (
                    <div className="px-5 pb-5 space-y-2">
                      <p className="text-xs text-cmba-grey mb-3">{cert.description}</p>
                      {cert.requirements.map((req) => {
                        const tc = typeColors[req.type];
                        return (
                          <div
                            key={req.name}
                            className={`flex items-start gap-3 px-3 py-2.5 ${req.done ? "bg-green-500/5 border border-green-500/20" : "bg-cmba-black-surface/50 border border-cmba-grey-dark/10"}`}
                          >
                            {req.done ? (
                              <CheckCircle size={16} className="text-green-400 shrink-0 mt-0.5" />
                            ) : cert.status === "locked" ? (
                              <Lock size={14} className="text-cmba-grey-dark shrink-0 mt-0.5" />
                            ) : (
                              <Circle size={16} className="text-cmba-grey-mid shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm ${req.done ? "text-green-300" : "text-cmba-grey"}`}>{req.name}</span>
                                <span className={`font-mono text-[9px] px-1.5 py-0.5 uppercase ${tc.bg} ${tc.text} ${tc.border} border`}>{tc.label}</span>
                                {req.mandatory && <span className="font-mono text-[9px] px-1.5 py-0.5 uppercase bg-cmba-red/10 text-cmba-red border border-cmba-red/20">Required</span>}
                                {req.xp > 0 && <span className="font-mono text-[9px] text-cmba-grey-mid ml-auto">+{req.xp} XP</span>}
                              </div>
                              {req.description && <p className="text-xs text-cmba-grey mt-1">{req.description}</p>}
                              {req.url && !req.done && cert.status !== "locked" && (
                                <a href={req.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-xs font-display font-bold text-cmba-red uppercase tracking-wider hover:text-cmba-red-dark transition-colors">
                                  <ExternalLink size={12} />Start Course
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Rule Interpretation Library */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="flex items-center justify-between px-6 py-4 border-b border-cmba-grey-dark/20">
                <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">Rule Interpretations</h2>
                <Link href="/rules" className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider flex items-center gap-1">
                  Full Library <ChevronRight size={14} />
                </Link>
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
            {/* Points of Emphasis */}
            <div className="bg-cmba-black-card border border-cmba-red/30">
              <div className="px-5 py-3 border-b border-cmba-red/20 bg-cmba-red/5">
                <h3 className="font-display font-bold text-sm text-cmba-red uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle size={16} />Points of Emphasis
                </h3>
                <span className="font-mono text-[10px] text-cmba-grey-mid">2025-26 Season</span>
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

            {/* Profile Card */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-6 text-center">
              <div className="w-16 h-16 bg-cmba-black-surface rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-cmba-red/30 overflow-hidden">
                <Image src="/cmba-logo-sm.png" alt="CMBA" width={40} height={40} className="w-10 h-10" />
              </div>
              <h3 className="font-display font-bold text-lg text-white uppercase">Jane Smith</h3>
              <p className="text-xs text-cmba-grey-mid mt-1">Referee · RAMP Basic Certified</p>
              <div className="flex justify-center gap-2 mt-3">
                <span className="font-mono text-[10px] bg-green-500/15 text-green-400 px-2 py-1">RAMP Basic</span>
                <span className="font-mono text-[10px] bg-cmba-red/15 text-cmba-red px-2 py-1">Level {levelInfo.level}</span>
                <span className="font-mono text-[10px] bg-orange-500/15 text-orange-400 px-2 py-1">{DEMO_STREAK}d Streak</span>
              </div>
            </div>

            {/* XP Levels */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="px-5 py-3 border-b border-cmba-grey-dark/20">
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap size={16} className="text-cmba-red" />XP Levels
                </h3>
              </div>
              <div className="p-4 space-y-2">
                {XP_LEVELS.map((lvl) => (
                  <div key={lvl.level} className={`flex items-center gap-3 px-3 py-2 ${DEMO_XP >= lvl.xp ? "bg-cmba-red/5 border border-cmba-red/20" : "opacity-40"}`}>
                    <span className="font-display font-black text-lg text-cmba-red/40 w-6">{lvl.level}</span>
                    <span className="font-display font-bold text-xs text-white uppercase tracking-wider flex-1">{lvl.title}</span>
                    <span className="font-mono text-[10px] text-cmba-grey-mid">{lvl.xp} XP</span>
                    {DEMO_XP >= lvl.xp && <CheckCircle size={12} className="text-green-400" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="px-5 py-3 border-b border-cmba-grey-dark/20">
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={16} className="text-cmba-red" />Upcoming
                </h3>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <h4 className="font-display font-bold text-xs text-white uppercase">Referee Development Day</h4>
                  <p className="font-mono text-[10px] text-cmba-grey-mid">Apr 5, 2025 · Trico Centre</p>
                  <span className="font-mono text-[9px] text-cmba-red">+200 XP</span>
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs text-white uppercase">Rules Quiz — Pre-Season</h4>
                  <p className="font-mono text-[10px] text-cmba-grey-mid">Opens Sep 1, 2025</p>
                  <span className="font-mono text-[9px] text-cmba-red">+100 XP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
