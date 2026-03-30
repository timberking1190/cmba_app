import Link from "next/link";
import {
  Trophy,
  BookOpen,
  FileText,
  ChevronRight,
  ExternalLink,
  Heart,
  Target,
  Zap,
  Brain,
  ArrowRight,
} from "lucide-react";

const LTAD_URL = "https://sportforlife.ca/long-term-development/";

const developmentStages = [
  {
    stage: 1,
    title: "Tykes",
    subtitle: "Active Start / FUNdamentals",
    ages: "Ages 5-9",
    color: "from-green-500 to-green-600",
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
  },
  {
    stage: 2,
    title: "Under 11",
    subtitle: "FUNdamentals / Learn to Train",
    ages: "Ages 9-10",
    color: "from-blue-500 to-blue-600",
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
  },
  {
    stage: 3,
    title: "Under 13",
    subtitle: "Learn to Train",
    ages: "Ages 11-12",
    color: "from-yellow-500 to-yellow-600",
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
  },
  {
    stage: 4,
    title: "Under 15",
    subtitle: "Train to Train",
    ages: "Ages 13-14",
    color: "from-orange-500 to-orange-600",
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
  },
  {
    stage: 5,
    title: "Under 18",
    subtitle: "Train to Compete",
    ages: "Ages 15-17",
    color: "from-cmba-red to-cmba-red-dark",
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
  {
    title: "Conversations in the Car",
    desc: "Guide for parents on supporting young athletes with thoughtful post-game feedback",
    href: "/rules",
    search: "car conversations",
  },
  {
    title: "Concussion Management",
    desc: "Protocol for all ages — awareness, response, symptoms, return-to-play",
    href: "/rules",
    search: "concussion",
  },
  {
    title: "Mental Health in Coaching",
    desc: "Fostering supportive environments, recognizing struggles, building resilience",
    href: "/rules",
    search: "mental health",
  },
  {
    title: "Gender Differences in Coaching",
    desc: "Age-specific considerations for coaching boys and girls effectively",
    href: "/rules",
    search: "gender",
  },
];

export default function CoachDashboard() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
                <Trophy size={14} className="text-cmba-red" />
                <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">
                  Coach Education Hub
                </span>
              </div>
              <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
                ATHLETE <span className="text-cmba-red">DEVELOPMENT</span>
              </h1>
              <p className="text-cmba-grey mt-2 max-w-xl">
                CMBA&apos;s approach to developing basketball players is built on
                the Long-Term Athlete Development (LTAD) framework and four
                core pillars of development.
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href={LTAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-cmba-red hover:bg-cmba-red-dark text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors"
              >
                <ExternalLink size={16} />
                Sport for Life LTAD
              </a>
              <Link
                href="/rules"
                className="border border-cmba-grey-dark text-cmba-grey-light hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors"
              >
                Search Rules
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Four Pillars */}
      <section className="bg-cmba-black">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Four Pillars of <span className="text-cmba-red">Development</span>
          </h2>
          <p className="text-cmba-grey text-sm mb-8">
            Every CMBA coach should build their approach on these four research-backed principles.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 p-5 transition-colors"
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

      {/* LTAD Development Stages */}
      <section className="bg-cmba-black-light border-y border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">
              Development <span className="text-cmba-red">Stages</span>
            </h2>
            <a
              href={LTAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider flex items-center gap-1 hover:text-cmba-red-dark"
            >
              LTAD Framework <ExternalLink size={12} />
            </a>
          </div>
          <p className="text-cmba-grey text-sm mb-8">
            Based on Sport for Life&apos;s Long-Term Athlete Development model.
            Each stage has specific learning outcomes, coaching approaches, and
            skill focuses.
          </p>

          <div className="space-y-4">
            {developmentStages.map((stage) => (
              <div
                key={stage.stage}
                className={`bg-cmba-black-card border-l-4 ${stage.borderColor} border border-cmba-grey-dark/20`}
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

      {/* Other Important Topics */}
      <section className="bg-cmba-black">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Other Important <span className="text-cmba-red">Topics</span>
          </h2>
          <p className="text-cmba-grey text-sm mb-8">
            Essential resources for CMBA coaches covering safety, mental health,
            parent communication, and inclusive coaching.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {coachResources.map((r) => (
              <Link
                key={r.title}
                href={`${r.href}?q=${encodeURIComponent(r.search)}`}
                className="flex items-center gap-4 bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 p-4 transition-colors group"
              >
                <div className="w-10 h-10 bg-cmba-red/10 flex items-center justify-center shrink-0">
                  <BookOpen size={20} className="text-cmba-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">
                    {r.title}
                  </h3>
                  <p className="text-xs text-cmba-grey">{r.desc}</p>
                </div>
                <ArrowRight
                  size={16}
                  className="text-cmba-grey-dark shrink-0"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Rules Quick Links */}
      <section className="bg-cmba-black-light border-t border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Rules & <span className="text-cmba-red">Policies</span>
          </h2>
          <p className="text-cmba-grey text-sm mb-8">
            Key rules documents every coach should know.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { title: "Rules of Play (FIBA)", search: "rules of play" },
              { title: "Division Modifications", search: "rule modifications" },
              { title: "Discipline Policy", search: "discipline" },
              { title: "Concussion Policy", search: "concussion" },
              { title: "Mercy Policy", search: "mercy" },
              { title: "Overtime Rules", search: "overtime" },
            ].map((rule) => (
              <Link
                key={rule.title}
                href={`/rules?q=${encodeURIComponent(rule.search)}`}
                className="flex items-center gap-3 bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 p-3 transition-colors group"
              >
                <FileText size={16} className="text-cmba-red shrink-0" />
                <span className="font-display font-bold text-xs text-cmba-grey-light uppercase tracking-wider group-hover:text-cmba-red transition-colors">
                  {rule.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 text-center">
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
