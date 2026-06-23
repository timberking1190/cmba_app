import Link from "next/link";
import {
  BookOpen,
  FileText,
  ChevronRight,
  ExternalLink,
  Heart,
  Target,
  Zap,
  Brain,
} from "lucide-react";
import { COURSES, DEV_GUIDES, COACH, DOCS } from "@/lib/cmbaLinks";
import { PhotoHero } from "@/components/media/PhotoHero";
import { PhotoBand } from "@/components/media/PhotoBand";
import { CourtLines } from "@/components/graphics/CourtLines";
import { CalgarySkyline } from "@/components/graphics/CalgarySkyline";

const LTAD_URL = "https://sportforlife.ca/long-term-development/";

const developmentStages = [
  {
    stage: 1,
    title: "Tykes",
    subtitle: "Active Start / FUNdamentals",
    ages: "Ages 5-9",
    borderColor: "border-green-500",
    focus: "Fun, fundamental movement, exploration, play-based learning",
    skills: [
      "Dribble in place with both hands",
      "Basic push shot technique",
      "Chest & bounce pass to stationary partner",
      "Running, jumping, sliding, skipping",
      "Push/pull spacing concepts",
    ],
    equipment: "Size 3-5 ball, lowered hoops (6-8 ft)",
    guide: DEV_GUIDES.tykes,
  },
  {
    stage: 2,
    title: "U11",
    subtitle: "FUNdamentals / Learn to Train",
    ages: "Ages 9-10",
    borderColor: "border-blue-500",
    focus: "Physical literacy, sport-specific skills, decision-making",
    skills: [
      "Dribble both hands while moving",
      "Layups from both sides",
      "Passing to moving partners",
      "Basic defensive stance & slides",
      "V-cuts, L-cuts, spacing",
    ],
    equipment: "Size 5 ball, lowered hoops (8-9 ft)",
    guide: DEV_GUIDES.u11,
  },
  {
    stage: 3,
    title: "U13",
    subtitle: "Learn to Train",
    ages: "Ages 11-12",
    borderColor: "border-yellow-500",
    focus: "Game-like practice, random practice, competitive engagement",
    skills: [
      "Advanced dribbling (hesitation, between-legs)",
      "Shooting off the catch & dribble",
      "Pass-and-move, skip passes",
      "Help defense & rotation",
      "Pick-and-roll/pop, pass-cut-fill",
    ],
    equipment: "Size 6 ball, regulation hoops (10 ft)",
    guide: DEV_GUIDES.u13,
  },
  {
    stage: 4,
    title: "U15",
    subtitle: "Train to Train",
    ages: "Ages 13-14",
    borderColor: "border-orange-500",
    focus: "Game-speed skills, advanced tactics, injury prevention",
    skills: [
      "Advanced dribble combinations in transition",
      "Mid-range & finishing through contact",
      "No-look passes, passing out of traps",
      "Team defensive principles",
      "Set plays, push/pull & pass-cut-fill applied",
    ],
    equipment: "Strength training introduced",
    guide: DEV_GUIDES.u15,
  },
  {
    stage: 5,
    title: "U18",
    subtitle: "Train to Compete",
    ages: "Ages 15-17",
    borderColor: "border-cmba-red",
    focus: "Skill mastery, game intelligence, leadership, mental resilience",
    skills: [
      "Mastery of ball-handling under pressure",
      "Consistent shooting from 3pt under pressure",
      "Pinpoint passing in high-pressure situations",
      "Mastery of man-to-man, press, zone defense",
      "Advanced offensive systems & transition",
    ],
    equipment: "Comprehensive strength & conditioning",
    guide: DEV_GUIDES.u18,
  },
];

const pillars = [
  {
    icon: Target,
    title: "Gradual Challenge",
    desc: "Build skills progressively: 1on0, then 1onGuide, then 1on1. Balance success and challenge.",
  },
  {
    icon: Zap,
    title: "Block vs Random Practice",
    desc: "Block for beginners (technique focus). Random for advanced (game-like decision-making).",
  },
  {
    icon: Brain,
    title: "High Repetition Count",
    desc: "Build muscle memory, motor control, and automaticity through purposeful practice design.",
  },
  {
    icon: Heart,
    title: "Fun as Central Theme",
    desc: "Play drives intrinsic motivation, creativity, social connection, and long-term participation.",
  },
];

