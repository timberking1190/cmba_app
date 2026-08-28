import "server-only";
import { unstable_cache } from "next/cache";
import {
  type Game,
  type GameStatus,
  type StandingRow,
  serializeGame,
  deserializeGame,
  type SerialGame,
} from "./scheduleUtils";

// Re-export the client-safe types + helpers so server callers get them from here.
export * from "./scheduleUtils";

/*
 * Server-only TeamLinkt data layer.
 *
 * IMPORTANT: these are UNDOCUMENTED / private TeamLinkt league JSON endpoints
 * (DataTables responses with HTML inside cells). They returned 200 unauthenticated
 * from the public site, but may change or disappear without notice. That is why
 * the schedule/standings pages fall back to TeamLinkt's official iframe when these
 * return nothing: the pages keep working even if the endpoints change. Must be
 * called server-side only (CORS blocks browser calls). We never invent data: any
 * failure or empty/garbage response returns [].
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/*
 * The league slug is TRUNCATED TO 32 CHARACTERS by TeamLinkt, so the real public
 * slug ends "...associatio" with no final "n". This is not a typo, do not "fix" it.
 *
 * Getting it wrong is silent and total. TeamLinkt answers an unknown slug with a
 * 302 to its own marketing site rather than a 404, and that redirect chain ends on
 * the APEX host teamlinkt.com. Our frame-src allowlist is https://*.teamlinkt.com,
 * and a CSP wildcard matches subdomains but NOT the apex, so the browser blocks the
 * final hop and the embed renders as an empty grey slab with no console error that
 * points anywhere near the cause. That is exactly how it shipped: /standings showed
 * a broken box for every visitor.
 *
 * Verify with a plain HEAD request before changing any of these values. A correct
 * slug answers 200; a wrong one answers 302 to www.teamlinkt.com/our-leagues/.
 */
const LEAGUE_SLUG = "calgaryminorbasketballassociatio";

/*
 * Season id, from the season picker on the TeamLinkt league page. 50938 is the
 * "2026 Spring League", which finished on 10 June 2026; 58270 is the current
 * "26-27 Calgary Club Premier League". A stale season id reads as an empty league.
 */
const SEASON_ID = "58270";

function cfg() {
  return {
    base: process.env.TEAMLINKT_LEAGUE_BASE || "https://leagues.teamlinkt.com",
    assoc: process.env.TEAMLINKT_ASSOC_ID || "34176",
    season: process.env.TEAMLINKT_SEASON_ID || SEASON_ID,
    slug: process.env.TEAMLINKT_LEAGUE_SLUG || LEAGUE_SLUG,
    appUrl: process.env.NEXT_PUBLIC_TEAMLINKT_APP_URL || "https://app.teamlinkt.com",
  };
}

export function getTeamLinktConfig() {
  const c = cfg();
  return { ...c, leagueUrl: `${c.base}/${c.slug}` };
}

