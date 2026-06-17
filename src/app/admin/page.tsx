import Link from "next/link";
import {
  Users, ShieldAlert, CalendarDays, ClipboardList, ExternalLink, Gavel,
  FileText, Flag, BookMarked,
} from "lucide-react";
import { CMBA, DOCS, REGISTER, REF, COACH } from "@/lib/cmbaLinks";

const groups = [
  {
    title: "Governance & Committees",
    icon: Gavel,
    links: [
      { label: "CMBA Leadership", desc: "Board, executive, and committee structure", href: DOCS.leadership },
      { label: "Executive & Board Contacts", desc: "Direct contacts for directors and committees", href: DOCS.boardContacts },
      { label: "Meeting Info & Minutes", desc: "Agendas, minutes, and meeting schedule", href: DOCS.meetingMinutes },
    ],
  },
  {
    title: "Sportsmanship & Conduct (SCC)",
    icon: ShieldAlert,
    links: [
      { label: "SCC Code of Conduct", desc: "Expectations for all participants", href: DOCS.sccCodeOfConduct },
      { label: "SCC Report Database", desc: "Recorded conduct decisions and outcomes", href: DOCS.sccReportDatabase },
      { label: "40-Point Mercy Rule", desc: "In-game sportsmanship enforcement", href: DOCS.mercy40 },
    ],
  },
  {
    title: "League Operations",
    icon: CalendarDays,
    links: [
      { label: "Official Calendar", desc: "Critical dates and league schedule", href: DOCS.officialCalendar },
      { label: "Schedules & Standings", desc: "TeamLinkt zones, schedules, results", href: REGISTER.zonesAndSchedules },
      { label: "Score Reporting", desc: "How results are submitted and verified", href: COACH.scoreReporting },
    ],
  },
  {
    title: "Officials & Assigning",
    icon: Flag,
    links: [
      { label: "RAMP Assigning", desc: "Assign officials and manage availability", href: REF.assigning },
      { label: "Referee Handbook", desc: "Mechanics, policies, and procedures", href: REF.handbook },
      { label: "Minor Officials Roles", desc: "Table officials and game-day duties", href: REF.minorOfficials },
    ],
  },
];

const quick = [
  { label: "Game Report Form", href: DOCS.gameReportForm, icon: ClipboardList },
  { label: "Player Registration", href: REGISTER.player, icon: Users },
  { label: "Coach Registration", href: REGISTER.coach, icon: BookMarked },
  { label: "Fees Document", href: DOCS.fees, icon: FileText },
];

export default function OperationsPage() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <Gavel size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Executive&apos;s Corner</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            LEAGUE <span className="text-cmba-red">OPERATIONS</span>
          </h1>
          <p className="text-cmba-grey mt-2 max-w-xl">
            Governance, conduct, and operations resources for CMBA executives, directors, and committees. League management runs on RAMP and TeamLinkt; the links below jump straight to the live tools.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-10">
        {/* Quick links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quick.map((q) => (
            <a key={q.label} href={q.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-4 transition-colors group">
              <q.icon size={18} className="text-cmba-red shrink-0" />
              <span className="flex-1 font-display font-bold text-xs text-cmba-grey-light uppercase tracking-wider group-hover:text-cmba-red transition-colors">{q.label}</span>
              <ExternalLink size={13} className="text-cmba-grey-dark shrink-0" />
            </a>
          ))}
        </div>

        {/* Resource groups */}
        <div className="grid lg:grid-cols-2 gap-6">
          {groups.map((g) => (
            <div key={g.title} className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12">
              <div className="px-6 py-4 border-b border-white/12 flex items-center gap-2">
                <g.icon size={16} className="text-cmba-red" />
                <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">{g.title}</h2>
              </div>
              <div className="divide-y divide-white/10">
                {g.links.map((l) => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 px-6 py-3.5 group">
                    <div>
                      <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">{l.label}</h3>
                      <p className="text-xs text-cmba-grey mt-0.5">{l.desc}</p>
                    </div>
                    <ExternalLink size={14} className="text-cmba-grey-dark shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 p-6 flex items-start gap-3">
          <Users size={18} className="text-cmba-red shrink-0 mt-0.5" />
          <p className="text-sm text-cmba-grey leading-relaxed">
            Need access or have an operations question? Email{" "}
            <a href={CMBA.emailHref} className="text-cmba-red hover:text-white transition-colors">{CMBA.email}</a>.
            For the public side of the site, head back to the{" "}
            <Link href="/" className="text-cmba-red hover:text-white transition-colors">home page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
