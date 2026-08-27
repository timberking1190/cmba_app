import { ExternalLink, Info } from "lucide-react";
import { livePageFilter } from "@/lib/cmsPages";
import { getEventsWithSource, getTeamLinktConfig, serializeGame } from "@/lib/cmbaSchedule";
import { ScheduleView } from "@/components/ScheduleView";
import { TeamLinktActions } from "@/components/TeamLinktActions";
import { TeamLinktEmbed } from "@/components/TeamLinktEmbed";
import { DOCS } from "@/lib/cmbaLinks";
import { CalgarySkyline } from "@/components/graphics/CalgarySkyline";
import { JsonLd } from "@/components/JsonLd";
import { siteUrl } from "@/lib/siteUrl";

// Dynamically rendered (the root layout reads the CSP nonce). TeamLinkt data stays
// cached for an hour via unstable_cache in lib/teamlinkt, so dropping page-level
// ISR does not increase upstream load.

function ManagedCallout({ appUrl }: { appUrl: string }) {
  return (
    <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-cmba-red/30 p-5">
      <h2 className="font-display font-black text-lg text-white uppercase tracking-tight mb-1">
        Do this in <span className="text-cmba-red">TeamLinkt</span>
      </h2>
      <p className="text-xs text-cmba-grey leading-relaxed mb-4">
        Registration, team management, and score reporting happen in TeamLinkt. Sign in there to report a score or manage your team.
      </p>
      <TeamLinktActions appUrl={appUrl} layout="stack" />
    </div>
  );
}

function OfficialCalendarLink() {
  return (
    <a
      href={DOCS.officialCalendar}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-4 transition-colors group"
    >
      <div>
        <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">Official CMBA Calendar</h3>
        <p className="text-[11px] text-cmba-grey mt-0.5">Critical dates and key deadlines</p>
      </div>
      <ExternalLink size={14} className="text-cmba-grey-dark shrink-0" />
    </a>
  );
}

export default async function SchedulePage() {
  const { games, source } = await getEventsWithSource();
  // Seed-only CMS pages are not published, so do not link to them. See lib/cmsPages.
  const isLive = await livePageFilter();
  const showCalendarCard = isLive(DOCS.officialCalendar);
  const { appUrl, leagueUrl } = getTeamLinktConfig();
  const serial = games.map(serializeGame);
  const now = Date.now();
  const hasData = serial.length > 0;
  const isOwn = source === "own";
  /*
   * One story, told the same way everywhere: CMBA Connect is where you LOOK THINGS
   * UP, TeamLinkt is where you DO THINGS. The site used to describe itself by its
   * plumbing instead, so /schedule claimed games were "managed right here in CMBA
   * Connect" while /standings said standings "come straight from TeamLinkt", and
   * both pages carried a MANAGED IN TEAMLINKT panel. A parent could not tell which
   * system was authoritative. Splitting by job is true regardless of which side the
   * data happens to be read from today. The plumbing still gets stated, but as a
   * quiet footnote rather than the headline.
   */
  const lede =
    "Check game times, venues, and results here. Registration, team management, and score reporting happen in TeamLinkt.";
  const sourceNote = isOwn ? "Schedule data from CMBA Connect" : "Schedule data from TeamLinkt";

  // SportsEvent structured data for the next games (bounded so the page stays light).
  const base = siteUrl();
  const upcoming = games.filter((g) => g.start && g.start.getTime() >= now).slice(0, 25);
  const eventsLd = upcoming.map((g) => ({
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${g.homeTeam} vs ${g.awayTeam}`,
    sport: "Basketball",
    startDate: g.start ? g.start.toISOString() : undefined,
    ...(g.location ? { location: { "@type": "Place", name: g.location } } : {}),
    homeTeam: { "@type": "SportsTeam", name: g.homeTeam },
    awayTeam: { "@type": "SportsTeam", name: g.awayTeam },
    organizer: { "@type": "SportsOrganization", name: "Calgary Minor Basketball Association", url: base },
  }));

  return (
    <div>
      {eventsLd.length > 0 && <JsonLd data={eventsLd} />}
      {/* Editorial header */}
      <section className="relative px-4 md:px-10 lg:px-14 pt-6 md:pt-12 lg:pt-20 pb-6 lg:pb-8 overflow-hidden">
        <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-24 text-white/5" />
        <div className="relative max-w-7xl mx-auto">
          <div className="reveal label-xs text-cmba-grey mb-4">2025-26 Season</div>
          <h1 className="font-display font-black uppercase leading-[0.85] tracking-tighter2 text-[clamp(40px,12vw,120px)]">
            Game <span className="text-stroke">Schedule</span>
          </h1>
          <p className="reveal text-cmba-grey mt-4 max-w-xl text-sm md:text-base leading-relaxed">
            {lede}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-10 lg:px-14 pb-20">
        {hasData ? (
          <div className="grid lg:grid-cols-[1fr_300px] gap-10">
            <div className="min-w-0">
              <ScheduleView games={serial} now={now} leagueUrl={leagueUrl} />
              <p className="mt-10 pt-4 border-t border-white/10 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider flex items-center gap-1.5">
                <Info size={11} /> {sourceNote}
              </p>
            </div>
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <ManagedCallout appUrl={appUrl} />
              {showCalendarCard && <OfficialCalendarLink />}
              <a href={`${leagueUrl}/Schedule`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[11px] text-cmba-red hover:text-white uppercase tracking-wider transition-colors">
                View on TeamLinkt <ExternalLink size={11} />
              </a>
            </aside>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Native parse returned nothing -> graceful iframe fallback */}
            <TeamLinktEmbed page="Schedule" leagueUrl={leagueUrl} />
            <div className="grid sm:grid-cols-2 gap-4">
              <ManagedCallout appUrl={appUrl} />
              {showCalendarCard && <OfficialCalendarLink />}
            </div>
            <p className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider flex items-center gap-1.5">
              <Info size={11} /> {sourceNote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
