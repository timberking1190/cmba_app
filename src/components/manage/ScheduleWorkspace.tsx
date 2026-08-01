"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";
import { useState } from "react";

import type { ScheduleFilter, ScheduleFilterOptions } from "@/lib/manage/scheduleFilters";
import type { AdminGame } from "@/lib/manageGames";

import { BulkBar } from "./BulkBar";
import { SchedulingConsole, type EditOptions } from "./SchedulingConsole";
import { ActionButton, EmptyState, LinkButton, Panel, inputCls } from "./ui";

const labelCls = "block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1";

const STATUSES = [
  { value: "", label: "Any status" },
  { value: "scheduled", label: "Scheduled" },
  { value: "reported", label: "Reported" },
  { value: "contested", label: "Contested" },
  { value: "final", label: "Final" },
  { value: "forfeit", label: "Forfeit" },
  { value: "postponed", label: "Postponed" },
  { value: "cancelled", label: "Cancelled" },
];

/*
 * The filter, paging, and result count around the game list. A season here can
 * hold thousands of games, so this screen never renders the whole season: the
 * filter and the page are in the URL, the query runs on the server, and a
 * scheduler can send someone a link to exactly the slate they are looking at.
 */
export function ScheduleWorkspace({
  games,
  options,
  filters,
  filter,
  page,
  totalPages,
  totalDocs,
}: {
  games: AdminGame[];
  options: EditOptions;
  filters: ScheduleFilterOptions;
  filter: ScheduleFilter;
  page: number;
  totalPages: number;
  totalDocs: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [draft, setDraft] = useState<ScheduleFilter>(filter);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string | number) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllOnPage() {
    setSelected(new Set(games.map((g) => String(g.id))));
  }

  function apply(next: Partial<ScheduleFilter>, toPage = 1) {
    const merged = { ...draft, ...next };
    setDraft(merged);
    const q = new URLSearchParams(params?.toString() ?? "");
    const set = (k: string, v: string) => (v ? q.set(k, v) : q.delete(k));
    set("division", merged.division);
    set("venue", merged.venue);
    set("status", merged.status);
    set("publish", merged.publishState);
    set("from", merged.from);
    set("to", merged.to);
    set("q", merged.q);
    if (toPage > 1) q.set("page", String(toPage));
    else q.delete("page");
    router.push(`/manage/schedule?${q.toString()}`);
  }

  function clearAll() {
    setDraft({ division: "", venue: "", status: "", publishState: "", from: "", to: "", q: "" });
    router.push("/manage/schedule");
  }

  const anyFilter = Object.values(filter).some(Boolean);

  return (
    <div className="space-y-5">
      <Panel
        title="Find games"
        description="Narrow the list, then edit any game in place. The web address matches what you are looking at, so you can share it."
        actions={
          anyFilter ? (
            <ActionButton variant="quiet" onClick={clearAll}>
              <RotateCcw size={12} /> Clear filters
            </ActionButton>
          ) : undefined
        }
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="f-division" className={labelCls}>
              Division
            </label>
            <select id="f-division" className={inputCls} value={draft.division} onChange={(e) => apply({ division: e.target.value })}>
              <option value="">All divisions</option>
              {filters.divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-venue" className={labelCls}>
              Venue
            </label>
            <select id="f-venue" className={inputCls} value={draft.venue} onChange={(e) => apply({ venue: e.target.value })}>
              <option value="">All venues</option>
              {filters.venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-status" className={labelCls}>
              Status
            </label>
            <select id="f-status" className={inputCls} value={draft.status} onChange={(e) => apply({ status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-publish" className={labelCls}>
              Shown publicly
            </label>
            <select id="f-publish" className={inputCls} value={draft.publishState} onChange={(e) => apply({ publishState: e.target.value })}>
              <option value="">Draft and published</option>
              <option value="published">Published only</option>
              <option value="draft">Draft only</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-from" className={labelCls}>
              From date
            </label>
            <input id="f-from" type="date" className={inputCls} value={draft.from} onChange={(e) => apply({ from: e.target.value })} />
          </div>
          <div>
            <label htmlFor="f-to" className={labelCls}>
              To date
            </label>
            <input id="f-to" type="date" className={inputCls} value={draft.to} onChange={(e) => apply({ to: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="f-q" className={labelCls}>
              Team name
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                apply({ q: draft.q });
              }}
              className="flex gap-2"
            >
              <input
                id="f-q"
                className={inputCls}
                placeholder="Part of a team name"
                value={draft.q}
                onChange={(e) => setDraft({ ...draft, q: e.target.value })}
              />
              <ActionButton variant="secondary" type="submit">
                <Filter size={13} /> Search
              </ActionButton>
            </form>
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-cmba-grey">
          {totalDocs === 0 ? "No games match" : `${totalDocs} game${totalDocs === 1 ? "" : "s"} match`}
          {anyFilter ? " these filters" : " in this season"}
          {totalPages > 1 ? `. Page ${page} of ${totalPages}.` : "."}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <ActionButton
              variant="secondary"
              onClick={() => apply({}, page - 1)}
              disabledReason={page <= 1 ? "You are on the first page." : null}
            >
              Previous
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={() => apply({}, page + 1)}
              disabledReason={page >= totalPages ? "You are on the last page." : null}
            >
              Next
            </ActionButton>
          </div>
        )}
      </div>

      {games.length === 0 ? (
        <EmptyState
          title={anyFilter ? "No games match those filters" : "No games in the schedule yet"}
          action={
            anyFilter ? (
              <ActionButton variant="primary" onClick={clearAll}>
                Clear the filters
              </ActionButton>
            ) : (
              <LinkButton href="/manage/import">Import a schedule</LinkButton>
            )
          }
        >
          {anyFilter
            ? "Try widening the dates, or clear the filters to see the whole season."
            : "Import your teams, venues, and games from a spreadsheet to get started. Nothing is saved until you review and approve it."}
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton variant="quiet" onClick={selectAllOnPage} disabledReason={selected.size === games.length ? "Every game on this page is already selected." : null}>
              Select all {games.length} on this page
            </ActionButton>
            {selected.size > 0 && (
              <ActionButton variant="quiet" onClick={() => setSelected(new Set())}>
                Clear the selection
              </ActionButton>
            )}
          </div>

          {selected.size > 0 && (
            <BulkBar selectedIds={Array.from(selected)} venues={filters.venues} onDone={() => setSelected(new Set())} />
          )}

          <SchedulingConsole games={games} options={options} selectedIds={selected} onToggleSelect={toggleSelect} />
        </>
      )}
    </div>
  );
}