async function post(url: string): Promise<unknown> {
  const controller = new AbortController();
  // The events payload is large (~270KB) and the endpoint measured ~6-10s, so a
  // strict 8s timeout forced the iframe fallback even when the data was fine.
  // 12s lets the native render win; results are cached hourly so this is rare.
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "User-Agent": UA,
      },
      body: "draw=1&start=0&length=1000",
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[teamlinkt] HTTP ${res.status} for ${url}`);
      return null;
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error(`[teamlinkt] non-JSON response for ${url}`);
      return null;
    }
  } catch (err) {
    console.error(`[teamlinkt] fetch failed for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ── HTML helpers (no heavy dependency) ──────────────────────────────────── */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, " ");
}
function stripHtml(s: unknown): string {
  return decodeEntities(String(s ?? "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractRows(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object" && Array.isArray((json as { data?: unknown[] }).data)) {
    return (json as { data: unknown[] }).data;
  }
  return [];
}

function divisionOf(...parts: (string | undefined)[]): string | undefined {
  for (const p of parts) {
    const m = (p || "").match(/\bU(\d{1,2})\b/i);
    if (m) return `U${m[1]}`;
  }
  return undefined;
}

/* "<a ..><span>Name</span></a> <span>(40)</span>" -> { name: "Name", score: 40 } */
function parseTeamCell(cell: unknown): { name: string; score: number | null } {
  const flat = stripHtml(cell);
  const scoreMatch = flat.match(/\((\d+)\)\s*$/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
  const name = flat.replace(/\s*\(\d+\)\s*$/, "").trim();
  return { name, score };
}

function parseEvents(json: unknown): Game[] {
  const rows = extractRows(json);
  const games: Game[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;

    const date = stripHtml(r["0"]);
    const tsRaw = Number(r["6"]);
    if (!date && !Number.isFinite(tsRaw)) continue;

    const start = Number.isFinite(tsRaw) && tsRaw > 0 ? new Date(tsRaw * 1000) : null;
    const time = String(r["1"] ?? "").split(/\s*[-–]\s*/)[0].trim();

    const titleCell = String(r["2"] ?? "");
    const urlMatch = titleCell.match(/href="([^"]+\/[Ll]eagues\/event\/[^"]+)"/);
    const sourceUrl = urlMatch ? urlMatch[1] : undefined;
    const idMatch = (sourceUrl || "").match(/event\/\d+\/(\d+)/);
    const title = stripHtml(titleCell).replace(/\[summary\]\s*$/i, "").trim() || undefined;

    const home = parseTeamCell(r["3"]);
    const away = parseTeamCell(r["4"]);
    const location = stripHtml(r["5"]) || undefined;

    const cancelled = /\bcancel/i.test(title || "");
    const status: GameStatus = cancelled
      ? "cancelled"
      : home.score != null && away.score != null
        ? "final"
        : "scheduled";

    const id =
      (idMatch && idMatch[1]) ||
      `${tsRaw || date}-${r["home_association_team_id"] ?? ""}-${r["away_assocation_team_id"] ?? ""}`;

    games.push({
      id: String(id),
      date,
      time,
      start,
      title,
      homeTeam: home.name || undefined,
      awayTeam: away.name || undefined,
      location,
      homeScore: home.score,
      awayScore: away.score,
      status,
      division: divisionOf(home.name, away.name, title),
      sourceUrl,
    });
  }
  return games;
}

function cellsOf(row: unknown): string[] {
  if (Array.isArray(row)) return row.map((c) => stripHtml(c));
  if (row && typeof row === "object") {
    const r = row as Record<string, unknown>;
    return Object.keys(r)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => stripHtml(r[k]));
  }
  return [];
}

function num(cells: string[], i: number): number {
  const n = parseInt((cells[i] || "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

/*
 * Standings columns (per the visible table): Team, G, W, L, T, P, F, A.
 * Best-effort + defensive: real shape is verified only when a season has
 * standings; empty/garbage returns [] and the page shows the iframe fallback.
 */
function parseStandings(json: unknown): StandingRow[] {
  const rows = extractRows(json);
  const out: StandingRow[] = [];
  for (const row of rows) {
    const cells = cellsOf(row);
    if (cells.length < 6) continue;
    const team = cells[0];
    if (!team) continue;
    const pf = num(cells, 6);
    const pa = num(cells, 7);
    out.push({
      team,
      gp: num(cells, 1),
      w: num(cells, 2),
      l: num(cells, 3),
      t: num(cells, 4),
      pts: num(cells, 5),
      pf,
      pa,
      diff: pf - pa,
      division: divisionOf(team),
    });
  }
  return out;
}

/* Cache the JSON-safe (serialized) results for an hour; POSTs aren't cached by
   fetch itself, so we cache the parsed payload via unstable_cache instead. */
// IDs are passed as args so they become part of the cache key: changing season
// (or pointing at a bad id) busts the cache instead of serving stale data.
const cachedEvents = unstable_cache(
  async (base: string, assoc: string): Promise<SerialGame[]> => {
    const json = await post(`${base}/leagues/getAllEvents/${assoc}`);
    if (!json) return [];
    try {
      return parseEvents(json).map(serializeGame);
    } catch (err) {
      console.error("[teamlinkt] parseEvents failed:", err);
      return [];
    }
  },
  ["teamlinkt-events"],
  { revalidate: 3600 }
);

const cachedStandings = unstable_cache(
  async (base: string, assoc: string, season: string): Promise<StandingRow[]> => {
    const json = await post(`${base}/leagues/getStandings/${assoc}/${season}`);
    if (!json) return [];
    try {
      return parseStandings(json);
    } catch (err) {
      console.error("[teamlinkt] parseStandings failed:", err);
      return [];
    }
  },
  ["teamlinkt-standings"],
  { revalidate: 3600 }
);

/*
 * LEGACY FALLBACK ONLY. Do not import these directly from pages or new code; always
 * go through src/lib/cmbaSchedule.ts (getEventsWithSource / getStandingsWithSource),
 * which serves our own data first and only calls these when our data is empty while
 * FEATURE_LEGACY_TEAMLINKT is true. After the TeamLinkt cutover (flag set to false and
 * verified, see docs/OPERATOR_ACTIONS.md and docs/DECISIONS.md), delete these two
 * functions and the fallback branches in cmbaSchedule; getTeamLinktConfig stays.
 */
export async function getEvents(): Promise<Game[]> {
  const { base, assoc } = cfg();
  return (await cachedEvents(base, assoc)).map(deserializeGame);
}

export async function getStandings(): Promise<StandingRow[]> {
  const { base, assoc, season } = cfg();
  return cachedStandings(base, assoc, season);
}
