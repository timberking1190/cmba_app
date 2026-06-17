import { Calendar, ExternalLink, ArrowRight, Trophy, Sun, Snowflake, Users } from "lucide-react";
import { CMBA, DOCS, REGISTER } from "@/lib/cmbaLinks";

const phases = [
  {
    icon: Snowflake,
    season: "Fall / Winter League",
    window: "Roughly November through March",
    desc: "CMBA's main season: the Club Weeknight League and the Rec Weekend League across Tykes, U11, U13, U15, and U18.",
    links: [
      { label: "Register a Player", href: REGISTER.player },
      { label: "Register as a Coach", href: REGISTER.coach },
      { label: "Schedules & Standings", href: REGISTER.zonesAndSchedules },
    ],
  },
  {
    icon: Sun,
    season: "Spring League",
    window: "Roughly April through June",
    desc: "Weeknight Club League and Weekend Rec League spring programs. See the 2026 technical package for divisions, fees, and key dates.",
    links: [
      { label: "2026 Spring League Package", href: DOCS.springLeague },
      { label: "Player Registration", href: REGISTER.player },
      { label: "Team Registration", href: REGISTER.weeknightTeam },
    ],
  },
  {
    icon: Trophy,
    season: "Summer Camps",
    window: "Roughly July and August",
    desc: "Skill-development camps for all age groups. Details, locations, and registration are in the summer camps information package.",
    links: [{ label: "Summer Camps 2026 Package", href: DOCS.summerCamps }],
  },
];

export default function CalendarPage() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <Calendar size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Season Calendar</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            SEASON <span className="text-cmba-red">CALENDAR</span>
          </h1>
          <p className="text-cmba-grey mt-2 max-w-xl">
            Exact game schedules, critical dates, and registration deadlines are published on CMBA&apos;s official calendar and on TeamLinkt. Use the links below to jump straight to the live source.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a href={DOCS.officialCalendar} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
              <ExternalLink size={16} /> Official CMBA Calendar
            </a>
            <a href={REGISTER.zonesAndSchedules} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 text-white hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
              <ExternalLink size={16} /> Schedules & Standings
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-4">
        <h2 className="font-display font-black text-xl text-white uppercase tracking-wider mb-2">Season Phases</h2>
        {phases.map((p) => (
          <div key={p.season} className="bg-cmba-black/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 transition-colors">
            <div className="flex flex-col lg:flex-row">
              <div className="lg:w-44 bg-cmba-red/10 flex flex-col items-center justify-center p-6 border-b lg:border-b-0 lg:border-r border-white/10 text-center">
                <p.icon size={28} className="text-cmba-red mb-2" />
                <div className="font-mono text-[10px] text-cmba-grey uppercase tracking-wider">{p.window}</div>
              </div>
              <div className="flex-1 p-5 lg:p-6">
                <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">{p.season}</h3>
                <p className="text-sm text-cmba-grey mt-1 mb-4 leading-relaxed">{p.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {p.links.map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-cmba-red hover:text-white border border-cmba-red/30 hover:border-cmba-red px-3 py-1.5 transition-colors">
                      {l.label} <ArrowRight size={12} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-cmba-black/80 backdrop-blur-sm border border-white/12 p-6 flex items-start gap-3">
          <Users size={18} className="text-cmba-red shrink-0 mt-0.5" />
          <p className="text-sm text-cmba-grey leading-relaxed">
            Questions about dates or registration? Email{" "}
            <a href={CMBA.emailHref} className="text-cmba-red hover:text-white transition-colors">{CMBA.email}</a>{" "}
            or call {CMBA.phone}.
          </p>
        </div>
      </div>
    </div>
  );
}
