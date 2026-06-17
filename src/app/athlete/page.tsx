import Link from "next/link";
import {
  Trophy, ExternalLink, ChevronRight, BookOpen, ClipboardCheck, PlayCircle,
  ShieldCheck, ArrowRight, Dumbbell,
} from "lucide-react";
import { DEV_GUIDES, REPORT_CARDS, COACH, DOCS, REGISTER } from "@/lib/cmbaLinks";

const pathway = [
  { stage: "01", title: "Tykes", ages: "Ages 5-9", focus: "Fall in love with the game. Fundamental movement, ball skills, and play.", guide: DEV_GUIDES.tykes, card: REPORT_CARDS.tykes },
  { stage: "02", title: "U11", ages: "Ages 9-10", focus: "Physical literacy and core skills: dribbling, layups, passing, and spacing.", guide: DEV_GUIDES.u11, card: REPORT_CARDS.u11 },
  { stage: "03", title: "U13", ages: "Ages 11-12", focus: "Learn to train. Game-like reps, decision-making, and team concepts.", guide: DEV_GUIDES.u13, card: REPORT_CARDS.u13 },
  { stage: "04", title: "U15", ages: "Ages 13-14", focus: "Train to train. Game-speed skills, advanced tactics, and athleticism.", guide: DEV_GUIDES.u15, card: REPORT_CARDS.u15 },
  { stage: "05", title: "U18", ages: "Ages 15-17", focus: "Train to compete. Skill mastery, game IQ, leadership, and resilience.", guide: DEV_GUIDES.u18, card: REPORT_CARDS.u18 },
];

const drills = [
  { title: "CMBA Drills Library (YouTube)", desc: "Filmed drills you can practice at home.", href: COACH.drillsYouTube },
  { title: "Explode / Explore / Execute", desc: "CMBA's skill-development drill site.", href: COACH.cspDrills },
  { title: "Master Development Guide", desc: "Every stage and skill outcome in one document.", href: DEV_GUIDES.master },
];

const safeSport = [
  { title: "Rule of Two", desc: "How CMBA keeps every athlete safe and supported.", href: DOCS.ruleOfTwo },
  { title: "Code of Conduct", desc: "How we treat teammates, opponents, and officials.", href: DOCS.sccCodeOfConduct },
  { title: "Concussion Awareness", desc: "Recognize, report, and recover the right way.", href: DOCS.concussion },
];

export default function AthletePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <Trophy size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Athlete Hub · Training</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            ATHLETE <span className="text-cmba-red">DEVELOPMENT</span>
          </h1>
          <p className="text-cmba-grey mt-2 max-w-xl">
            Your path through CMBA, stage by stage. Each level has a development guide and a report card so you always know what to work on next.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a href={DEV_GUIDES.master} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
              <BookOpen size={16} /> Open Master Guide
            </a>
            <a href={COACH.drillsYouTube} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 text-white hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
              <PlayCircle size={16} /> Watch Drills
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-12">
        {/* Development pathway */}
        <div>
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Your Development <span className="text-cmba-red">Pathway</span>
          </h2>
          <p className="text-cmba-grey text-sm mb-6">Five stages from first dribble to senior basketball. Open your guide and report card for your age group.</p>
          <div className="space-y-3">
            {pathway.map((p) => (
              <div key={p.title} className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-5 lg:p-6">
                  <div className="flex items-center gap-4 lg:w-72 shrink-0">
                    <span className="font-display font-black text-3xl text-cmba-red/30">{p.stage}</span>
                    <div>
                      <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">{p.title}</h3>
                      <span className="font-mono text-[10px] text-cmba-grey-mid uppercase">{p.ages}</span>
                    </div>
                  </div>
                  <p className="flex-1 text-sm text-cmba-grey leading-relaxed">{p.focus}</p>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <a href={p.guide} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-cmba-red hover:text-white border border-cmba-red/30 hover:border-cmba-red px-3 py-1.5 transition-colors">
                      <BookOpen size={12} /> Guide
                    </a>
                    <a href={p.card} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-cmba-grey-light hover:text-white border border-white/15 hover:border-white/40 px-3 py-1.5 transition-colors">
                      <ClipboardCheck size={12} /> Report Card
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills & drills */}
        <div>
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2 flex items-center gap-2">
            <Dumbbell size={22} className="text-cmba-red" /> Skills & Drills
          </h2>
          <p className="text-cmba-grey text-sm mb-6">Practice on your own time with CMBA&apos;s filmed drills and skill resources.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {drills.map((d) => (
              <a key={d.title} href={d.href} target="_blank" rel="noopener noreferrer"
                className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-5 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">{d.title}</h3>
                  <ExternalLink size={14} className="text-cmba-grey-dark shrink-0" />
                </div>
                <p className="text-xs text-cmba-grey mt-2 leading-relaxed">{d.desc}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Play the right way */}
        <div>
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2 flex items-center gap-2">
            <ShieldCheck size={22} className="text-cmba-red" /> Play the Right Way
          </h2>
          <p className="text-cmba-grey text-sm mb-6">Basketball is better when everyone plays safe and plays fair.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {safeSport.map((s) => (
              <a key={s.title} href={s.href} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-4 transition-colors group">
                <ChevronRight size={16} className="text-cmba-red shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">{s.title}</h3>
                  <p className="text-xs text-cmba-grey mt-1">{s.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="bg-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 text-center">
          <p className="text-white/90 text-sm mb-4">Ready to get on the court? League registration happens on TeamLinkt.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={REGISTER.player} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-2.5 hover:bg-cmba-grey-light transition-colors">
              Register on TeamLinkt <ArrowRight size={16} />
            </a>
            <Link href="/rules"
              className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-2.5 hover:bg-white/10 transition-colors">
              Learn the Rules
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
