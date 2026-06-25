import { Info } from "lucide-react";
import { getStandings, getTeamLinktConfig } from "@/lib/cmbaSchedule";
import { StandingsTable } from "@/components/StandingsTable";
import { TeamLinktEmbed } from "@/components/TeamLinktEmbed";
import { TeamLinktActions } from "@/components/TeamLinktActions";
import { CourtLines } from "@/components/graphics/CourtLines";

export const revalidate = 3600;

export default async function StandingsPage() {
  const rows = await getStandings();
  const { appUrl, leagueUrl } = getTeamLinktConfig();
  const hasData = rows.length > 0;

  return (
    <div>
      {/* Editorial header */}
      <section className="relative px-4 md:px-10 lg:px-14 pt-12 lg:pt-20 pb-8 overflow-hidden">
        <CourtLines className="pointer-events-none absolute top-4 right-0 w-72 text-cmba-red/[0.06] hidden lg:block" />
        <div className="relative max-w-7xl mx-auto">
          <div className="label-xs text-cmba-grey mb-4">2025-26 Season</div>
          <h1 className="font-display font-black uppercase leading-[0.85] tracking-tighter2 text-[clamp(40px,12vw,120px)]">
            League <span className="text-stroke">Standings</span>
          </h1>
          <p className="reveal text-cmba-grey mt-4 max-w-xl text-sm md:text-base leading-relaxed">
            Standings come straight from TeamLinkt. Where a division has no recorded results yet, the official TeamLinkt view is shown instead.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-10 lg:px-14 pb-20">
        {hasData ? (
          <div className="grid lg:grid-cols-[1fr_300px] gap-10">
            <div className="reveal min-w-0">
              <StandingsTable rows={rows} />
              <p className="mt-8 pt-4 border-t border-white/10 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider flex items-center gap-1.5">
                <Info size={11} /> Live standings data via TeamLinkt
              </p>
            </div>
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="reveal rv-right bg-cmba-black-card/80 backdrop-blur-sm border border-cmba-red/30 p-5">
                <h2 className="font-display font-black text-lg text-white uppercase tracking-tight mb-1">
                  Managed in <span className="text-cmba-red">TeamLinkt</span>
                </h2>
                <p className="text-xs text-cmba-grey leading-relaxed mb-4">
                  Sign in to TeamLinkt to report a score or manage your team and account.
                </p>
                <TeamLinktActions appUrl={appUrl} layout="stack" />
              </div>
            </aside>
          </div>
        ) : (
          <div className="space-y-6">
            {/* No parsed standings (or endpoint changed) -> official TeamLinkt view */}
            <div className="reveal">
              <TeamLinktEmbed page="Standings" leagueUrl={leagueUrl} />
            </div>
            <div className="reveal max-w-md">
              <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-cmba-red/30 p-5">
                <h2 className="font-display font-black text-lg text-white uppercase tracking-tight mb-1">
                  Managed in <span className="text-cmba-red">TeamLinkt</span>
                </h2>
                <p className="text-xs text-cmba-grey leading-relaxed mb-4">
                  Sign in to TeamLinkt to report a score or manage your team and account.
                </p>
                <TeamLinktActions appUrl={appUrl} layout="row" />
              </div>
            </div>
            <p className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider flex items-center gap-1.5">
              <Info size={11} /> Live standings data via TeamLinkt
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
