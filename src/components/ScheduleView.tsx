"use client";

import { useMemo, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import {
  deserializeGame,
  divisionsFrom,
  groupByDate,
  filterUpcoming,
  filterResults,
  mapsUrl,
  type SerialGame,
  type Game,
} from "@/lib/scheduleUtils";

type Tab = "upcoming" | "results";
const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "results", label: "Results" },
];

/*
 * Client filter + grouped list over the server-fetched TeamLinkt events.
 * Receives serialized games + a server timestamp so SSR and hydration filter
 * against the same "now". Helpers are pure (no server code) -> small bundle.
 */
export function ScheduleView({
  games: serial,
  now,
  leagueUrl,
}: {
  games: SerialGame[];
  now: number;
  leagueUrl: string;
}) {
  const all = useMemo(() => serial.map(deserializeGame), [serial]);
  const divs = useMemo(() => divisionsFrom(all), [all]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [division, setDivision] = useState("all");

  const filtered = useMemo(() => {
    const base = tab === "upcoming" ? filterUpcoming(all, now) : filterResults(all);
    return division === "all" ? base : base.filter((g) => g.division === division);
  }, [all, tab, division, now]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  /*
   * An empty Upcoming tab is the single most likely thing a parent sees on this
   * site, and "No upcoming games right now." reads like a broken page. It is not:
   * as of this writing the 2025-26 season finished on 10 June 2026 and the next
   * schedule has not been published yet, so there is genuinely nothing to show.
   *
   * The distinction that matters to a reader is between "the season is over or has
   * not started" and "the division you picked has nothing". The date is derived
   * from the data rather than written into the copy, so it stays true on its own.
   */
  const lastPlayed = useMemo(() => {
    const past = all
      .map((g) => g.start)
      .filter((d): d is Date => !!d && d.getTime() < now)
      .sort((a, b) => b.getTime() - a.getTime());
    return past[0] ?? null;
  }, [all, now]);

  const seasonIsOver =
    tab === "upcoming" && filterUpcoming(all, now).length === 0 && lastPlayed !== null;

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
        <div role="tablist" aria-label="Schedule view" className="inline-flex border border-white/12 bg-cmba-black-card/60 backdrop-blur-sm">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 font-mono text-xs uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmba-red ${
                tab === t.id ? "bg-cmba-red text-white" : "text-cmba-grey hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {divs.length > 0 && (
          <label className="inline-flex items-center gap-2">
            <span className="sr-only">Filter by division</span>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="bg-cmba-black-card border border-white/12 px-3 py-2 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none"
            >
              <option value="all">All divisions</option>
              {divs.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
        )}

        <span className="sm:ml-auto font-mono text-xs text-cmba-grey-mid">
          {filtered.length} game{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 p-8 text-center">
          {seasonIsOver ? (
            <>
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight mb-2">
                No games scheduled yet
              </h3>
              <p className="text-sm text-cmba-grey leading-relaxed max-w-md mx-auto mb-1">
                The last game on record was {lastPlayed!.toLocaleDateString("en-CA", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "America/Edmonton",
                })}. The next season&apos;s schedule has not been published yet.
              </p>
              <p className="text-sm text-cmba-grey leading-relaxed max-w-md mx-auto mb-6">
                Games appear here as soon as they are published. Past games are under Results.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setTab("results")}
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 py-3 bg-cmba-red text-white font-display font-bold text-sm uppercase tracking-wider hover:bg-white hover:text-cmba-black transition-colors"
                >
                  See last season&apos;s results
                </button>
                <a
                  href={`${leagueUrl}/Schedule`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-5 py-3 border border-white/15 hover:border-cmba-red/50 text-cmba-grey-light hover:text-white font-mono text-xs uppercase tracking-wider transition-colors"
                >
                  Check TeamLinkt <ExternalLink size={12} />
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-cmba-grey">
                No {tab === "upcoming" ? "upcoming games" : "results"}
                {division !== "all" ? ` for ${division}` : ""} right now.
              </p>
              {division !== "all" && (
                <button
                  onClick={() => setDivision("all")}
                  className="mt-4 inline-flex items-center min-h-[44px] px-4 font-mono text-xs uppercase tracking-wider text-cmba-red hover:text-white transition-colors"
                >
                  Show all divisions
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((grp) => (
            <section key={grp.key} className="reveal">
              <div className="flex items-baseline justify-between mb-3 border-b border-white/10 pb-2">
                <h3 className="font-display font-black text-xl text-white uppercase tracking-tight">{grp.label}</h3>
                <span className="font-mono text-[11px] text-cmba-grey-mid">
                  {grp.games.length} game{grp.games.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-2">
                {grp.games.map((g) => (
                  <GameRow key={g.id} g={g} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function GameRow({ g }: { g: Game }) {
  const hasScore = typeof g.homeScore === "number" && typeof g.awayScore === "number";
  return (
    <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 transition-colors p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="sm:w-24 shrink-0 font-mono text-sm text-cmba-red font-medium">{g.time || "TBD"}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base text-white uppercase tracking-wide">
            {g.homeTeam && g.awayTeam ? (
              <>
                {g.homeTeam} <span className="text-cmba-grey-mid font-normal lowercase">vs</span> {g.awayTeam}
              </>
            ) : (
              g.title || "Game"
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-cmba-grey">
            {g.location && (
              <a href={mapsUrl(g.location)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-cmba-red transition-colors">
                <MapPin size={11} /> {g.location}
              </a>
            )}
            {g.division && <span className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">{g.division}</span>}
            {g.title && g.homeTeam && <span className="font-mono text-[10px] text-cmba-grey-mid">{g.title}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasScore && (
            <span className="font-display font-black text-white tabular-nums text-lg">
              {g.homeScore}<span className="text-cmba-grey-mid px-0.5">-</span>{g.awayScore}
            </span>
          )}
          <StatusChip status={g.status} />
        </div>
      </div>
      {g.sourceUrl && (
        <div className="mt-2 text-right">
          <a href={g.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[10px] text-cmba-red hover:text-white uppercase tracking-wider transition-colors">
            Details on TeamLinkt <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
}
