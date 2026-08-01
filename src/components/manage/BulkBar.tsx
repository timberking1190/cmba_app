"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";

import type { BulkAction } from "@/lib/manage/bulkOps";

import { ActionButton, Callout, Panel, inputCls } from "./ui";

type Venue = { id: string | number; name: string };

type Plan = {
  headline: string;
  irreversible: boolean;
  changes: Array<{ gameId: string | number; summary: string }>;
  skipped: Array<{ gameId: string | number; summary: string; skipped?: string }>;
  affectedTeams: string[];
};

const labelCls = "block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1";

const ACTIONS: Array<{ value: BulkAction; label: string; needs?: "date" | "venue" }> = [
  { value: "publish", label: "Put on the public site" },
  { value: "unpublish", label: "Take off the public site" },
  { value: "move-date", label: "Move to a new date", needs: "date" },
  { value: "move-venue", label: "Move to a new venue", needs: "venue" },
  { value: "postpone", label: "Postpone" },
  { value: "cancel", label: "Cancel" },
];

/*
 * Bulk actions on the games a scheduler has ticked.
 *
 * Nothing runs without a preview first. The preview says how many games change,
 * which ones are left alone and why, and which teams are affected, so nobody
 * moves a weekend and then finds out who they disrupted. The whole batch can be
 * put back for an hour afterwards.
 */
export function BulkBar({ selectedIds, venues, onDone }: { selectedIds: Array<string | number>; venues: Venue[]; onDone: () => void }) {
  const router = useRouter();
  const [action, setAction] = useState<BulkAction>("publish");
  const [newDate, setNewDate] = useState("");
  const [newVenueId, setNewVenueId] = useState("");
  const [reason, setReason] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ batchId: string | number | null; message: string; skipped: Plan["skipped"] } | null>(null);

  const spec = ACTIONS.find((a) => a.value === action);
  const needsDate = spec?.needs === "date" && !newDate;
  const needsVenue = spec?.needs === "venue" && !newVenueId;

  async function call(dryRun: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/games/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action,
          gameIds: selectedIds,
          reason,
          newDate: newDate || undefined,
          newVenueId: newVenueId ? Number(newVenueId) : undefined,
          dryRun,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "That did not work and nothing was changed. Please try again.");
        return;
      }
      if (dryRun) {
        setPlan(data.plan as Plan);
        setResult(null);
      } else {
        setResult({ batchId: data.batchId, message: data.message, skipped: data.skipped ?? [] });
        setPlan(null);
        onDone();
        router.refresh();
      }
    } catch {
      setError("That did not work because the connection failed. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!result?.batchId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/games/bulk/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ batchId: result.batchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "The undo did not run. The change is still in place.");
        return;
      }
      setResult(null);
      router.refresh();
    } catch {
      setError("The undo could not be sent because the connection failed. The change is still in place.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title={`${selectedIds.length} game${selectedIds.length === 1 ? "" : "s"} selected`}
      description="Check what will happen before anything changes. You can put the whole batch back for an hour afterwards."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label htmlFor="bulk-action" className={labelCls}>
            What to do
          </label>
          <select
            id="bulk-action"
            className={inputCls}
            value={action}
            onChange={(e) => {
              setAction(e.target.value as BulkAction);
              setPlan(null);
            }}
          >
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        {spec?.needs === "date" && (
          <div>
            <label htmlFor="bulk-date" className={labelCls}>
              New date
            </label>
            <input
              id="bulk-date"
              type="date"
              className={inputCls}
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setPlan(null);
              }}
            />
            <p className="text-[11px] text-cmba-grey-mid mt-1">Each game keeps its time of day.</p>
          </div>
        )}
        {spec?.needs === "venue" && (
          <div>
            <label htmlFor="bulk-venue" className={labelCls}>
              New venue
            </label>
            <select
              id="bulk-venue"
              className={inputCls}
              value={newVenueId}
              onChange={(e) => {
                setNewVenueId(e.target.value);
                setPlan(null);
              }}
            >
              <option value="">Choose a venue</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-cmba-grey-mid mt-1">The court is cleared, because the old court is in the old building.</p>
          </div>
        )}
        <div className="sm:col-span-2">
          <label htmlFor="bulk-reason" className={labelCls}>
            Reason (required, recorded in the audit log)
          </label>
          <input id="bulk-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: rink closure, whole weekend moved" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ActionButton
          variant="secondary"
          onClick={() => call(true)}
          busy={busy}
          busyLabel="Checking"
          disabledReason={needsDate ? "Choose the new date first." : needsVenue ? "Choose the new venue first." : null}
        >
          Show me what will happen
        </ActionButton>
      </div>

      {error && (
        <div className="mt-3">
          <Callout tone="error" title="That did not work">
            {error}
          </Callout>
        </div>
      )}

      {plan && (
        <div className="mt-4 space-y-3">
          <Callout tone={plan.irreversible ? "warning" : "info"} title="Before you do this">
            {plan.headline}
            {plan.irreversible && " Cancelling takes a game off the schedule for families who may have already planned around it."}
          </Callout>

          {plan.affectedTeams.length > 0 && (
            <div>
              <p className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Teams affected</p>
              <p className="text-xs text-cmba-grey-light">{plan.affectedTeams.join(", ")}</p>
            </div>
          )}

          {plan.changes.length > 0 && (
            <details open className="border-t border-white/10 pt-3">
              <summary className="font-display font-bold text-xs text-white uppercase tracking-wide cursor-pointer">
                {plan.changes.length} game{plan.changes.length === 1 ? "" : "s"} will change
              </summary>
              <ul className="mt-2 space-y-1 max-h-56 overflow-y-auto">
                {plan.changes.map((c) => (
                  <li key={String(c.gameId)} className="text-xs text-cmba-grey-light">
                    {c.summary}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {plan.skipped.length > 0 && (
            <details className="border-t border-white/10 pt-3">
              <summary className="font-display font-bold text-xs text-white uppercase tracking-wide cursor-pointer">
                {plan.skipped.length} will be left alone
              </summary>
              <ul className="mt-2 space-y-1 max-h-56 overflow-y-auto">
                {plan.skipped.map((c) => (
                  <li key={String(c.gameId)} className="text-xs text-cmba-grey-mid">
                    {c.summary}. {c.skipped}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              variant={plan.irreversible ? "danger" : "primary"}
              onClick={() => call(false)}
              busy={busy}
              busyLabel="Working"
              disabledReason={
                plan.changes.length === 0
                  ? "Nothing would change, so there is nothing to do."
                  : !reason.trim()
                    ? "Add a reason first. Every change is recorded in the audit log."
                    : null
              }
            >
              Yes, change {plan.changes.length} game{plan.changes.length === 1 ? "" : "s"}
            </ActionButton>
            <ActionButton variant="quiet" onClick={() => setPlan(null)}>
              Not now
            </ActionButton>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <Callout tone="success" title="Done">
            {result.message}
          </Callout>
          {result.skipped.length > 0 && (
            <ul className="space-y-1">
              {result.skipped.map((c) => (
                <li key={String(c.gameId)} className="text-xs text-cmba-grey-mid">
                  {c.summary}. {c.skipped}
                </li>
              ))}
            </ul>
          )}
          <ActionButton variant="danger" onClick={undo} busy={busy} busyLabel="Undoing" disabledReason={result.batchId == null ? "This change cannot be undone automatically." : null}>
            <Undo2 size={12} /> Undo this whole change
          </ActionButton>
        </div>
      )}
    </Panel>
  );
}
