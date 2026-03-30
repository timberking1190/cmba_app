import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Shield,
  Flag,
  ClipboardList,
  Calendar,
  Search,
  ChevronRight,
  ArrowRight,
  Star,
  Trophy,
  Users,
  FileText,
} from "lucide-react";

const quickLinks = [
  {
    title: "COACH HUB",
    desc: "Education modules, certifications, practice resources",
    href: "/coach",
    icon: Shield,
    color: "from-cmba-red to-cmba-red-dark",
    borderColor: "border-cmba-red",
  },
  {
    title: "REFEREE HUB",
    desc: "Signals, mechanics, rules interpretation, certification",
    href: "/ref",
    icon: Flag,
    color: "from-cmba-red-dark to-cmba-red-deep",
    borderColor: "border-cmba-red-dark",
  },
  {
    title: "RULES & INFO",
    desc: "Searchable rulebook, AI-powered Q&A, division rules",
    href: "/rules",
    icon: BookOpen,
    color: "from-cmba-red to-cmba-red-dark",
    borderColor: "border-cmba-red",
  },
  {
    title: "GAME REPORT",
    desc: "Submit game feedback — concerns or compliments",
    href: "/game-report",
    icon: ClipboardList,
    color: "from-cmba-red-dark to-cmba-red-deep",
    borderColor: "border-cmba-red-dark",
  },
];

const announcements = [
  {
    id: 1,
    tag: "REGISTRATION",
    title: "2025-26 Season Registration Now Open",
    body: "Registration for the upcoming season is now live. Early bird pricing available through April 30.",
    date: "Mar 28, 2025",
    pinned: true,
  },
  {
    id: 2,
    tag: "COACHES",
    title: "Spring Coaching Clinic — April 12",
    body: "Free coaching development clinic covering offensive sets for U12-U14 divisions. Register now.",
    date: "Mar 25, 2025",
    pinned: false,
  },
  {
    id: 3,
    tag: "OFFICIALS",
    title: "Referee Development Day — April 5",
    body: "All levels welcome. Focus on game management and 2-official mechanics. Counts toward RAMP certification.",
    date: "Mar 22, 2025",
    pinned: false,
  },
  {
    id: 4,
    tag: "RULES",
    title: "Updated U10 Pressing Rules for 2025-26",
    body: "The board has approved modifications to pressing rules for U10 divisions. Full details in the rulebook.",
    date: "Mar 20, 2025",
    pinned: false,
  },
];

const stats = [
  { value: "2,400+", label: "REGISTERED PLAYERS", icon: Users },
  { value: "180+", label: "CERTIFIED COACHES", icon: Shield },
  { value: "75+", label: "ACTIVE REFEREES", icon: Flag },
  { value: "6", label: "AGE DIVISIONS", icon: Trophy },
];

