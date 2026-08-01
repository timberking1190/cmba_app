"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Globe, Pencil, RefreshCw, Trash2, Trophy } from "lucide-react";

import type { BracketView } from "@/lib/brackets/manage";

import { ActionButton, Callout, LinkButton, Panel, StatusChip, inputCls } from "./ui";
import type { GameStatus } from "@/lib/scheduleUtils";

const labelCls = "block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1";

/*
 * Managing one bracket. Three things a scheduler does here:
 *  - Publish it, which creates the playoff games and puts them on the public
 *    schedule, the team pages, and the calendar feed.
 *  - Watch it advance itself as results come in.
 *  - Step in when it cannot decide: a double forfeit, a no contest, a tie, or a
 *    scoring mistake that already carried a team forward.
 *
 * Destructive actions (rebuild, delete) look different from everything else and
 * are refused while the bracket is published, with a sentence saying what to do
 * instead.
 */
export function BracketManager({ bracket: initial }: { bracket: BracketView }) {
  const router = useRouter();
  const [bracket, setBracket] = useState(initial);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const published = bracket.publishState === "published";

  async function act(action: string) {
    setBusy(action);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/v1/admin/brackets/${bracket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "That did not work and nothing was changed. Please try again.");
        return;
      }
      if (data.deleted) {
        router.push("/manage/brackets");
        return;
      }
      if (data.bracket) setBracket(data.bracket as BracketView);
      setReason("");
      setConfirmDelete(false);
      setSuccess(
        action === "publish"
          ? `Published. ${data.gamesCreated ?? 0} playoff game${data.gamesCreated === 1 ? "" : "s"} were created and are now on the public schedule. Set their dates and venues on the schedule screen.`
          : action === "unpublish"
            ? "Taken off the public site. Its games are back to draft, so families no longer see them."
            : action === "regenerate"
              ? "Rebuilt from the current standings."
              : action === "resolve-byes"
                ? `${data.resolved ?? 0} bye${data.resolved === 1 ? "" : "s"} resolved.`
                : "Done.",
      );
    } catch {
      setError("That did not work because the connection failed. Nothing was changed.");
    } finally {
      setBusy(null);
    }
  }

  async function setWinner(seriesId: string | number, winnerTeamId: string | number | null) {
    setBusy(`series-${seriesId}`);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/v1/admin/brackets/${bracket.id}/series/${seriesId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ winnerTeamId, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "That did not save and nothing was changed. Please try again.");
        return;
      }
      if (data.bracket) setBracket(data.bracket as BracketView);
      setReason("");
      setSuccess(winnerTeamId == null ? "The winner was cleared and the next round was corrected." : "The winner was set by hand and the next round was updated.");
    } catch {
      setError("That did not save because the connection failed. Nothing was changed.");
    } finally {
      setBusy(null);
    }
  }

  const missingReason = !reason.trim() ? "Add a reason first. Every change is recorded in the audit log." : null;

  return (
    <div className="space-y-5">
      <Panel
        title={bracket.name}
        description={`${bracket.divisionName}. ${published ? "Published, so families can see these games." : "Draft, so nobody outside the league office can see it yet."}`}
        actions={
          published && bracket.divisionId != null ? (
            <LinkButton href={`/bracket/${bracket.divisionId}`} variant="secondary">
              View the public page
            </LinkButton>
          ) : undefined
        }
      >
        {bracket.champion && (
          <Callout tone="success" title="Champion">
            <span className="inline-flex items-center gap-1.5">
              <Trophy size={14} aria-hidden /> {bracket.champion} won this bracket.
            </span>
          </Callout>
        )}

        <div className="mt-3">
          <label htmlFor="bm-reason" className={labelCls}>
            Reason (required for every action below, recorded in the audit log)
          </label>
          <input id="bm-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: seeding confirmed by the board" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {published ? (
            <ActionButton variant="secondary" onClick={() => act("unpublish")} busy={busy === "unpublish"} busyLabel="Unpublishing" disabledReason={missingReason}>
              <Globe size={13} /> Take off the public site
            </ActionButton>
          ) : (
            <ActionButton variant="primary" onClick={() => act("publish")} busy={busy === "publish"} busyLabel="Publishing" disabledReason={missingReason}>
              <Globe size={13} /> Publish to the public site
            </ActionButton>
          )}
          <ActionButton variant="secondary" onClick={() => act("resolve-byes")} busy={busy === "resolve-byes"} busyLabel="Working" disabledReason={missingReason}>
            Move byes into the next round
          </ActionButton>
          <ActionButton
            variant="danger"
            onClick={() => act("regenerate")}
            busy={busy === "regenerate"}
            busyLabel="Rebuilding"
            disabledReason={published ? "Take it off the public site first. Rebuilding replaces every matchup and deletes the games it created." : missingReason}
          >
            <RefreshCw size={13} /> Rebuild from the standings
          </ActionButton>
          {confirmDelete ? (
            <ActionButton variant="danger" onClick={() => act("delete")} busy={busy === "delete"} busyLabel="Deleting" disabledReason={missingReason}>
              <Trash2 size={13} /> Yes, delete this bracket and its games
            </ActionButton>
          ) : (
            <ActionButton
              variant="danger"
              onClick={() => setConfirmDelete(true)}
              disabledReason={published ? "Take it off the public site first. Deleting also deletes the playoff games it created." : null}
            >
              <Trash2 size={13} /> Delete this bracket
            </ActionButton>
          )}
          {confirmDelete && (
            <ActionButton variant="quiet" onClick={() => setConfirmDelete(false)}>
              Cancel
            </ActionButton>
          )}
        </div>

        {confirmDelete && (
          <div className="mt-3">
            <Callout tone="warning" title="This cannot be undone">
              Deleting removes every matchup in this bracket and every playoff game it created. The regular season schedule and standings are not touched.
            </Callout>
          </div>
        )}

        {error && (
          <div className="mt-3">
            <Callout tone="error" title="That did not work">
              {error}
            </Callout>
          </div>
        )}
        {success && (
          <div className="mt-3">
            <Callout tone="success" title="Done">
              {success}
            </Callout>
          </div>
        )}
      </Panel>

      {bracket.rounds.map((round) => (
        <Panel key={round.round} title={round.name}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {round.matchups.map((m) => (
              <div key={m.id} className="bg-cmba-black-surface border border-white/10 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm ${m.winnerTeamId != null && String(m.winnerTeamId) === String(m.homeTeamId) ? "font-bold text-white" : "text-cmba-grey-light"}`}>
                      {m.homeSeed ? <span className="font-mono text-[10px] text-cmba-grey-mid mr-1">#{m.homeSeed}</span> : null}
                      {m.homeTeamName}
                    </p>
                    <p className={`text-sm ${m.winnerTeamId != null && String(m.winnerTeamId) === String(m.awayTeamId) ? "font-bold text-white" : "text-cmba-grey-light"}`}>
                      {m.awaySeed ? <span className="font-mono text-[10px] text-cmba-grey-mid mr-1">#{m.awaySeed}</span> : null}
                      {m.awayTeamName}
                    </p>
                  </div>
                  {m.gameStatus && <StatusChip status={m.gameStatus as GameStatus} />}
                </div>

                {m.gameWhen && (
                  <p className="font-mono text-[10px] text-cmba-grey-mid mt-2">
                    {m.gameWhen}
                    {m.gameVenue ? `, ${m.gameVenue}` : ""}
                  </p>
                )}

                {m.winnerName && (
                  <p className="text-[11px] text-status-ok mt-2">
                    {m.winnerName} advances
                    {m.winnerSetBy === "manual" ? ", set by an administrator" : ""}.
                  </p>
                )}

                {m.holdReason && (
                  <p className="text-[11px] text-cmba-grey-mid mt-2 flex items-start gap-1">
                    <AlertTriangle size={11} className="mt-0.5 shrink-0 text-status-warn" aria-hidden />
                    {m.holdReason}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {m.gameId && (
                    <LinkButton href={`/manage/schedule?q=${encodeURIComponent(m.homeTeamName)}`} variant="quiet">
                      <Pencil size={11} /> Set date and venue
                    </LinkButton>
                  )}
                  {m.isPlayable && (
                    <>
                      <ActionButton variant="quiet" onClick={() => setWinner(m.id, m.homeTeamId)} busy={busy === `series-${m.id}`} disabledReason={missingReason}>
                        {m.homeTeamName} wins
                      </ActionButton>
                      <ActionButton variant="quiet" onClick={() => setWinner(m.id, m.awayTeamId)} busy={busy === `series-${m.id}`} disabledReason={missingReason}>
                        {m.awayTeamName} wins
                      </ActionButton>
                    </>
                  )}
                  {m.winnerTeamId != null && (
                    <ActionButton variant="danger" onClick={() => setWinner(m.id, null)} busy={busy === `series-${m.id}`} disabledReason={missingReason}>
                      Clear the winner
                    </ActionButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
