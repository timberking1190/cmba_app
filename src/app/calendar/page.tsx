import { ExternalLink, Info } from "lucide-react";
import { getEvents, getTeamLinktConfig, serializeGame } from "@/lib/teamlinkt";
import { ScheduleView } from "@/components/ScheduleView";
import { TeamLinktActions } from "@/components/TeamLinktActions";
import { TeamLinktEmbed } from "@/components/TeamLinktEmbed";
import { DOCS } from "@/lib/cmbaLinks";

export const revalidate = 3600;

function ManagedCallout({ appUrl }: { appUrl: string }) {
  return (
    <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-cmba-red/30 p-5">
      <h2 className="font-display font-black text-lg text-white uppercase tracking-tight mb-1">
        Managed in <span className="text-cmba-red">TeamLinkt</span>
      </h2>
      <p className="text-xs text-cmba-grey leading-relaxed mb-4">
        CMBA runs registration, scores, and accounts in TeamLinkt. Sign in there to report a score or manage your team.
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
  const games = await getEvents();
  const { appUrl, leagueUrl } = getTeamLinktConfig();
  const serial = games.map(serializeGame);
  const now = Date.now();
  const hasData = serial.length > 0;

  return (
    <div>
      {/* Editorial header */}
      <section className="px-4 md:px-10 lg:px-14 pt-12 lg:pt-20 pb-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="label-xs text-cmba-grey mb-4">2025-26 Season</div>
          <h1 className="font-display font-black uppercase leading-[0.85] tracking-tighter2 text-[clamp(40px,12vw,120px)]">
            Game <span className="text-stroke">Schedule</span>
          </h1>
          <p className="text-cmba-grey mt-4 max-w-xl text-sm md:text-base leading-relaxed">
            Game times, venues, and scores come straight from TeamLinkt. Account actions and full standings live in the TeamLinkt app.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-10 lg:px-14 pb-20">
        {hasData ? (
          <div className="grid lg:grid-cols-[1fr_300px] gap-10">
            <div className="min-w-0">
              <ScheduleView games={serial} now={now} />
              <p className="mt-10 pt-4 border-t border-white/10 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider flex items-center gap-1.5">
                <Info size={11} /> Live schedule data via TeamLinkt
              </p>
            </div>
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <ManagedCallout appUrl={appUrl} />
              <OfficialCalendarLink />
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
              <OfficialCalendarLink />
            </div>
            <p className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider flex items-center gap-1.5">
              <Info size={11} /> Live schedule data via TeamLinkt
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
