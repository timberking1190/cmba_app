"use client";

import { useState } from "react";
import {
  Trophy,
  CheckCircle,
  Lock,
  Circle,
  ExternalLink,
  Zap,
  Flame,
  Star,
  ChevronDown,
  ChevronUp,
  Target,
} from "lucide-react";
import { getLevelForXP, XP_LEVELS, COACH_BADGES } from "@/lib/gamification";

// Real CMBA Coach certification requirements with Reach360 course links
const pathways = [
  {
    level: "Community Coach",
    description: "Foundation-level certification for new coaches entering the CMBA system. Required before your first season.",
    status: "in_progress" as const,
    progress: 60,
    xpReward: 500,
    requirements: [
      {
        name: "CMBA Coach Training (Reach360)",
        done: true,
        type: "course" as const,
        xp: 150,
        url: "https://cmba.reach360.com/share/course/55ed3dd3-87dc-44e0-b300-2fb0e60ec743",
        description: "Mandatory. Covers CMBA philosophy, LTAD model, Read & React Offense, practice planning.",
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
        name: "Spectator Training (Reach360)",
        done: true,
        type: "course" as const,
        xp: 100,
        url: "https://cmba.reach360.com/share/course/60269d65-63f4-4edb-9a9f-8d01d170025c",
        description: "Share with your parent group. Sideline behaviour, conversations in the car, understanding officials.",
        mandatory: false,
      },
      {
        name: "Online NCCP Make Ethical Decisions",
        done: true,
        type: "course" as const,
        xp: 150,
        url: "https://coach.ca/nccp-make-ethical-decisions",
        description: "Canada-wide coaching ethics requirement via the Coaching Association of Canada.",
        mandatory: true,
      },
      {
        name: "Managing the Moment (Reach360)",
        done: false,
        type: "course" as const,
        xp: 150,
        url: "https://cmba.reach360.com/share/course/4f3c4927-d3cc-410f-a7ac-cf7347c410c5",
        description: "Sideline leadership during high-pressure games. 7 modules on coach self-regulation and athlete mental skills.",
        mandatory: false,
      },
      {
        name: "In-Person Coaching Clinic Attendance (1)",
        done: false,
        type: "clinic" as const,
        xp: 200,
        description: "Attend at least one CMBA in-person coaching clinic or workshop.",
        mandatory: true,
      },
      {
        name: "Season-End Evaluation",
        done: false,
        type: "milestone" as const,
        xp: 100,
        description: "Complete self-evaluation and zone feedback at end of season.",
        mandatory: true,
      },
    ],
  },
  {
    level: "Trained Coach",
    description: "Intermediate certification building on community-level foundations. For coaches moving to competitive divisions.",
    status: "locked" as const,
    progress: 0,
    xpReward: 800,
    requirements: [
      {
        name: "Community Coach Certification",
        done: false,
        type: "milestone" as const,
        xp: 0,
        description: "Must complete all Community Coach requirements first.",
        mandatory: true,
      },
      {
        name: "NCCP Competition Introduction — Basketball",
        done: false,
        type: "course" as const,
        xp: 200,
        url: "https://coach.ca/nccp-competition-introduction",
        description: "National coaching certification for competitive sport. In-person multi-day clinic.",
        mandatory: true,
      },
      {
        name: "Safe CMBA Interactions — Refresher",
        done: false,
        type: "course" as const,
        xp: 75,
        url: "https://cmba.reach360.com/share/course/fc129e16-b677-4be8-b2ab-733ade3ee23a",
        description: "Annual refresher of safe sport training.",
        mandatory: true,
      },
      {
        name: "Managing the Moment (Reach360)",
        done: false,
        type: "course" as const,
        xp: 150,
        url: "https://cmba.reach360.com/share/course/4f3c4927-d3cc-410f-a7ac-cf7347c410c5",
        description: "Required at Trained level if not completed at Community level.",
        mandatory: true,
      },
      {
        name: "In-Person Clinic Attendance (2 additional)",
        done: false,
        type: "clinic" as const,
        xp: 400,
        description: "Attend 2 additional CMBA development clinics or workshops.",
        mandatory: true,
      },
      {
        name: "Mentorship Session (1)",
        done: false,
        type: "milestone" as const,
        xp: 150,
        description: "Complete one mentorship session with a Developed Coach or CMBA coaching lead.",
        mandatory: true,
      },
      {
        name: "Head Coaching Experience (1 season)",
        done: false,
        type: "milestone" as const,
        xp: 200,
        description: "Minimum one full season as a head coach or primary assistant.",
        mandatory: true,
      },
    ],
  },
  {
    level: "Developed Coach",
    description: "Advanced certification for experienced coaches working with competitive and upper divisions.",
    status: "locked" as const,
    progress: 0,
    xpReward: 1200,
    requirements: [
      {
        name: "Trained Coach Certification",
        done: false,
        type: "milestone" as const,
        xp: 0,
        description: "Must complete all Trained Coach requirements first.",
        mandatory: true,
      },
      {
        name: "NCCP Competition Development — Basketball",
        done: false,
        type: "course" as const,
        xp: 300,
        url: "https://coach.ca/nccp-competition-development",
        description: "Advanced national coaching certification. Multi-day intensive.",
        mandatory: true,
      },
      {
        name: "Safe CMBA Interactions — Annual Refresher",
        done: false,
        type: "course" as const,
        xp: 75,
        url: "https://cmba.reach360.com/share/course/fc129e16-b677-4be8-b2ab-733ade3ee23a",
        description: "Continued annual safe sport commitment.",
        mandatory: true,
      },
      {
        name: "In-Person Clinic Attendance (3 additional)",
        done: false,
        type: "clinic" as const,
        xp: 600,
        description: "Attend 3 additional development clinics, including at least one external.",
        mandatory: true,
      },
      {
        name: "Mentorship Sessions (3)",
        done: false,
        type: "milestone" as const,
        xp: 300,
        description: "Complete 3 mentorship sessions. May include mentoring newer coaches.",
        mandatory: true,
      },
      {
        name: "Head Coaching Experience (2+ seasons)",
        done: false,
        type: "milestone" as const,
        xp: 300,
        description: "Minimum two full seasons as a head coach at competitive level.",
        mandatory: true,
      },
    ],
  },
];

