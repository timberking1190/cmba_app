"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Users } from "lucide-react";

import { leagueDayKey } from "@/lib/leagueTime";

import { ActionButton, Callout, EmptyState, LinkButton, Panel, inputCls } from "./ui";

export type BoardOfficial = {
  id: string | number;
  name: string;
  rampLevel?: string | null;
  maxGamesPerDay?: number | null;
  /** How many games they already hold, by league day. */
  loadByDay: Record<string, number>;
};

export type BoardGame = {
  id: string | number;
  startAt: string;
  dayLabel: string;
  timeLabel: string;
  homeTeam: string;
  awayTeam: string;
  division: string;
  divisionId: string | number | null;
  venue: string;
  court: string;
  venueId: string | number | null;
  requiredRampLevel?: string | null;
  assigned: Array<{ id: string | number; name: string; role: string }>;
};

export type Outcome = { officialId: string | number; officialName: string; severity: string; reason?: string; message: string; overridable?: boolean };
type GameResult = { gameId: string | number; gameLabel: string; created: Outcome[]; blocked: Outcome[]; warnings: Outcome[]; removed: Outcome[]; error?: string };

const ROLES = [
  { value: "referee1", label: "Referee 1" },
  { value: "referee2", label: "Referee 2" },
  { value: "scorekeeper", label: "Scorekeeper" },
];

const RAMP_LABEL: Record<string, string> = { none: "no level", level1: "level 1", level2: "level 2", level3: "level 3" };
const labelCls = "block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1";

/** officialId per (gameId, role). One official can hold one role on one game. */
type Picks = Record<string, string>;
const pickKey = (gameId: string | number, role: string) => `${gameId}|${role}`;

/*
 * The officials assignment board.
 *
 * The reported problem was "only one game can be assigned at a time": the old
 * screen was a single game dropdown, and staffing a weekend meant repeating the
 * whole cycle a hundred times. This board shows the whole filtered slate at once,
 * every game gets its referee and scorekeeper pickers inline, each official's
 * load for that day is shown as you choose, and the whole slate is submitted in
 * one action. Nothing reloads the page.
 *
 * Check first reports what would happen without writing anything, so a scheduler
 * can see every clash across the weekend before committing to any of it.
 */
