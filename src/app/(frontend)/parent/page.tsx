import Link from "next/link";
import {
  Users, ExternalLink, ArrowRight, PlayCircle, ShieldCheck, Heart, Phone, BookOpen, ChevronRight,
} from "lucide-react";
import { CMBA, COURSES, DOCS, SUPPORT, REGISTER } from "@/lib/cmbaLinks";
import { PersonalizedStrip } from "@/components/PersonalizedStrip";

const steps = [
  { n: "01", title: "Spectator Training", required: true, desc: "CMBA's online course on being a positive presence in the stands. Every family should complete it.", href: COURSES.spectator },
  { n: "02", title: "Safe CMBA Interactions", required: true, desc: "Safe-sport expectations for everyone around the game, including parents and volunteers.", href: COURSES.safeInteractions },
  { n: "03", title: "Managing the Moment", required: false, desc: "Practical tools for keeping your cool and modelling good behaviour on game day.", href: COURSES.managingTheMoment },
  { n: "04", title: "Know the Code", required: false, desc: "The Sportsmanship and Conduct Committee (SCC) Code of Conduct that all participants agree to.", href: DOCS.sccCodeOfConduct },
  { n: "05", title: "Understand the Rule of Two", required: false, desc: "How CMBA supervises and protects young athletes at every practice and game.", href: DOCS.ruleOfTwo },
];

const supporting = [
  { title: "Athlete Development Guides", desc: "See exactly what your athlete is working on at each stage.", href: "/athlete", internal: true },
  { title: "Concussion Awareness", desc: "Recognize symptoms and follow CMBA's return-to-play protocol.", href: DOCS.concussion },
  { title: "Season Fees", desc: "What registration covers and how fees are set each season.", href: DOCS.fees },
];

const support = [
  { title: "KidSport Calgary", desc: "Financial assistance so cost is never a barrier to play.", href: SUPPORT.kidSport, icon: Heart },
  { title: "Kids Help Phone", desc: "Free, confidential support for young people, 24/7.", href: SUPPORT.kidsHelpPhone, icon: Phone },
  { title: "Official Calendar", desc: "Key dates, schedules, and registration deadlines.", href: DOCS.officialCalendar, icon: BookOpen },
];

export default function ParentPage() {
  return (
    <div>
      <PersonalizedStrip variant="parent" />
      {/* Hero */}
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <Users size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Parent & Spectator Hub · Training</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            FOR <span className="text-cmba-red">PARENTS</span>
          </h1>
          <p className="text-cmba-grey mt-2 max-w-xl">
            You are part of the team too. Complete CMBA&apos;s short parent education pathway, then use these resources to support your athlete all season long.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a href={COURSES.spectator} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
              <PlayCircle size={16} /> Start Spectator Training
            </a>
            <a href={CMBA.emailHref}
              className="inline-flex items-center gap-2 border border-white/20 text-white hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
              <Phone size={16} /> Contact CMBA
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-12">
        {/* Parent education pathway */}
        <div>
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2 flex items-center gap-2">
            <ShieldCheck size={22} className="text-cmba-red" /> Parent Education Pathway
          </h2>
          <p className="text-cmba-grey text-sm mb-6">A short, free sequence on reach360 and cmba.ab.ca. Start with the required steps.</p>
          <div className="space-y-3">
            {steps.map((s) => (
              <a key={s.n} href={s.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-5 transition-colors group">
                <span className="font-display font-black text-3xl text-cmba-red/30 shrink-0">{s.n}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">{s.title}</h3>
                    <span className={`font-mono text-[9px] px-1.5 py-0.5 uppercase tracking-wider ${s.required ? "bg-cmba-red/15 text-cmba-red" : "bg-white/10 text-cmba-grey"}`}>
                      {s.required ? "Required" : "Recommended"}
                    </span>
                  </div>
                  <p className="text-xs text-cmba-grey mt-1 leading-relaxed">{s.desc}</p>
                </div>
                <ExternalLink size={16} className="text-cmba-grey-dark shrink-0" />
              </a>
            ))}
          </div>
        </div>

        {/* Supporting your athlete */}
        <div>
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2 flex items-center gap-2">
            <Heart size={22} className="text-cmba-red" /> Supporting Your Athlete
          </h2>
          <p className="text-cmba-grey text-sm mb-6">Understand what your athlete is learning and how to back them up.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {supporting.map((item) => {
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">{item.title}</h3>
                    {item.internal ? <ChevronRight size={14} className="text-cmba-grey-dark shrink-0" /> : <ExternalLink size={14} className="text-cmba-grey-dark shrink-0" />}
                  </div>
                  <p className="text-xs text-cmba-grey mt-2 leading-relaxed">{item.desc}</p>
                </>
              );
              return item.internal ? (
                <Link key={item.title} href={item.href} className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-5 transition-colors group">{inner}</Link>
              ) : (
                <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer" className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-5 transition-colors group">{inner}</a>
              );
            })}
          </div>
        </div>

        {/* Help & support */}
        <div>
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2">Help & <span className="text-cmba-red">Support</span></h2>
          <p className="text-cmba-grey text-sm mb-6">CMBA and its partners are here for your family.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {support.map((s) => (
              <a key={s.title} href={s.href} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-4 transition-colors group">
                <s.icon size={18} className="text-cmba-red shrink-0 mt-0.5" />
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
          <p className="text-white/90 text-sm mb-4">Ready to sign your athlete up? League registration happens on TeamLinkt.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={REGISTER.player} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-2.5 hover:bg-cmba-grey-light transition-colors">
              Register on TeamLinkt <ArrowRight size={16} />
            </a>
            <Link href="/faq"
              className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-2.5 hover:bg-white/10 transition-colors">
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
