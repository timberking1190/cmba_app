"use client";

import { useMemo, useState } from "react";
import { MapPin, ExternalLink, CalendarOff } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { EmptyState } from "@/components/states/EmptyState";
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
}: {
  games: SerialGame[];
  now: number;
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
        /*
         * An empty list and a failed fetch used to look the same here: one line of
         * 14px grey text. This says which one it is, at a readable size, and gives
         * a way forward when the emptiness is caused by the division filter rather
         * than by there being no games.
         */
        <EmptyState
          icon={CalendarOff}
          title={tab === "upcoming" ? "No upcoming games" : "No results yet"}
          body={
            division !== "all"
              ? `Nothing is scheduled for ${division} right now. Choose All divisions above to see the rest of the league.`
              : tab === "upcoming"
                ? "Nothing is on the schedule right now. New games appear here as soon as they are published."
                : "No final scores have been posted yet. Results appear here once games are confirmed."
          }
        />
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