export function OfficialsBoard({
  games: initialGames,
  officials,
  days,
  divisions,
  venues,
  filter,
  page = 1,
  totalPages = 1,
  totalGames,
}: {
  games: BoardGame[];
  officials: BoardOfficial[];
  days: string[];
  divisions: Array<{ id: string | number; name: string }>;
  venues: Array<{ id: string | number; name: string }>;
  filter: { day: string; division: string; venue: string; unstaffedOnly: boolean };
  page?: number;
  totalPages?: number;
  totalGames?: number;
}) {
  const [games, setGames] = useState(initialGames);
  const [picks, setPicks] = useState<Picks>({});
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<GameResult[] | null>(null);
  const [totals, setTotals] = useState<{ assigned: number; removed: number; blocked: number; warnings: number } | null>(null);
  const [wasDryRun, setWasDryRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const officialsById = useMemo(() => new Map(officials.map((o) => [String(o.id), o])), [officials]);

  /*
   * Live load per official per day: what they already hold, plus what is picked
   * on this board but not yet saved. This is what lets a scheduler see someone
   * filling up before they over commit them.
   */
  const pendingLoad = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, officialId] of Object.entries(picks)) {
      if (!officialId) continue;
      const gameId = k.split("|")[0];
      const game = games.find((g) => String(g.id) === gameId);
      if (!game) continue;
      const key = `${officialId}|${leagueDayKey(game.startAt)}`;
      out[key] = (out[key] ?? 0) + 1;
    }
    return out;
  }, [picks, games]);

  function loadFor(official: BoardOfficial, day: string): { count: number; max: number | null; over: boolean } {
    const count = (official.loadByDay[day] ?? 0) + (pendingLoad[`${official.id}|${day}`] ?? 0);
    const max = official.maxGamesPerDay ?? null;
    return { count, max, over: max != null && count > max };
  }

  const changes = useMemo(() => {
    const byGame = new Map<string, { gameId: string | number; assignments: Array<{ officialId: string; role: string }> }>();
    for (const [k, officialId] of Object.entries(picks)) {
      if (!officialId) continue;
      const [gameId, role] = k.split("|");
      const entry = byGame.get(gameId) ?? { gameId, assignments: [] };
      entry.assignments.push({ officialId, role });
      byGame.set(gameId, entry);
    }
    return Array.from(byGame.values());
  }, [picks]);

  async function submit(dryRun: boolean) {
    setBusy(true);
    setError(null);
    setResults(null);
    setTotals(null);
    try {
      const res = await fetch("/api/v1/admin/officials/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ changes, force, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "That did not go through and nothing was changed. Please try again.");
        return;
      }
      setResults(data.results as GameResult[]);
      setTotals(data.totals);
      setWasDryRun(dryRun);
      if (!dryRun) {
        // Fold what actually saved back into the board, so the slate on screen is
        // current without a page reload.
        const applied = data.results as GameResult[];
        setGames((gs) =>
          gs.map((g) => {
            const r = applied.find((x) => String(x.gameId) === String(g.id));
            if (!r) return g;
            const added = r.created
              .filter((c) => c.severity === "ok")
              .map((c) => {
                const role = changes.find((ch) => String(ch.gameId) === String(g.id))?.assignments.find((as) => String(as.officialId) === String(c.officialId))?.role;
                return { id: c.officialId, name: c.officialName, role: role ?? "referee1" };
              });
            const removedIds = new Set(r.removed.map((x) => String(x.officialId)));
            return { ...g, assigned: [...g.assigned.filter((a) => !removedIds.has(String(a.id))), ...added] };
          }),
        );
        // Clear only the picks that succeeded; leave the blocked ones so the
        // scheduler can see and fix them.
        const savedKeys = new Set<string>();
        for (const r of applied) for (const c of r.created) if (c.severity === "ok") savedKeys.add(`${r.gameId}|${c.officialId}`);
        setPicks((p) => {
          const next: Picks = {};
          for (const [k, v] of Object.entries(p)) {
            const gameId = k.split("|")[0];
            if (!savedKeys.has(`${gameId}|${v}`)) next[k] = v;
          }
          return next;
        });
      }
    } catch {
      setError("That did not go through because the connection failed. Nothing was changed. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeOne(gameId: string | number, officialId: string | number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/games/${gameId}/officials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ remove: [officialId] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "That official could not be taken off the game. Nothing was changed.");
        return;
      }
      setGames((gs) => gs.map((g) => (String(g.id) === String(gameId) ? { ...g, assigned: g.assigned.filter((a) => String(a.id) !== String(officialId)) } : g)));
    } catch {
      setError("That did not go through because the connection failed. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  const allOutcomes = (results ?? []).flatMap((r) => [...r.blocked, ...r.warnings]);
  const anyBlocked = (results ?? []).some((r) => r.blocked.length > 0);
  const pickedCount = changes.reduce((n, c) => n + c.assignments.length, 0);

  return (
    <div className="space-y-5">
      <BoardFilters days={days} divisions={divisions} venues={venues} filter={filter} />

      {games.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="No games match those filters"
          action={
            <LinkButton href="/manage/officials">Show every game</LinkButton>
          }
        >
          Pick a different weekend, division, or venue. If the season has not been imported yet, start with the import screen.
        </EmptyState>
      ) : (
        <>
          <Panel
            title={
              totalGames != null && totalGames > games.length
                ? `${games.length} of ${totalGames} games, page ${page} of ${totalPages}`
                : `${games.length} game${games.length === 1 ? "" : "s"} on this board`
            }
            description="Choose an official for each role, on as many games as you like, then assign them all in one action. The number beside a name is how many games they already have that day."
            actions={totalPages > 1 ? <BoardPager page={page} totalPages={totalPages} /> : undefined}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <caption className="sr-only">Games needing officials, with a picker for each role</caption>
                <thead>
                  <tr className="border-b border-white/15">
                    <th scope="col" className="py-2 pr-3 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">
                      When
                    </th>
                    <th scope="col" className="py-2 pr-3 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">
                      Game
                    </th>
                    <th scope="col" className="py-2 pr-3 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">
                      Where
                    </th>
                    {ROLES.map((r) => (
                      <th key={r.value} scope="col" className="py-2 pr-3 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => {
                    const day = leagueDayKey(g.startAt);
                    return (
                      <tr key={g.id} className="border-b border-white/8 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <div className="font-mono text-[11px] text-cmba-grey-light">{g.dayLabel}</div>
                          <div className="font-mono text-[11px] text-cmba-grey-mid">{g.timeLabel}</div>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="font-display font-bold text-xs text-white">
                            {g.homeTeam} <span className="text-cmba-grey-mid font-normal">vs</span> {g.awayTeam}
                          </div>
                          <div className="font-mono text-[10px] text-cmba-grey-mid">{g.division}</div>
                          {g.assigned.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {g.assigned.map((a) => (
                                <li key={`${a.id}-${a.role}`} className="flex items-center gap-1.5 text-[11px] text-cmba-grey-light">
                                  <span>
                                    {a.name} <span className="text-cmba-grey-mid">({ROLES.find((r) => r.value === a.role)?.label ?? a.role})</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeOne(g.id, a.id)}
                                    className="font-mono text-[10px] uppercase tracking-wider text-status-danger hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmba-red"
                                  >
                                    Remove
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[10px] text-cmba-grey-mid">{[g.venue, g.court].filter(Boolean).join(", ") || "No venue set"}</td>
                        {ROLES.map((role) => {
                          const key = pickKey(g.id, role.value);
                          const chosen = picks[key] ?? "";
                          const chosenOfficial = chosen ? officialsById.get(chosen) : undefined;
                          const load = chosenOfficial ? loadFor(chosenOfficial, day) : null;
                          const alreadyInRole = g.assigned.find((a) => a.role === role.value);
                          return (
                            <td key={role.value} className="py-2 pr-3">
                              <label className="sr-only" htmlFor={`pick-${key}`}>
                                {role.label} for {g.homeTeam} versus {g.awayTeam} on {g.dayLabel} at {g.timeLabel}
                              </label>
                              <select
                                id={`pick-${key}`}
                                className={`${inputCls} min-w-[11rem]`}
                                value={chosen}
                                onChange={(e) => setPicks((p) => ({ ...p, [key]: e.target.value }))}
                              >
                                <option value="">{alreadyInRole ? `${alreadyInRole.name} is on this game` : "No one chosen yet"}</option>
                                {officials.map((o) => {
                                  const l = loadFor(o, day);
                                  return (
                                    <option key={o.id} value={o.id}>
                                      {o.name}
                                      {o.rampLevel ? `, ${RAMP_LABEL[o.rampLevel] ?? o.rampLevel}` : ""}
                                      {` (${l.count}${l.max != null ? ` of ${l.max}` : ""} that day)`}
                                    </option>
                                  );
                                })}
                              </select>
                              {load?.over && <p className="text-[10px] text-status-warn mt-1">Over their maximum for that day.</p>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <label className="flex items-start gap-2 text-xs text-cmba-grey-light cursor-pointer mb-3">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="mt-0.5 h-4 w-4 accent-cmba-red" />
              <span>Assign anyway when an official is already on an overlapping game. Use this only when you know they can really do both.</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                variant="secondary"
                onClick={() => submit(true)}
                busy={busy}
                busyLabel="Checking"
                disabledReason={pickedCount === 0 ? "Choose an official for at least one game first." : null}
              >
                Check first, change nothing
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={() => submit(false)}
                busy={busy}
                busyLabel="Assigning"
                disabledReason={pickedCount === 0 ? "Choose an official for at least one game first." : null}
              >
                <CheckCircle2 size={13} /> Assign {pickedCount || ""} {pickedCount === 1 ? "official" : "officials"}
              </ActionButton>
              {pickedCount > 0 && (
                <ActionButton variant="quiet" onClick={() => setPicks({})}>
                  <RotateCcw size={12} /> Clear my choices
                </ActionButton>
              )}
            </div>
          </Panel>
        </>
      )}

      {error && (
        <Callout tone="error" title="That did not go through">
          {error}
        </Callout>
      )}

      {results && totals && (
        <Panel title={wasDryRun ? "What would happen" : "What happened"}>
          <Callout tone={anyBlocked ? "warning" : "success"} title={wasDryRun ? "Checked, nothing was changed" : "Done"}>
            {wasDryRun
              ? `${totals.assigned} would be assigned, ${totals.blocked} cannot be, and ${totals.warnings} would go through with something worth knowing.`
              : `${totals.assigned} assigned, ${totals.removed} removed, ${totals.blocked} could not be assigned, and ${totals.warnings} went through with something worth knowing.`}
          </Callout>
          {allOutcomes.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {(results ?? []).map((r) =>
                [...r.blocked.map((o) => ({ o, tone: "blocked" as const })), ...r.warnings.map((o) => ({ o, tone: "warning" as const }))].map(({ o, tone }, i) => (
                  <li key={`${r.gameId}-${tone}-${i}`} className={`text-xs ${tone === "blocked" ? "text-status-danger" : "text-status-warn"}`}>
                    <span className="font-mono text-[10px] uppercase tracking-wider mr-1">{tone === "blocked" ? "Not assigned" : "Assigned, note"}</span>
                    {o.message} <span className="text-cmba-grey-mid">({r.gameLabel})</span>
                  </li>
                )),
              )}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}

/* Paging keeps the number of rendered option elements sane: every game shows a
   picker per role, and every picker lists every official. */
function BoardPager({ page, totalPages }: { page: number; totalPages: number }) {
  const go = (to: number) => {
    if (typeof window === "undefined") return "#";
    const q = new URLSearchParams(window.location.search);
    q.set("page", String(to));
    return `/manage/officials?${q.toString()}`;
  };
  return (
    <span className="flex items-center gap-2">
      {page > 1 ? (
        <LinkButton href={go(page - 1)} variant="secondary">
          Previous
        </LinkButton>
      ) : (
        <ActionButton variant="secondary" disabledReason="You are on the first page.">
          Previous
        </ActionButton>
      )}
      {page < totalPages ? (
        <LinkButton href={go(page + 1)} variant="secondary">
          Next
        </LinkButton>
      ) : (
        <ActionButton variant="secondary" disabledReason="You are on the last page.">
          Next
        </ActionButton>
      )}
    </span>
  );
}

function BoardFilters({
  days,
  divisions,
  venues,
  filter,
}: {
  days: string[];
  divisions: Array<{ id: string | number; name: string }>;
  venues: Array<{ id: string | number; name: string }>;
  filter: { day: string; division: string; venue: string; unstaffedOnly: boolean };
}) {
  return (
    <Panel title="Choose a slate" description="Narrow to the weekend, division, or venue you are staffing right now.">
      <form method="get" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div>
          <label htmlFor="b-day" className={labelCls}>
            Day
          </label>
          <select id="b-day" name="day" className={inputCls} defaultValue={filter.day}>
            <option value="">Every day with games</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="b-division" className={labelCls}>
            Division
          </label>
          <select id="b-division" name="division" className={inputCls} defaultValue={filter.division}>
            <option value="">All divisions</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="b-venue" className={labelCls}>
            Venue
          </label>
          <select id="b-venue" name="venue" className={inputCls} defaultValue={filter.venue}>
            <option value="">All venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-cmba-grey-light cursor-pointer">
            <input type="checkbox" name="unstaffed" value="1" defaultChecked={filter.unstaffedOnly} className="h-4 w-4 accent-cmba-red" />
            Needs officials only
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-cmba-black-surface border border-white/25 hover:border-cmba-red/60 text-cmba-grey-light font-display font-bold text-xs uppercase tracking-wider px-3 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmba-red"
          >
            Show these games
          </button>
        </div>
      </form>
    </Panel>
  );
}
