import Link from "next/link";
import {
  BookOpen, Shield, Flag, ClipboardList, Calendar, Search,
  ArrowRight, Trophy, Users, FileText,
} from "lucide-react";
import { HeroNetwork } from "@/components/HeroNetwork";
import { CountUp } from "@/components/CountUp";
import { AnnouncementsStrip } from "@/components/AnnouncementsStrip";
import { REGISTER, DOCS, COURSES } from "@/lib/cmbaLinks";

const hubs = [
  { num: "01", title: "Athlete Hub", meta: "Development · Guides · Drills", href: "/athlete" },
  { num: "02", title: "Coach Hub", meta: "Education · Certification", href: "/coach" },
  { num: "03", title: "Referee Hub", meta: "Signals · Mechanics · RAMP", href: "/ref" },
  { num: "04", title: "Parent Hub", meta: "Spectator training · Support", href: "/parent" },
  { num: "05", title: "Rules & Info", meta: "Rulebook · AI Q&A", href: "/rules" },
  { num: "06", title: "Game Report", meta: "Concerns · Compliments", href: "/game-report" },
  { num: "07", title: "Season Calendar", meta: "Clinics · Key dates", href: "/calendar" },
];

const announcements = [
  { tag: "SPRING LEAGUE", title: "2026 Spring League", body: "Weeknight Club and Weekend Rec spring programs. See the technical package for divisions, fees, and key dates.", date: "Spring 2026", href: DOCS.springLeague, pinned: true },
  { tag: "SUMMER CAMPS", title: "Summer Camps 2026", body: "Skill-development camps for all age groups across the city. Full details and registration in the information package.", date: "Summer 2026", href: DOCS.summerCamps, pinned: false },
  { tag: "REGISTRATION", title: "Register on TeamLinkt", body: "Player and coach registration for CMBA leagues runs through TeamLinkt. Create an account to sign up.", date: "Each season", href: REGISTER.player, pinned: false },
  { tag: "COACHES", title: "Mandatory Coach Training", body: "All CMBA coaches complete the required online training before the season. Start the course on reach360.", date: "Before season", href: COURSES.coachTrainingRegister, pinned: false },
];

const stats = [
  { value: "7,000+", label: "Athletes" },
  { value: "2,000+", label: "Coaches" },
  { value: "300+", label: "Officials" },
  { value: "5", label: "Age Groups" },
];

const divisions = [
  { label: "Tykes", href: "/coach" },
  { label: "U11", href: "/rules?division=U11" },
  { label: "U13", href: "/rules?division=U13" },
  { label: "U15", href: "/rules?division=U15" },
  { label: "U18", href: "/rules?division=U18" },
];

