"use client";

import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Pencil, Users, X } from "lucide-react";

import { leagueWallTimeToUtcISO } from "@/lib/leagueTime";
import { forfeitSentence, type AdminGame } from "@/lib/manageGames";
import type { GameStatus } from "@/lib/scheduleUtils";

import { ActionButton, Callout, PublishChip, StatusChip, inputCls } from "./ui";

export type { AdminGame } from "@/lib/manageGames";

export type EditOptions = {
  venues: Array<{ id: string | number; name: string; courts: Array<{ id: string | number; name: string }> }>;
  teamsByDivision: Record<string, Array<{ id: string | number; name: string }>>;
};

export type EditConflict = { kind: string; message: string; otherGameId: string | number; overridable: boolean };

const EMPTY_OPTIONS: EditOptions = { venues: [], teamsByDivision: {} };

const STATUS_CHOICES: Array<{ value: GameStatus; label: string }> = [
  { value: "scheduled", label: "Scheduled" },
  { value: "final", label: "Final, with a score" },
  { value: "postponed", label: "Postponed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "contested", label: "Contested" },
  { value: "forfeit", label: "Forfeit" },
];

const labelCls = "block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1";

/*
 * The scheduling console: one row per game, with a real Edit action.
 *
 * What the lead scheduler reported, and what changed:
 *
 *  - "Forfeit does not submit and shows no label." The old panel hardcoded every
 *    forfeit as home_forfeit with a null forfeiting team, which the service
 *    correctly refused, and printed the failure at the top of a list of a hundred
 *    games where nobody would see it. The panel now asks who forfeited by team
 *    name, requires a reason, shows the outcome inside the open panel, and
 *    updates the row from the reply so the FORFEIT chip appears at once.
 *  - "No way to edit games after import." Manage was a ghost styled toggle onto a
 *    status only panel. Edit is now an obvious button, and the panel edits the
 *    date, time, venue, court, both teams, the status, and the score. Clashes are
 *    checked as the change is made and shown inline, naming the other game.
 */
export function SchedulingConsole({
  games: initialGames,
  options = EMPTY_OPTIONS,
  emptyMessage = "No games to show.",
  selectedIds,
  onToggleSelect,
}: {
  games: AdminGame[];
  options?: EditOptions;
  emptyMessage?: string;
  /* When present, each row gets a tick box for the bulk actions. */
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string | number) => void;
}) {
  const [games, setGames] = useState<AdminGame[]>(initialGames);
  const [openId, setOpenId] = useState<number | string | null>(null);

  function replaceGame(updated: AdminGame) {
    setGames((gs) => gs.map((g) => (String(g.id) === String(updated.id) ? updated : g)));
  }

  if (!games.length) return <p className="text-sm text-cmba-grey">{emptyMessage}</p>;

  return (
    <div className="space-y-2">
      {games.map((g) => (
        <GameRow
          key={g.id}
          game={g}
          options={options}
          open={String(openId) === String(g.id)}
          onToggle={() => setOpenId(String(openId) === String(g.id) ? null : g.id)}
          onUpdated={replaceGame}
          selected={selectedIds?.has(String(g.id))}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

function GameRow({
  game: g,
  options,
  open,
  onToggle,
  onUpdated,
  selected,
  onToggleSelect,
}: {
  game: AdminGame;
  options: EditOptions;
  open: boolean;
  onToggle: () => void;
  onUpdated: (g: AdminGame) => void;
  selected?: boolean;
  onToggleSelect?: (id: string | number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rowMsg, setRowMsg] = useState<string | null>(null);
  const forfeitNote = forfeitSentence(g);

  async function publish(to: "published" | "draft") {
    setBusy(true);
    setRowMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/games/${g.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          publishState: to,
          reason: to === "published" ? "Published to the public schedule" : "Taken off the public schedule",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRowMsg(data.error || "That did not save. Nothing was changed.");
        return;
      }
      if (data.game) onUpdated(data.game as AdminGame);
    } catch {
      setRowMsg("That did not save because the connection failed. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-cmba-black-card border border-white/12">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
        {onToggleSelect && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(selected)}
              onChange={() => onToggleSelect(g.id)}
              className="h-4 w-4 accent-cmba-red"
              aria-label={`Select ${g.homeTeam} versus ${g.awayTeam} on ${g.date}`}
            />
          </label>
        )}
        <span className="font-mono text-[11px] text-cmba-grey-mid tabular-nums">{g.date}</span>
        <span className="font-display font-bold text-sm text-white">
          {g.homeTeam || "Home team"} <span className="text-cmba-grey-mid font-normal">vs</span> {g.awayTeam || "Away team"}
        </span>
        {g.homeScore != null && g.awayScore != null && (
          <span className="font-display font-black tabular-nums text-white">
            {g.homeScore}-{g.awayScore}
          </span>
        )}
        {g.division && <span className="font-mono text-[10px] text-cmba-grey-mid">{g.division}</span>}
        {(g.venue || g.court) && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-cmba-grey-mid">
            <MapPin size={10} aria-hidden />
            {[g.venue, g.court].filter(Boolean).join(", ")}
          </span>
        )}
        {g.officials.length > 0 && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-cmba-grey-mid">
            <Users size={10} aria-hidden />
            {g.officials.map((o) => o.name).join(", ")}
          </span>
        )}
        <StatusChip status={g.status} />
        <PublishChip state={g.publishState} />
        <div className="ml-auto flex items-center gap-2">
          <ActionButton variant="secondary" onClick={() => publish(g.publishState === "published" ? "draft" : "published")} busy={busy}>
            {g.publishState === "published" ? "Unpublish" : "Publish"}
          </ActionButton>
          <ActionButton variant="primary" onClick={onToggle}>
            {open ? (
              <>
                <X size={13} /> Close
              </>
            ) : (
              <>
                <Pencil size={13} /> Edit
              </>
            )}
          </ActionButton>
        </div>
      </div>

      {forfeitNote && <p className="px-3 pb-2 text-[11px] text-status-danger">{forfeitNote}</p>}
      {g.disputeReason && <p className="px-3 pb-2 text-[11px] text-status-warn">Under review: {g.disputeReason}</p>}
      {rowMsg && (
        <div className="px-3 pb-3">
          <Callout tone="error" title="That did not save">
            {rowMsg}
          </Callout>
        </div>
      )}

      {open && <EditPanel game={g} options={options} onUpdated={onUpdated} onDone={onToggle} />}
    </div>
  );
}

function EditPanel({
  game: g,
  options,
  onUpdated,
  onDone,
}: {
  game: AdminGame;
  options: EditOptions;
  onUpdated: (g: AdminGame) => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(g.dateInput);
  const [time, setTime] = useState(g.timeInput);
  const [venueId, setVenueId] = useState(String(g.venueId ?? ""));
  const [courtId, setCourtId] = useState(String(g.courtId ?? ""));
  const [homeTeamId, setHomeTeamId] = useState(String(g.homeTeamId ?? ""));
  const [awayTeamId, setAwayTeamId] = useState(String(g.awayTeamId ?? ""));
  const [status, setStatus] = useState<GameStatus>(g.status);
  const [forfeitOutcome, setForfeitOutcome] = useState<string>(g.forfeitOutcome ?? "");
  const [homeScore, setHomeScore] = useState(g.homeScore == null ? "" : String(g.homeScore));
  const [awayScore, setAwayScore] = useState(g.awayScore == null ? "" : String(g.awayScore));
  const [reason, setReason] = useState("");

  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [conflicts, setConflicts] = useState<EditConflict[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsForce, setNeedsForce] = useState(false);

  const courts = useMemo(() => options.venues.find((v) => String(v.id) === venueId)?.courts ?? [], [options.venues, venueId]);
  const teams = useMemo(() => options.teamsByDivision[String(g.divisionId ?? "")] ?? [], [options.teamsByDivision, g.divisionId]);

  const isForfeit = status === "forfeit";

  /*
   * Build the change from the CURRENT form values. Taking overrides lets the
   * change handlers pass the value they just set, rather than waiting a render
   * for state to catch up.
   */
  function buildPatch(over: Partial<Record<string, string>> = {}): Record<string, unknown> | null {
    const d = over.date ?? date;
    const t = over.time ?? time;
    const v = over.venueId ?? venueId;
    const c = over.courtId ?? courtId;
    const h = over.homeTeamId ?? homeTeamId;
    const a = over.awayTeamId ?? awayTeamId;

    const startAt = d && t ? leagueWallTimeToUtcISO(d, t) : g.startAt;
    const patch: Record<string, unknown> = {};
    if (startAt && startAt !== g.startAt) patch.startAt = startAt;
    if (v !== String(g.venueId ?? "")) patch.venue = v ? Number(v) : null;
    if (c !== String(g.courtId ?? "")) patch.court = c ? Number(c) : null;
    if (h !== String(g.homeTeamId ?? "")) patch.homeTeam = Number(h);
    if (a !== String(g.awayTeamId ?? "")) patch.awayTeam = Number(a);
    if (status !== g.status && !isForfeit) patch.status = status;
    if (status === "final") {
      if (homeScore !== "") patch.homeScore = Number(homeScore);
      if (awayScore !== "") patch.awayScore = Number(awayScore);
    }
    return Object.keys(patch).length ? patch : null;
  }

  /*
   * Check the change as it is made, so a clash appears while the scheduler is
   * still looking at the field they changed. Writes nothing.
   */
  async function checkNow(patch: Record<string, unknown>) {
    setChecking(true);
    try {
      const res = await fetch(`/api/v1/admin/games/${g.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patch, dryRun: true }),
      });
      const data = await res.json();
      if (res.ok) setConflicts((data.conflicts ?? []) as EditConflict[]);
    } catch {
      // A failed check must never block editing. The save re-checks on the server.
    } finally {
      setChecking(false);
    }
  }

  function afterFieldChange(over: Partial<Record<string, string>>) {
    setSuccess(null);
    const p = buildPatch(over);
    if (p) void checkNow(p);
    else setConflicts([]);
  }

  async function save(force = false) {
    const patch = buildPatch();
    if (!isForfeit && !patch) {
      setError("Nothing has been changed yet. Change a field first, then save.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const body = isForfeit ? { forfeit: { outcome: forfeitOutcome }, reason } : { patch, reason, force: force || undefined };
      const res = await fetch(`/api/v1/admin/games/${g.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "That did not save and nothing was changed. Please try again.");
        if (data.conflicts) setConflicts(data.conflicts as EditConflict[]);
        setNeedsForce(Boolean(data.needsForce));
        return;
      }
      if (data.game) onUpdated(data.game as AdminGame);
      setNeedsForce(false);
      setConflicts([]);
      setSuccess(isForfeit ? "The forfeit was recorded and the standings were updated." : "Saved. The change is recorded in the audit log.");
      setReason("");
    } catch {
      setError("That did not save because the connection failed. Nothing was changed. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  const missingReason = !reason.trim() ? "Add a reason first. Every change is recorded in the audit log." : null;
  const forfeitBlocked = isForfeit && !forfeitOutcome ? "Choose who forfeited first." : null;

  return (
    <div className="border-t border-white/10 p-3 sm:p-4 space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label htmlFor={`date-${g.id}`} className={labelCls}>
            Date
          </label>
          <input
            id={`date-${g.id}`}
            type="date"
            className={inputCls}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              afterFieldChange({ date: e.target.value });
            }}
          />
        </div>
        <div>
          <label htmlFor={`time-${g.id}`} className={labelCls}>
            Time
          </label>
          <input
            id={`time-${g.id}`}
            type="time"
            className={inputCls}
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              afterFieldChange({ time: e.target.value });
            }}
          />
          <p className="text-[11px] text-cmba-grey-mid mt-1">Currently {g.timeLabel}.</p>
        </div>
        <div>
          <label htmlFor={`venue-${g.id}`} className={labelCls}>
            Venue
          </label>
          <select
            id={`venue-${g.id}`}
            className={inputCls}
            value={venueId}
            onChange={(e) => {
              setVenueId(e.target.value);
              setCourtId(""); // the old court belongs to the old venue
              afterFieldChange({ venueId: e.target.value, courtId: "" });
            }}
          >
            <option value="">No venue set</option>
            {options.venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`court-${g.id}`} className={labelCls}>
            Court
          </label>
          <select
            id={`court-${g.id}`}
            className={inputCls}
            value={courtId}
            onChange={(e) => {
              setCourtId(e.target.value);
              afterFieldChange({ courtId: e.target.value });
            }}
          >
            <option value="">No court set</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {venueId && courts.length === 0 && <p className="text-[11px] text-cmba-grey-mid mt-1">This venue has no courts listed yet.</p>}
        </div>
        <div>
          <label htmlFor={`home-${g.id}`} className={labelCls}>
            Home team
          </label>
          <select
            id={`home-${g.id}`}
            className={inputCls}
            value={homeTeamId}
            onChange={(e) => {
              setHomeTeamId(e.target.value);
              afterFieldChange({ homeTeamId: e.target.value });
            }}
          >
            {teams.length === 0 && <option value={homeTeamId}>{g.homeTeam || "Home team"}</option>}
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`away-${g.id}`} className={labelCls}>
            Away team
          </label>
          <select
            id={`away-${g.id}`}
            className={inputCls}
            value={awayTeamId}
            onChange={(e) => {
              setAwayTeamId(e.target.value);
              afterFieldChange({ awayTeamId: e.target.value });
            }}
          >
            {teams.length === 0 && <option value={awayTeamId}>{g.awayTeam || "Away team"}</option>}
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`status-${g.id}`} className={labelCls}>
            Status
          </label>
          <select
            id={`status-${g.id}`}
            className={inputCls}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as GameStatus);
              setSuccess(null);
            }}
          >
            {STATUS_CHOICES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {isForfeit && (
          <div>
            <label htmlFor={`forfeit-${g.id}`} className={labelCls}>
              Who forfeited
            </label>
            <select id={`forfeit-${g.id}`} className={inputCls} value={forfeitOutcome} onChange={(e) => setForfeitOutcome(e.target.value)}>
              <option value="">Choose one</option>
              <option value="home_forfeit">{g.homeTeam || "The home team"} forfeited</option>
              <option value="away_forfeit">{g.awayTeam || "The away team"} forfeited</option>
              <option value="double_forfeit">Both teams forfeited</option>
              <option value="no_contest">No contest, exclude from the standings</option>
            </select>
          </div>
        )}

        {status === "final" && (
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor={`hs-${g.id}`} className={labelCls}>
                {g.homeTeam || "Home"} score
              </label>
              <input id={`hs-${g.id}`} className={inputCls} type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
            </div>
            <div className="flex-1">
              <label htmlFor={`as-${g.id}`} className={labelCls}>
                {g.awayTeam || "Away"} score
              </label>
              <input id={`as-${g.id}`} className={inputCls} type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {checking && <p className="text-[11px] text-cmba-grey-mid">Checking this change against the rest of the schedule.</p>}

      {conflicts.length > 0 && (
        <Callout tone="warning" title={`${conflicts.length} clash${conflicts.length === 1 ? "" : "es"} with the rest of the schedule`}>
          <ul className="space-y-1 list-disc pl-4">
            {conflicts.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </Callout>
      )}

      <div>
        <label htmlFor={`reason-${g.id}`} className={labelCls}>
          Reason (required, recorded in the audit log)
        </label>
        <input
          id={`reason-${g.id}`}
          className={inputCls}
          placeholder="For example: gym closed for repairs"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {error && (
        <Callout tone="error" title="That did not save">
          {error}
        </Callout>
      )}
      {success && (
        <Callout tone="success" title="Saved">
          {success}
        </Callout>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {isForfeit ? (
          <ActionButton variant="danger" onClick={() => save()} busy={busy} busyLabel="Recording" disabledReason={forfeitBlocked ?? missingReason}>
            <CalendarDays size={13} /> Record the forfeit
          </ActionButton>
        ) : (
          <ActionButton variant="primary" onClick={() => save()} busy={busy} busyLabel="Saving" disabledReason={missingReason}>
            Save changes
          </ActionButton>
        )}
        {needsForce && (
          <ActionButton variant="danger" onClick={() => save(true)} busy={busy} busyLabel="Saving">
            Save anyway, clashes and all
          </ActionButton>
        )}
        <ActionButton variant="quiet" onClick={onDone}>
          Close
        </ActionButton>
      </div>
    </div>
  );
}