const coachResources = [
  { title: "Mandatory Coach Training", desc: "Required online CMBA coach training, hosted on reach360.", href: COURSES.coachTrainingRegister },
  { title: "Essentials Coaching Workbook", desc: "CMBA's practical, season-long coaching workbook.", href: COACH.essentialsWorkbook },
  { title: "Concussion Policy", desc: "Awareness, response, symptoms, and return-to-play protocol.", href: DOCS.concussion },
  { title: "Emergency Action Plan", desc: "What every coach should have ready before practices and games.", href: COACH.emergencyActionPlan },
];

const ruleLinks = [
  { title: "7. Rules of Play (FIBA)", href: DOCS.rulesOfPlay },
  { title: "Division Rule Modifications", href: DOCS.ruleModsGuide },
  { title: "40-Point Mercy Rule", href: DOCS.mercy40 },
  { title: "Concussion Policy", href: DOCS.concussion },
  { title: "Forfeit Policy", href: DOCS.forfeit },
  { title: "3. Fees", href: DOCS.fees },
];

export default function CoachDashboard() {
  return (
    <div>
      {/* Hero */}
      <PhotoHero
        image="indoorGym"
        eyebrow="Coach Education Hub"
        title="Athlete"
        accent="Development"
        subtitle="CMBA's approach to developing basketball players is built on the Long-Term Athlete Development (LTAD) framework and four core pillars of development."
      >
        <div className="flex flex-wrap gap-3">
          <a
            href={COURSES.coachTrainingRegister}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors"
          >
            <ExternalLink size={16} />
            Start Mandatory Training
          </a>
          <Link
            href="/coach/clinics"
            className="inline-flex items-center gap-2 border border-white/30 text-white hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors backdrop-blur-sm text-center"
          >
            Training & Clinics
          </Link>
        </div>
      </PhotoHero>

      {/* Four Pillars */}
      <section className="relative bg-cmba-black/70 overflow-hidden">
        <CourtLines className="pointer-events-none absolute top-0 right-0 w-64 text-cmba-red/[0.06] hidden lg:block" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Four Pillars of <span className="text-cmba-red">Development</span>
          </h2>
          <p className="reveal text-cmba-grey text-sm mb-8">
            Every CMBA coach should build their approach on these four research-backed principles.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((p, i) => (
              <div
                key={p.title}
                style={{ transitionDelay: `${i * 70}ms` }}
                className="reveal rv-scale bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/30 p-5 transition-colors"
              >
                <p.icon size={28} className="text-cmba-red mb-3" />
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-2">
                  {p.title}
                </h3>
                <p className="text-xs text-cmba-grey leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo band */}
      <section className="bg-cmba-black-light/70 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-12 lg:pt-16">
          <PhotoBand
            image="kidsOnCourt"
            side="right"
            eyebrow="In the gym"
            title="Coach the long game"
          >
            <p>Great coaching meets every athlete where they are. CMBA&apos;s stage-based pathway gives you the outcomes, drills, and language to build skills progressively — so practice today sets up the player they become.</p>
          </PhotoBand>
        </div>
      </section>

      {/* LTAD Development Stages */}
      <section className="bg-cmba-black-light/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <div className="flex items-center justify-between mb-2">
            <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight">
              Development <span className="text-cmba-red">Stages</span>
            </h2>
            <a
              href={DEV_GUIDES.master}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider flex items-center gap-1 hover:text-white transition-colors"
            >
              Master Guide <ExternalLink size={12} />
            </a>
          </div>
          <p className="reveal text-cmba-grey text-sm mb-8">
            Each stage maps to CMBA&apos;s Athlete Development Guide for that age group, with specific learning outcomes, coaching approaches, and skill focuses.
          </p>

          <div className="space-y-4">
            {developmentStages.map((stage, i) => (
              <div
                key={stage.stage}
                style={{ transitionDelay: `${i * 60}ms` }}
                className={`reveal rv-left bg-cmba-black-card/80 backdrop-blur-sm border-l-4 ${stage.borderColor} border border-white/12`}
              >
                <div className="p-5 lg:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="lg:w-1/3">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-display font-black text-3xl text-cmba-red/30">
                          {String(stage.stage).padStart(2, "0")}
                        </span>
                        <div>
                          <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                            {stage.title}
                          </h3>
                          <p className="font-display font-semibold text-xs text-cmba-red uppercase tracking-wider">
                            {stage.subtitle}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-cmba-grey-mid bg-cmba-black-surface px-2 py-0.5">
                        {stage.ages}
                      </span>
                      <p className="text-xs text-cmba-grey mt-2 leading-relaxed">
                        <strong className="text-cmba-grey-light">Focus:</strong>{" "}
                        {stage.focus}
                      </p>
                      <p className="text-xs text-cmba-grey mt-1">
                        <strong className="text-cmba-grey-light">Equipment:</strong>{" "}
                        {stage.equipment}
                      </p>
                      <a
                        href={stage.guide}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 font-mono text-[11px] text-cmba-red hover:text-white transition-colors"
                      >
                        Open {stage.title} Guide <ExternalLink size={11} />
                      </a>
                    </div>
                    <div className="lg:w-2/3">
                      <h4 className="font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest mb-2">
                        Learning Outcomes
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-1.5">
                        {stage.skills.map((skill) => (
                          <div
                            key={skill}
                            className="flex items-start gap-2 text-xs text-cmba-grey"
                          >
                            <ChevronRight
                              size={12}
                              className="text-cmba-red shrink-0 mt-0.5"
                            />
                            {skill}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key coach resources */}
      <section className="bg-cmba-black/70">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Essential <span className="text-cmba-red">Resources</span>
          </h2>
          <p className="reveal text-cmba-grey text-sm mb-8">
            The documents and training every CMBA coach should have on hand.
          </p>
          <div className="bento">
            {coachResources.map((r, i) => (
              <a
                key={r.title}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ transitionDelay: `${i * 70}ms` }}
                className="bento-tile bento-c2 reveal rv-scale group"
              >
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 bg-cmba-red/10 flex items-center justify-center shrink-0">
                    <BookOpen size={20} className="text-cmba-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">
                      {r.title}
                    </h3>
                    <p className="text-xs text-cmba-grey">{r.desc}</p>
                  </div>
                  <ExternalLink size={16} className="text-cmba-grey-dark shrink-0" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Rules Quick Links */}
      <section className="bg-cmba-black-light/70 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <div className="flex items-center justify-between mb-2">
            <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight">
              Rules & <span className="text-cmba-red">Policies</span>
            </h2>
            <Link href="/rules" className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider flex items-center gap-1 hover:text-white transition-colors">
              Search All Rules <ChevronRight size={14} />
            </Link>
          </div>
          <p className="reveal text-cmba-grey text-sm mb-8">
            Key rules documents every coach should know. You can also search the full rulebook in the app.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ruleLinks.map((rule, i) => (
              <a
                key={rule.title}
                href={rule.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ transitionDelay: `${i * 60}ms` }}
                className="reveal rv-right flex items-center gap-3 bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/30 p-3 transition-colors group"
              >
                <FileText size={16} className="text-cmba-red shrink-0" />
                <span className="flex-1 font-display font-bold text-xs text-cmba-grey-light uppercase tracking-wider group-hover:text-cmba-red transition-colors">
                  {rule.title}
                </span>
                <ExternalLink size={13} className="text-cmba-grey-dark shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-cmba-red overflow-hidden">
        <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-20 text-black/10" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-8 text-center">
          <p className="text-white/90 text-sm mb-4">
            Thank you for volunteering to coach in CMBA and for taking the time
            to grow and develop by utilizing these resources.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={LTAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-2.5 hover:bg-cmba-grey-light transition-colors"
            >
              <ExternalLink size={14} />
              Sport for Life LTAD Framework
            </a>
            <Link
              href="/rules"
              className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-2.5 hover:bg-white/10 transition-colors"
            >
              Search All Rules & Guides
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