export default function HomePage() {
  return (
    <div>
      <AnnouncementsStrip />
      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="px-5 md:px-10 lg:px-14 pt-16 lg:pt-24 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto relative">
          {/* animated centerpiece (desktop only, behind the headline, non-interactive) */}
          <HeroNetwork className="hidden lg:block absolute right-0 xl:-right-6 top-2 z-0 opacity-60" />

          <div className="relative z-10">
            <div className="mb-7 label-xs text-cmba-grey">
              CMBA+ · Calgary Minor Basketball
            </div>

            <h1 className="font-display font-black uppercase leading-[0.84] tracking-tighter2 text-[clamp(26px,7.5vw,52px)] lg:text-[clamp(44px,9.5vw,132px)]">
              <span className="rise-line"><span className="block text-white">Every athlete.</span></span>
              <span className="rise-line"><span className="block text-cmba-grey-light" style={{ animationDelay: ".08s" }}>Every parent.</span></span>
              <span className="rise-line"><span className="block text-cmba-red" style={{ animationDelay: ".16s" }}>Every coach.</span></span>
              <span className="rise-line"><span className="block text-cmba-grey" style={{ animationDelay: ".24s" }}>Every official.</span></span>
            </h1>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-7 mt-10">
              <p className="max-w-[44ch] text-cmba-grey-light/90 text-base md:text-lg leading-relaxed">
                Calgary Minor Basketball is a community of thousands of athletes, parents, coaches,
                and officials growing the game across the city, one practice, whistle, and final
                buzzer at a time.{" "}
                <span className="text-white font-medium">CMBA+ keeps our rules, coaching, and officiating resources in one place.</span>
              </p>
              <div className="flex flex-col xs:flex-row gap-3">
                <Link href="/rules"
                  className="font-display font-black uppercase text-lg tracking-[0.04em] bg-cmba-red text-white px-8 py-4 hover:bg-cmba-hot transition-colors text-center">
                  Browse the rules
                </Link>
                <Link href="/login"
                  className="font-display font-black uppercase text-lg tracking-[0.04em] border border-white/20 text-white px-8 py-4 hover:border-white/45 transition-colors text-center">
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ────────────────────────────────────────── */}
      <div className="marq">
        <div className="marq-track">
          <span>Rules <span className="red">+</span> Coaches <span className="red">+</span> Referees <span className="red">+</span> Reports <span className="red">+</span>&nbsp;</span>
          <span>Rules <span className="red">+</span> Coaches <span className="red">+</span> Referees <span className="red">+</span> Reports <span className="red">+</span>&nbsp;</span>
        </div>
        <div className="marq-track rev mt-1" aria-hidden="true">
          <span>Athletes <span className="red">+</span> Parents <span className="red">+</span> Officials <span className="red">+</span> Community <span className="red">+</span>&nbsp;</span>
          <span>Athletes <span className="red">+</span> Parents <span className="red">+</span> Officials <span className="red">+</span> Community <span className="red">+</span>&nbsp;</span>
        </div>
      </div>

      {/* ── STATEMENT ──────────────────────────────────────── */}
      <section className="px-5 md:px-10 lg:px-14 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto">
          <h2 className="reveal font-display font-black uppercase leading-[0.95] tracking-tighter2 max-w-[20ch]"
              style={{ fontSize: "clamp(32px, 5.2vw, 74px)" }}>
            One platform for <span className="text-cmba-red">every whistle</span>,{" "}
            <span className="text-cmba-grey-mid">every clipboard</span>, every kid on the court.
          </h2>
        </div>
      </section>

      {/* ── HUB INDEX ──────────────────────────────────────── */}
      <section className="reveal px-5 md:px-10 lg:px-14 pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="label-sm text-cmba-grey">The Platform</h3>
            <span className="font-mono text-xs text-cmba-grey-mid">[ 07 ]</span>
          </div>
          <div className="ix">
            {hubs.map((h, i) => (
              <Link key={h.href} href={h.href} className="ix-row group reveal" aria-label={h.title}
                style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="n">{h.num}</span>
                <span className="t">{h.title}</span>
                <span className="meta hidden sm:block">{h.meta}</span>
                <span className="arr">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────── */}
      <section className="reveal px-5 md:px-10 lg:px-14 pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/12 border border-white/12">
            {stats.map((s, i) => (
              <div key={s.label} className="bg-cmba-black/80 backdrop-blur-sm p-5 sm:p-7 lg:p-9 reveal"
                   style={{ transitionDelay: `${i * 90}ms` }}>
                <div className={`font-display font-black tab leading-none ${i % 2 === 0 ? "text-cmba-red" : "text-white"}`}
                     style={{ fontSize: "clamp(28px, 6.2vw, 68px)" }}>
                  <CountUp value={s.value} className="block" />
                </div>
                <div className="label-xs text-cmba-grey mt-3">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIVISIONS ──────────────────────────────────────── */}
      <section className="reveal px-5 md:px-10 lg:px-14 pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <h3 className="label-sm text-cmba-grey">Age Groups</h3>
            <span className="font-mono text-xs text-cmba-grey-mid">[ Tykes · U18 ]</span>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar scroll-snap-x pb-2">
            {divisions.map((div) => (
              <Link key={div.label} href={div.href}
                className="shrink-0 w-40 lg:w-48 bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/60 p-6 text-center transition-all card-hover group">
                <div className="font-display font-black text-5xl lg:text-6xl text-cmba-red/25 group-hover:text-cmba-red/55 transition-colors mb-2 tracking-tighter2">{div.label}</div>
                <div className="font-mono text-[11px] text-white uppercase tracking-[0.14em]">Age Group</div>
                <div className="text-xs text-cmba-grey mt-1">Rules & Resources</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANNOUNCEMENTS ──────────────────────────────────── */}
      <section className="reveal px-5 md:px-10 lg:px-14 pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <h3 className="label-sm text-cmba-grey">Latest from CMBA</h3>
            <Link href="/calendar" className="font-mono text-xs text-cmba-red tracking-[0.1em] uppercase hover:text-white transition-colors">All news →</Link>
          </div>
          <div className="grid md:grid-cols-2 gap-px bg-white/12 border border-white/12">
            {announcements.map((a) => (
              <a key={a.title} href={a.href} target="_blank" rel="noopener noreferrer" className="bg-cmba-black/80 backdrop-blur-sm p-6 group block">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[10px] tracking-[0.14em] uppercase bg-cmba-red/15 text-cmba-red px-2 py-1">{a.tag}</span>
                  {a.pinned && <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-cmba-grey-mid">Pinned</span>}
                  <span className="ml-auto font-mono text-[11px] text-cmba-grey-mid">{a.date}</span>
                </div>
                <h4 className="font-display font-black uppercase text-xl text-white tracking-tight leading-tight mb-2 group-hover:text-cmba-red transition-colors">{a.title}</h4>
                <p className="text-sm text-cmba-grey leading-relaxed">{a.body}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLE CARDS ─────────────────────────────────────── */}
      <section className="reveal px-5 md:px-10 lg:px-14 pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/12 border border-white/12">
          {[
            { icon: Trophy, title: "For Athletes", cta: { label: "Enter Hub", href: "/athlete" }, links: [
              { icon: Trophy, label: "Development Pathway", href: "/athlete" },
              { icon: BookOpen, label: "Guides & Report Cards", href: "/athlete" },
              { icon: Search, label: "Skill Drills", href: "/athlete" },
              { icon: FileText, label: "Rules of the Game", href: "/rules" },
            ]},
            { icon: Shield, title: "For Coaches", cta: { label: "Enter Hub", href: "/coach" }, links: [
              { icon: Trophy, label: "Certification Pathway", href: "/coach/pathway" },
              { icon: BookOpen, label: "Education Course Library", href: "/coach/courses" },
              { icon: Calendar, label: "Training & Clinics", href: "/coach/clinics" },
              { icon: FileText, label: "Athlete Development", href: "/coach" },
            ]},
            { icon: Flag, title: "For Referees", cta: { label: "Enter Hub", href: "/ref" }, links: [
              { icon: FileText, label: "Pre-Game Quick Reference", href: "/ref/quick-ref" },
              { icon: BookOpen, label: "Officiating Signals Guide", href: "/ref/signals" },
              { icon: Trophy, label: "RAMP Certification Pathway", href: "/ref" },
            ]},
            { icon: Users, title: "For Parents", cta: { label: "Enter Hub", href: "/parent" }, links: [
              { icon: BookOpen, label: "Parent Education Pathway", href: "/parent" },
              { icon: Search, label: "Ask CMBA: AI Rules Search", href: "/rules" },
              { icon: ClipboardList, label: "Submit Game Feedback", href: "/game-report" },
              { icon: Users, label: "Contact Directory", href: "/contact" },
            ]},
          ].map((col) => (
            <div key={col.title} className="bg-cmba-black/80 backdrop-blur-sm">
              <div className="border-b border-white/12 px-6 py-4 flex items-center justify-between">
                <h3 className="font-display font-black text-lg text-white uppercase tracking-tight flex items-center gap-2">
                  <col.icon size={20} className="text-cmba-red" />{col.title}
                </h3>
                <Link href={col.cta.href} className="font-mono text-[11px] text-cmba-red uppercase tracking-[0.14em] hover:text-white transition-colors">{col.cta.label}</Link>
              </div>
              <div className="p-6 space-y-3.5">
                {col.links.map((l) => (
                  <Link key={l.label} href={l.href} className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors">
                    <l.icon size={16} className="text-cmba-red/60" />{l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="reveal px-5 md:px-10 lg:px-14 pb-24">
        <div className="max-w-7xl mx-auto bg-red-gradient px-6 lg:px-14 py-16 lg:py-24 text-center">
          <h2 className="font-display font-black uppercase tracking-tighter2 text-white leading-[0.85]"
              style={{ fontSize: "clamp(34px, 8vw, 130px)" }}>
            Ready to<br />get started?
          </h2>
          <p className="text-white/85 max-w-lg mx-auto mt-6 mb-8 leading-relaxed">
            Whether you&apos;re coaching your first practice or officiating your hundredth game,
            CMBA+ has the tools and resources you need.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={REGISTER.player} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-cmba-red font-display font-black text-sm uppercase tracking-[0.06em] px-7 py-3.5 hover:bg-cmba-grey-light transition-colors">
              Register on TeamLinkt <ArrowRight size={16} />
            </a>
            <Link href="/rules" className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-display font-black text-sm uppercase tracking-[0.06em] px-7 py-3.5 hover:bg-white/10 transition-colors">
              Browse Rules
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