const divisions = ["U8", "U10", "U12", "U14", "U16", "U18"];

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-hero-gradient overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <svg viewBox="0 0 1200 600" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="100" y="50" width="1000" height="500" stroke="white" strokeWidth="2" />
            <line x1="600" y1="50" x2="600" y2="550" stroke="white" strokeWidth="2" />
            <circle cx="600" cy="300" r="80" stroke="white" strokeWidth="2" />
            <rect x="100" y="150" width="200" height="300" stroke="white" strokeWidth="2" />
            <rect x="900" y="150" width="200" height="300" stroke="white" strokeWidth="2" />
          </svg>
        </div>
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-gradient" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-6">
                <Star size={14} className="text-cmba-red" />
                <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">
                  Official Platform
                </span>
              </div>
              <Image
                src="/cmba-logo.png"
                alt="CMBA"
                width={400}
                height={160}
                className="h-20 sm:h-24 lg:h-32 w-auto mb-2"
                priority
              />
              <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-7xl text-cmba-red uppercase leading-[0.9] tracking-tight mb-4">
                Connect
              </h1>
              <p className="font-display font-semibold text-lg sm:text-xl text-cmba-grey uppercase tracking-[4px] mb-6">
                Calgary Minor Basketball
              </p>
              <p className="text-cmba-grey text-base lg:text-lg max-w-lg mb-8 leading-relaxed">
                Rules, education, certification tracking, and game reports — all in one place. Built for coaches, referees, parents, and administrators.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/rules" className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-red-dark text-white font-display font-bold text-sm uppercase tracking-wider px-6 py-3 transition-colors">
                  <Search size={18} />Search Rules
                </Link>
                <Link href="/coach" className="inline-flex items-center gap-2 border-2 border-cmba-grey-dark text-cmba-grey-light hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-6 py-3 transition-colors">
                  Get Started<ArrowRight size={18} />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className="group bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/50 p-5 transition-all card-hover">
                  <div className="w-10 h-10 bg-cmba-red/10 flex items-center justify-center mb-3">
                    <link.icon size={22} className="text-cmba-red" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-1">{link.title}</h3>
                  <p className="text-xs text-cmba-grey leading-relaxed">{link.desc}</p>
                  <ChevronRight size={16} className="text-cmba-red mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Ticker */}
      <section className="bg-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <div key={stat.label} className={`flex items-center gap-3 py-4 px-4 lg:px-6 ${i > 0 ? "border-l border-white/20" : ""}`}>
                <stat.icon size={24} className="text-white/80 shrink-0" />
                <div>
                  <div className="font-display font-black text-xl lg:text-2xl text-white leading-none">{stat.value}</div>
                  <div className="text-[10px] text-white/70 font-display font-bold uppercase tracking-widest">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ask CMBA Banner */}
      <section className="bg-cmba-black-light border-b border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
            <div className="flex-1">
              <h2 className="font-display font-black text-3xl lg:text-4xl text-white uppercase tracking-tight mb-2">
                ASK <span className="text-cmba-red">CMBA</span>
              </h2>
              <p className="text-cmba-grey max-w-md">
                Type any basketball rule question and get an instant, AI-powered answer with source citations from the official CMBA rulebook.
              </p>
            </div>
            <Link href="/rules" className="w-full lg:w-auto lg:min-w-[400px] flex items-center gap-3 bg-cmba-black-card border border-cmba-grey-dark/30 hover:border-cmba-red/50 px-5 py-4 transition-colors group">
              <Search size={20} className="text-cmba-red shrink-0" />
              <span className="text-cmba-grey text-sm">&quot;Can a U12 team full-court press in the first half?&quot;</span>
              <ArrowRight size={18} className="text-cmba-red ml-auto shrink-0 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* News / Announcements */}
      <section className="bg-cmba-black">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-black text-2xl lg:text-3xl text-white uppercase tracking-tight">
              Latest <span className="text-cmba-red">News</span>
            </h2>
            <Link href="/calendar" className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest hover:text-cmba-red-dark transition-colors flex items-center gap-1">
              See All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {announcements.map((item) => (
              <article key={item.id} className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 transition-all card-hover group">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-[10px] bg-cmba-red/15 text-cmba-red px-2 py-0.5 uppercase tracking-wider font-medium">{item.tag}</span>
                    {item.pinned && <span className="font-mono text-[10px] bg-white/10 text-cmba-grey px-2 py-0.5 uppercase tracking-wider">Pinned</span>}
                  </div>
                  <h3 className="font-display font-bold text-base text-white uppercase tracking-wide leading-tight mb-2 group-hover:text-cmba-red transition-colors">{item.title}</h3>
                  <p className="text-xs text-cmba-grey leading-relaxed mb-3">{item.body}</p>
                  <span className="font-mono text-[10px] text-cmba-grey-mid">{item.date}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Divisions */}
      <section className="bg-cmba-black-light border-y border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="font-display font-black text-2xl lg:text-3xl text-white uppercase tracking-tight mb-8">
            Age <span className="text-cmba-red">Divisions</span>
          </h2>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar scroll-snap-x pb-2">
            {divisions.map((div) => (
              <Link key={div} href={`/rules?division=${div}`} className="shrink-0 w-40 lg:w-48 bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/50 p-6 text-center transition-all card-hover group">
                <div className="font-display font-black text-4xl lg:text-5xl text-cmba-red/20 group-hover:text-cmba-red/40 transition-colors mb-2">{div}</div>
                <div className="font-display font-bold text-sm text-white uppercase tracking-wider">Division</div>
                <div className="text-xs text-cmba-grey mt-1">Rules & Resources</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* For Coaches / Refs / Parents */}
      <section className="bg-cmba-black">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 transition-colors">
              <div className="border-b border-cmba-grey-dark/20 px-6 py-4 flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
                  <Shield size={20} className="text-cmba-red" />For Coaches
                </h3>
                <Link href="/coach" className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider">Enter Hub</Link>
              </div>
              <div className="p-6 space-y-3">
                <Link href="/coach/pathway" className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors"><Trophy size={16} className="text-cmba-red/60" />NCCP Certification Pathway</Link>
                <Link href="/coach/courses" className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors"><BookOpen size={16} className="text-cmba-red/60" />Education Course Library</Link>
                <Link href="/coach/clinics" className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors"><Calendar size={16} className="text-cmba-red/60" />Upcoming Clinics & Workshops</Link>
                <Link href="/coach" className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors"><FileText size={16} className="text-cmba-red/60" />Practice Plan Templates</Link>
              </div>
            </div>

            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 transition-colors">
              <div className="border-b border-cmba-grey-dark/20 px-6 py-4 flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
                  <Flag size={20} className="text-cmba-red" />For Referees
                </h3>
                <Link href="/ref" className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider">Enter Hub</Link>
              </div>
              <div className="p-6 space-y-3">
                <Link href="/ref/quick-ref" className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors"><FileText size={16} className="text-cmba-red/60" />Pre-Game Quick Reference</Link>
                <Link href="/ref/signals" className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors"><BookOpen size={16} className="text-cmba-red/60" />Officiating Signals Guide</Link>
                <Link href="/ref" className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors"><Trophy size={16} className="text-cmba-red/60" />RAMP Certification Pathway</Link>
              </div>
            </div>

            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 transition-colors">
              <div className="border-b border-cmba-grey-dark/20 px-6 py-4 flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
                  <Users size={20} className="text-cmba-red" />For Parents
                </h3>
                <Link href="/rules" className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider">Browse</Link>
              </div>
              <div className="p-6 space-y-3">
                <Link href="/rules" className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors"><Search size={16} className="text-cmba-red/60" />Ask CMBA — AI Rules Search</Link>
                <Link href="/faq" className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors"><BookOpen size={16} className="text-cmba-red/60" />FAQ & Information</Link>
                <Link href="/game-report" className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors"><ClipboardList size={16} className="text-cmba-red/60" />Submit Game Feedback</Link>
                <Link href="/contact" className="flex items-center gap-3 text-sm text-cmba-grey hover:text-white transition-colors"><Users size={16} className="text-cmba-red/60" />Contact Directory</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-red-gradient">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16 text-center">
          <Image
            src="/cmba-logo.png"
            alt="CMBA"
            width={200}
            height={80}
            className="h-14 lg:h-16 w-auto mx-auto mb-6 brightness-0 invert opacity-30"
          />
          <h2 className="font-display font-black text-3xl lg:text-5xl text-white uppercase tracking-tight mb-4">Ready to Get Started?</h2>
          <p className="text-white/80 max-w-lg mx-auto mb-8">
            Whether you&apos;re coaching your first practice or officiating your hundredth game, CMBA Connect has the tools and resources you need.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 bg-white text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-6 py-3 hover:bg-cmba-grey-light transition-colors">Create Account</Link>
            <Link href="/rules" className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-display font-bold text-sm uppercase tracking-wider px-6 py-3 hover:bg-white/10 transition-colors">Browse Rules</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
