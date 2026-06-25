/*
 * Client-safe schedule/standings types + pure helpers. NO server imports here,
 * so both the server data layer (teamlinkt.ts) and the client filter UIs can use
 * them without pulling server-only code into the browser bundle.
 */

export type GameStatus =
  | "scheduled"
  | "reported"
  | "contested"
  | "final"
  | "postponed"
  | "cancelled"
  | "forfeit";

export type Game = {
  id: string;
  date: string; // TeamLinkt display date, e.g. "Sat Apr 11, 2026"
  time: string; // TeamLinkt display time, e.g. "8:10 AM"
  start: Date | null; // for sorting / upcoming-vs-results filtering
  title?: string;
  homeTeam?: string;
  awayTeam?: string;
  location?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status: GameStatus;
  division?: string;
  sourceUrl?: string;
};

/* Serialized for the server -> client boundary (Date as ms or null). */
export type SerialGame = Omit<Game, "start"> & { start: number | null };

export function serializeGame(g: Game): SerialGame {
  return { ...g, start: g.start ? g.start.getTime() : null };
}
export function deserializeGame(g: SerialGame): Game {
  return { ...g, start: g.start != null ? new Date(g.start) : null };
}

export type StandingRow = {
  team: string;
  gp: number;
  w: number;
  l: number;
  t: number;
  pts: number;
  pf: number; // points for
  pa: number; // points against
  diff: number;
  division?: string;
  teamId?: number | string; // stable id for the deterministic final tiebreaker and team links
  rank?: number; // server-assigned final order; the client renders this, never re-sorts
  streak?: string; // e.g. "W3" or "L1"
  lastFive?: string; // e.g. "WWLWL"
};

export function mapsUrl(location: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(location)}`;
}

// A game is "upcoming" until it has a terminal result. Final, forfeit, and
// cancelled are never upcoming; reported, contested, and postponed still appear
// here because they are scheduled games that have not resulted in a final score.
export function filterUpcoming(games: Game[], nowMs: number): Game[] {
  return games
    .filter(
      (g) =>
        g.status !== "final" &&
        g.status !== "forfeit" &&
        g.status !== "cancelled" &&
        (g.start == null || g.start.getTime() >= nowMs)
    )
    .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
}

// Results are the games with a terminal scored outcome: final and forfeit.
export function filterResults(games: Game[]): Game[] {
  return games
    .filter((g) => g.status === "final" || g.status === "forfeit")
    .sort((a, b) => (b.start?.getTime() ?? 0) - (a.start?.getTime() ?? 0));
}

export function divisionsFrom(items: { division?: string }[]): string[] {
  const set = new Set<string>();
  for (const it of items) if (it.division) set.add(it.division);
  return Array.from(set).sort();
}

/* Group games into date sections, preserving the input order of games. */
export function groupByDate(games: Game[]): { key: string; label: string; games: Game[] }[] {
  const groups = new Map<string, Game[]>();
  for (const g of games) {
    const key = g.date || "Date TBD";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(g);
  }
  return Array.from(groups.entries()).map(([key, gs]) => ({ key, label: key, games: gs }));
}

export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.w - a.w);
}

/*
 * Display ordering for the standings table. Our standings carry a server-assigned,
 * deterministic rank, so we render that order and never re-derive it from pts/diff/w
 * on the client. sortStandings is used only as a fallback for legacy rows with no
 * rank. For the "all divisions" view, rows are grouped by division then by rank.
 */
export function orderStandingsForDisplay(rows: StandingRow[], division: string): StandingRow[] {
  const filtered = division === "all" ? rows : rows.filter((r) => r.division === division);
  const hasRank = filtered.some((r) => r.rank != null);
  if (!hasRank) return sortStandings(filtered);
  return [...filtered].sort(
    (a, b) =>
      (division === "all" ? String(a.division ?? "").localeCompare(String(b.division ?? "")) : 0) ||
      (a.rank ?? 0) - (b.rank ?? 0)
  );
}
