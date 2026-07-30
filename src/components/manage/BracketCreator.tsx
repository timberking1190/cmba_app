"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Trophy } from "lucide-react";

import { ActionButton, Callout, Panel, inputCls } from "./ui";

type Division = { id: string | number; name: string };

type Preview = {
  ok: boolean;
  error?: string;
  totalRounds: number;
  teamCount: number;
  byeCount: number;
  seeds: Array<{ seed: number; teamId: string | number; teamName: string }>;
  rounds: Array<{ round: number; name: string; matchups: Array<{ slot: number; homeSeed?: number; awaySeed?: number; homeTeamName: string; awayTeamName: string; isBye: boolean }> }>;
};

const labelCls = "block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1";

/*
 * Creating a bracket, in the order a first time scheduler thinks about it:
 * choose the division, look at the seeding, look at the matchups, then create it.
 * Nothing exists until Create, and what is created is a draft that nobody outside
 * the league office can see until it is published.
 */
export function BracketCreator({ divisions }: { divisions: Division[] }) {
  const router = useRouter();
  const [divisionId, setDivisionId] = useState("");
  const [name, setName] = useState("Playoffs");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [seedOrder, setSeedOrder] = useState<Array<{ teamId: string | number; teamName: string }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPreview(manualSeeds?: Array<string | number>) {
    if (!divisionId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/brackets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          divisionId: Number(divisionId),
          dryRun: true,
          source: manualSeeds ? "manual" : "standings",
          seedTeamIds: manualSeeds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "The preview could not be built. Please try again.");
        return;
      }
      setPreview(data.preview as Preview);
      if (!manualSeeds) setSeedOrder((data.preview as Preview).seeds.map((s) => ({ teamId: s.teamId, teamName: s.teamName })));
    } catch {
      setError("The preview could not be built because the connection failed. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  function moveSeed(index: number, direction: -1 | 1) {
    if (!seedOrder) return;
    const next = [...seedOrder];
    const to = index + direction;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setSeedOrder(next);
    void loadPreview(next.map((s) => s.teamId));
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/brackets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          divisionId: Number(divisionId),
          name,
          reason,
          source: seedOrder ? "manual" : "standings",
          seedTeamIds: seedOrder?.map((s) => s.teamId),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "The bracket could not be created and nothing was saved. Please try again.");
        return;
      }
      router.push(`/manage/brackets/${data.bracketId}`);
    } catch {
      setError("The bracket could not be created because the connection failed. Nothing was saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel title="1. Choose a division" description="The seeding starts from that division's current standings. You can reorder it before anything is created.">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="bc-division" className={labelCls}>
              Division
            </label>
            <select
              id="bc-division"
              className={inputCls}
              value={divisionId}
              onChange={(e) => {
                setDivisionId(e.target.value);
                setPreview(null);
                setSeedOrder(null);
              }}
            >
              <option value="">Choose a division</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="bc-name" className={labelCls}>
              What to call this bracket
            </label>
            <input id="bc-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Playoffs" />
          </div>
        </div>
        <div className="mt-4">
          <ActionButton variant="primary" onClick={() => loadPreview()} busy={busy} busyLabel="Building" disabledReason={!divisionId ? "Choose a division first." : null}>
            <Eye size={13} /> Show me the bracket
          </ActionButton>
        </div>
      </Panel>

      {error && (
        <Callout tone="error" title="That did not work">
          {error}
        </Callout>
      )}

      {preview && !preview.ok && (
        <Callout tone="warning" title="This division cannot have a bracket yet">
          {preview.error}
        </Callout>
      )}

      {preview?.ok && (
        <>
          <Panel title="2. Check the seeding" description="Seed 1 is the top of the standings. Move a team if the league has decided differently. Nothing is saved yet.">
            <ol className="space-y-1">
              {(seedOrder ?? preview.seeds.map((s) => ({ teamId: s.teamId, teamName: s.teamName }))).map((s, i) => (
                <li key={s.teamId} className="flex items-center gap-2 text-sm text-cmba-grey-light">
                  <span className="font-mono text-[11px] text-cmba-grey-mid w-8 tabular-nums">#{i + 1}</span>
                  <span className="flex-1">{s.teamName}</span>
                  <ActionButton variant="quiet" onClick={() => moveSeed(i, -1)} disabledReason={i === 0 ? "Already the top seed." : null}>
                    Up
                  </ActionButton>
                  <ActionButton variant="quiet" onClick={() => moveSeed(i, 1)} disabledReason={i === (seedOrder?.length ?? 0) - 1 ? "Already the bottom seed." : null}>
                    Down
                  </ActionButton>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel
            title="3. Check the matchups"
            description={`${preview.teamCount} teams, ${preview.totalRounds} rounds${preview.byeCount ? `, and ${preview.byeCount} team${preview.byeCount === 1 ? "" : "s"} with a bye in the first round` : ""}.`}
          >
            {preview.byeCount > 0 && (
              <Callout tone="info" title="Byes">
                The number of teams is not a power of two, so the top seeds skip the first round. A bye is not a game and never appears on the public schedule.
              </Callout>
            )}
            <div className="mt-3 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {preview.rounds.map((r) => (
                <div key={r.round}>
                  <h3 className="font-display font-bold text-xs text-white uppercase tracking-wide mb-2">{r.name}</h3>
                  <ul className="space-y-1">
                    {r.matchups.map((m) => (
                      <li key={m.slot} className="bg-cmba-black-surface border border-white/10 px-3 py-2 text-xs text-cmba-grey-light">
                        {m.isBye ? (
                          <span>
                            {m.homeTeamName === "Bye" ? m.awayTeamName : m.homeTeamName} <span className="text-cmba-grey-mid">has a bye</span>
                          </span>
                        ) : (
                          <span>
                            {m.homeSeed ? <span className="font-mono text-[10px] text-cmba-grey-mid mr-1">#{m.homeSeed}</span> : null}
                            {m.homeTeamName} <span className="text-cmba-grey-mid">vs</span>{" "}
                            {m.awaySeed ? <span className="font-mono text-[10px] text-cmba-grey-mid mr-1">#{m.awaySeed}</span> : null}
                            {m.awayTeamName}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="4. Create it" description="The bracket is created as a draft. Nobody outside the league office sees it until you publish it.">
            <div>
              <label htmlFor="bc-reason" className={labelCls}>
                Reason (required, recorded in the audit log)
              </label>
              <input id="bc-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: 2026 playoffs, seeded from the final standings" />
            </div>
            <div className="mt-4">
              <ActionButton
                variant="primary"
                onClick={create}
                busy={busy}
                busyLabel="Creating"
                disabledReason={!reason.trim() ? "Add a reason first. Every change is recorded in the audit log." : null}
              >
                <Trophy size={13} /> Create this bracket as a draft
              </ActionButton>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
