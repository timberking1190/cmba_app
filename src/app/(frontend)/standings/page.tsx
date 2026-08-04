import { Info } from "lucide-react";
import { getStandingsWithSource, getTeamLinktConfig } from "@/lib/cmbaSchedule";
import { StandingsTable } from "@/components/StandingsTable";
import { TeamLinktEmbed } from "@/components/TeamLinktEmbed";
import { TeamLinktActions } from "@/components/TeamLinktActions";
import { CourtLines } from "@/components/graphics/CourtLines";

// Dynamically rendered (the root layout reads the CSP nonce). TeamLinkt data stays
// cached for an hour via unstable_cache in lib/teamlinkt, so dropping page-level
// ISR does not increase upstream load.

export default async function StandingsPage() {
  const { rows, source } = await getStandingsWithSource();
  const { appUrl, leagueUrl } = getTeamLinktConfig();
  const hasData = rows.length > 0;
  const isOwn = source === "own";
  const lede = isOwn
    ? "Standings are calculated right here in CMBA Connect from confirmed game results. Where a division has no recorded results yet, its teams show with no games played."
    : "Standings come straight from TeamLinkt. Where a division has no recorded results yet, the official TeamLinkt view is shown instead.";
  const sourceNote = isOwn ? "Live standings data from CMBA Connect" : "Live standings data via TeamLinkt";

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
            {lede}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-10 lg:px-14 pb-20">
        {hasData ? (
          <div className="grid lg:grid-cols-[1fr_300px] gap-10">
            <div className="reveal min-w-0">
              <StandingsTable rows={rows} />
              <p className="mt-6 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider flex items-center gap-1.5">
                <Info size={11} /> {sourceNote}
              </p>
              <div className="mt-8 pt-4 border-t border-white/10">
                <h2 className="font-display font-bold text-white uppercase tracking-wide text-xs mb-2">How standings are calculated</h2>
                <ul className="text-[11px] text-cmba-grey leading-relaxed space-y-1 max-w-2xl">
                  <li>Teams earn points for each final game: a win, a tie, and a loss are each worth a set number of points for the season.</li>
                  <li>Ties in the table are broken in order, usually by head to head record, then point differential, then points scored.</li>
                  <li>A mercy cap limits how much a single lopsided game can change a team&apos;s point differential, so one blowout does not distort the table.</li>
                  <li>Standings move only on final results. Reported and contested games do not count until they are confirmed or resolved.</li>
                </ul>
              </div>
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
