import Link from "next/link";
import {
  Users, ShieldAlert, CalendarDays, ClipboardList, ExternalLink, Gavel,
  FileText, Flag, BookMarked,
} from "lucide-react";
import { CMBA, DOCS, REGISTER, REF, COACH } from "@/lib/cmbaLinks";
import { PhotoHero } from "@/components/media/PhotoHero";
import { PhotoBand } from "@/components/media/PhotoBand";
import { CourtLines } from "@/components/graphics/CourtLines";
import { CalgarySkyline } from "@/components/graphics/CalgarySkyline";
import { livePageFilter } from "@/lib/cmsPages";

const groups = [
  {
    title: "Governance & Committees",
    icon: Gavel,
    span: "bento-c2 bento-r2",
    links: [
      { label: "CMBA Leadership", desc: "Board, executive, and committee structure", href: DOCS.leadership },
      { label: "Executive & Board Contacts", desc: "Direct contacts for directors and committees", href: DOCS.boardContacts },
      { label: "Meeting Info & Minutes", desc: "Agendas, minutes, and meeting schedule", href: DOCS.meetingMinutes },
    ],
  },
  {
    title: "Sportsmanship & Conduct (SCC)",
    icon: ShieldAlert,
    span: "bento-c2",
    links: [
      { label: "SCC Code of Conduct", desc: "Expectations for all participants", href: DOCS.sccCodeOfConduct },
      { label: "SCC Report Database", desc: "Recorded conduct decisions and outcomes", href: DOCS.sccReportDatabase },
      { label: "40-Point Mercy Rule", desc: "In-game sportsmanship enforcement", href: DOCS.mercy40 },
    ],
  },
  {
    title: "League Operations",
    icon: CalendarDays,
    span: "bento-c2",
    links: [
      { label: "Official Calendar", desc: "Critical dates and league schedule", href: DOCS.officialCalendar },
      { label: "Schedules & Standings", desc: "TeamLinkt zones, schedules, results", href: REGISTER.zonesAndSchedules },
      { label: "Score Reporting", desc: "How results are submitted and verified", href: COACH.scoreReporting },
    ],
  },
  {
    title: "Officials & Assigning",
    icon: Flag,
    span: "bento-c4",
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

export default async function OperationsPage() {
  // Seed-only CMS pages are not published, so do not link to them. See lib/cmsPages.
  const isLive = await livePageFilter();
  const showCalendar = isLive(DOCS.officialCalendar);
  return (
    <div>
      {/* Hero */}
      <PhotoHero
        image="aerial"
        eyebrow="Executive's Corner · Operations"
        title="League"
        accent="Operations"
        subtitle="Governance, conduct, and operations resources for CMBA executives, directors, and committees. League management runs on RAMP and TeamLinkt — the links below jump straight to the live tools."
      >
        <div className="flex flex-wrap gap-3">
          {showCalendar && (
            <a href={DOCS.officialCalendar} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
              <CalendarDays size={16} /> Official Calendar
            </a>
          )}
          <a href={DOCS.leadership} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-white/30 text-white hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors backdrop-blur-sm">
            <Gavel size={16} /> CMBA Leadership
          </a>
        </div>
      </PhotoHero>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-12">
        {/* Quick links */}
        <div className="relative">
          <CourtLines className="pointer-events-none absolute -top-6 right-0 w-56 text-cmba-red/[0.06] hidden lg:block" />
          <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Quick <span className="text-cmba-red">Links</span>
          </h2>
          <p className="reveal text-cmba-grey text-sm mb-6">The forms and registrations executives reach for most.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quick.map((q, i) => (
              <a key={q.label} href={q.href} target="_blank" rel="noopener noreferrer" style={{ transitionDelay: `${i * 60}ms` }}
                className="reveal rv-scale flex items-center gap-3 bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-4 transition-colors group">
                <q.icon size={18} className="text-cmba-red shrink-0" />
                <span className="flex-1 font-display font-bold text-xs text-cmba-grey-light uppercase tracking-wider group-hover:text-cmba-red transition-colors">{q.label}</span>
                <ExternalLink size={13} className="text-cmba-grey-dark shrink-0" />
              </a>
            ))}
          </div>
        </div>

        {/* Resource groups — bento */}
        <div>
          <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Resource <span className="text-cmba-red">Library</span>
          </h2>
          <p className="reveal text-cmba-grey text-sm mb-6">Everything CMBA executives, directors, and committees need, organized by area.</p>
          <div className="bento">
            {groups.map((g, i) => (
              <div key={g.title} style={{ transitionDelay: `${i * 70}ms` }}
                className={`bento-tile reveal rv-scale ${g.span}`}>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 bg-cmba-red/10 flex items-center justify-center shrink-0">
                      <g.icon size={18} className="text-cmba-red" />
                    </div>
                    <h3 className="font-display font-bold text-base text-white uppercase tracking-wider leading-tight">{g.title}</h3>
                  </div>
                  <div className="flex-1 divide-y divide-white/10 -mb-1">
                    {g.links.filter((l) => isLive(l.href)).map((l) => (
                      <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between gap-4 py-2.5 group/link">
                        <div className="min-w-0">
                          <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover/link:text-cmba-red transition-colors">{l.label}</h4>
                          <p className="text-xs text-cmba-grey mt-0.5">{l.desc}</p>
                        </div>
                        <ExternalLink size={14} className="text-cmba-grey-dark shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Photo band */}
        <PhotoBand
          image="skylineNight"
          side="right"
          eyebrow="Run by Calgary, for Calgary"
          title="One league, one source of truth"
        >
          <p>From governance and conduct to schedules and assigning, CMBA operations live in one place. The tools above keep directors, committees, and officials working off the same playbook all season long.</p>
        </PhotoBand>

        <div className="reveal bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 p-6 flex items-start gap-3">
          <Users size={18} className="text-cmba-red shrink-0 mt-0.5" />
          <p className="text-sm text-cmba-grey leading-relaxed">
            Need access or have an operations question? Email{" "}
            <a href={CMBA.emailHref} className="text-cmba-red hover:text-white transition-colors">{CMBA.email}</a>.
            For the public side of the site, head back to the{" "}
            <Link href="/" className="text-cmba-red hover:text-white transition-colors">home page</Link>.
          </p>
        </div>
      </div>

      {/* Faint skyline footer accent */}
      <div className="relative">
        <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-16 text-white/5" />
        <div className="h-16" />
      </div>
    </div>
  );
}