// Demo user XP
const DEMO_XP = 850;
const DEMO_STREAK = 4;

const typeColors = {
  course: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Online Course" },
  clinic: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", label: "In-Person" },
  quiz: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", label: "Quiz" },
  milestone: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", label: "Milestone" },
  streak: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20", label: "Streak" },
};

export default function CoachPathwayPage() {
  const [expandedLevel, setExpandedLevel] = useState<number>(0);
  const levelInfo = getLevelForXP(DEMO_XP);

  // Earned badges (demo)
  const earnedBadges = COACH_BADGES.slice(0, 4);
  const lockedBadges = COACH_BADGES.slice(4);

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
            Progress through Community, Trained, and Developed Coach levels. Complete courses, attend clinics, and earn XP to level up.
          </p>
        </div>
      </section>

      {/* XP & Gamification Bar */}
      <section className="bg-cmba-black-light border-b border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Level & XP */}
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

            {/* Streak */}
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
                  <div
                    key={i}
                    className={`flex-1 h-2 rounded-full ${i < DEMO_STREAK ? "bg-orange-400" : "bg-cmba-grey-dark/30"}`}
                  />
                ))}
              </div>
            </div>

            {/* Courses Done */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/20 flex items-center justify-center">
                  <Target size={24} className="text-green-400" />
                </div>
                <div>
                  <div className="font-display font-bold text-2xl text-white">4<span className="text-cmba-grey-mid text-lg">/7</span></div>
                  <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Level 1 Complete</div>
                </div>
              </div>
              <div className="mt-3 h-2 bg-cmba-grey-dark/30 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: "57%" }} />
              </div>
            </div>

            {/* Next Reward */}
            <div className="bg-cmba-black-card border border-cmba-red/30 p-4 animate-pulse-red">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-cmba-red/20 flex items-center justify-center">
                  <Zap size={24} className="text-cmba-red" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-white uppercase">Next: +150 XP</div>
                  <div className="font-mono text-[10px] text-cmba-grey-mid">Complete Managing the Moment</div>
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

      {/* Pathway Levels */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-6">
        {pathways.map((pathway, idx) => (
          <div key={pathway.level} className={`bg-cmba-black-card border ${pathway.status === "in_progress" ? "border-cmba-red/40" : "border-cmba-grey-dark/20"}`}>
            {/* Level Header */}
            <button
              onClick={() => setExpandedLevel(expandedLevel === idx ? -1 : idx)}
              className="w-full flex items-center gap-4 px-6 py-5 border-b border-cmba-grey-dark/10 text-left"
            >
              <div className="font-display font-black text-5xl text-cmba-red/20">{String(idx + 1).padStart(2, "0")}</div>
              <div className="flex-1">
                <h2 className="font-display font-black text-xl text-white uppercase tracking-wider">{pathway.level}</h2>
                <p className="text-xs text-cmba-grey mt-0.5">{pathway.description}</p>
              </div>
              {pathway.status === "in_progress" && (
                <div className="text-right mr-2">
                  <div className="font-display font-black text-2xl text-cmba-red">{pathway.progress}%</div>
                  <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Complete</div>
                </div>
              )}
              {pathway.status === "locked" && (
                <Lock size={24} className="text-cmba-grey-dark mr-2" />
              )}
              {expandedLevel === idx ? (
                <ChevronUp size={20} className="text-cmba-grey-mid" />
              ) : (
                <ChevronDown size={20} className="text-cmba-grey-mid" />
              )}
            </button>

            {/* Expanded Content */}
            {expandedLevel === idx && (
              <div className="p-6">
                {pathway.status === "in_progress" && (
                  <div className="h-2 bg-cmba-grey-dark/30 rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-cmba-red rounded-full transition-all duration-700" style={{ width: `${pathway.progress}%` }} />
                  </div>
                )}

                {/* XP Reward Banner */}
                <div className="bg-cmba-red/5 border border-cmba-red/20 px-4 py-3 mb-6 flex items-center gap-3">
                  <Zap size={18} className="text-cmba-red" />
                  <span className="font-display font-bold text-sm text-cmba-red uppercase tracking-wider">
                    +{pathway.xpReward} XP Milestone Bonus
                  </span>
                  <span className="text-xs text-cmba-grey ml-auto">for completing this level</span>
                </div>

                <div className="space-y-3">
                  {pathway.requirements.map((req) => {
                    const tc = typeColors[req.type];
                    return (
                      <div
                        key={req.name}
                        className={`flex items-start gap-3 px-4 py-3 ${req.done ? "bg-green-500/5 border border-green-500/20" : "bg-cmba-black-surface/50 border border-cmba-grey-dark/10"}`}
                      >
                        {req.done ? (
                          <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />
                        ) : pathway.status === "locked" ? (
                          <Lock size={16} className="text-cmba-grey-dark shrink-0 mt-0.5" />
                        ) : (
                          <Circle size={18} className="text-cmba-grey-mid shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold ${req.done ? "text-green-300" : "text-cmba-grey-light"}`}>
                              {req.name}
                            </span>
                            <span className={`font-mono text-[9px] px-1.5 py-0.5 uppercase ${tc.bg} ${tc.text} ${tc.border} border`}>
                              {tc.label}
                            </span>
                            {req.mandatory && (
                              <span className="font-mono text-[9px] px-1.5 py-0.5 uppercase bg-cmba-red/10 text-cmba-red border border-cmba-red/20">
                                Required
                              </span>
                            )}
                            <span className="font-mono text-[9px] text-cmba-grey-mid ml-auto">+{req.xp} XP</span>
                          </div>
                          {req.description && (
                            <p className="text-xs text-cmba-grey mt-1 leading-relaxed">{req.description}</p>
                          )}
                          {req.url && !req.done && pathway.status !== "locked" && (
                            <a
                              href={req.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-2 text-xs font-display font-bold text-cmba-red uppercase tracking-wider hover:text-cmba-red-dark transition-colors"
                            >
                              <ExternalLink size={12} />
                              Start Course
                            </a>
                          )}
                          {req.done && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <CheckCircle size={10} className="text-green-400" />
                              <span className="font-mono text-[10px] text-green-400">+{req.xp} XP earned</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* XP Level Legend */}
      <section className="bg-cmba-black-light border-t border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
          <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider mb-6">
            XP <span className="text-cmba-red">Levels</span>
          </h3>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {XP_LEVELS.map((lvl) => (
              <div
                key={lvl.level}
                className={`bg-cmba-black-card border p-4 text-center ${DEMO_XP >= lvl.xp ? "border-cmba-red/30" : "border-cmba-grey-dark/20 opacity-50"}`}
              >
                <div className="font-display font-black text-3xl text-cmba-red/40 mb-1">{lvl.level}</div>
                <div className="font-display font-bold text-xs text-white uppercase tracking-wider">{lvl.title}</div>
                <div className="font-mono text-[10px] text-cmba-grey-mid mt-1">{lvl.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
