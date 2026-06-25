"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AdminGame = {
  id: number | string;
  status: string;
  publishState: string;
  homeTeam: string;
  awayTeam: string;
  division: string;
  date: string;
  homeScore?: number | null;
  awayScore?: number | null;
  disputeReason?: string;
};

const inputCls = "w-full bg-cmba-black-surface border border-white/12 px-2 py-1 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none";
const btn = "inline-flex items-center gap-1.5 bg-cmba-red hover:bg-cmba-hot disabled:opacity-50 text-white font-display font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 transition-colors";
const ghost = "font-mono text-[11px] text-cmba-grey hover:text-white uppercase tracking-wider px-2 py-1 transition-colors";

const STATUS_CLS: Record<string, string> = {
  scheduled: "text-cmba-red", reported: "text-orange-400", contested: "text-orange-400",
  final: "text-green-400", forfeit: "text-red-400", postponed: "text-cmba-grey-light", cancelled: "text-red-400",
};

export function SchedulingConsole({ games }: { games: AdminGame[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<number | string | null>(null);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("final");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function override(id: number | string, body: Record<string, unknown>) {
    if (!reason.trim()) { setMsg("A reason is required."); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/games/${id}/override`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ ...body, reason }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "Action failed."); return; }
      setOpenId(null); setReason(""); setHome(""); setAway("");
      router.refresh();
    } finally { setBusy(false); }
  }

  async function publish(id: number | string, to: "published" | "draft") {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/games/${id}/override`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ publishState: to, reason: `Set ${to}` }),
      });
      if (!res.ok) { const d = await res.json(); setMsg(d.error || "Failed."); return; }
      router.refresh();
    } finally { setBusy(false); }
  }

  if (!games.length) return <p className="text-sm text-cmba-grey">No games to show.</p>;

  return (
    <div className="space-y-2">
      {msg && <p className="text-xs text-cmba-grey-light">{msg}</p>}
      {games.map((g) => (
        <div key={g.id} className="bg-cmba-black-card border border-white/12 p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[10px] text-cmba-grey-mid">{g.date}</span>
            <span className="font-display font-bold text-sm text-white">{g.homeTeam} <span className="text-cmba-grey-mid">vs</span> {g.awayTeam}</span>
            {(g.homeScore != null && g.awayScore != null) && <span className="font-display font-black tabular-nums text-white">{g.homeScore}-{g.awayScore}</span>}
            <span className="font-mono text-[10px] text-cmba-grey-mid">{g.division}</span>
            <span className={`font-mono text-[10px] uppercase tracking-wider ${STATUS_CLS[g.status] ?? "text-cmba-grey"}`}>{g.status}</span>
            <span className="font-mono text-[10px] text-cmba-grey-dark uppercase">{g.publishState}</span>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => publish(g.id, g.publishState === "published" ? "draft" : "published")} disabled={busy} className={ghost}>
                {g.publishState === "published" ? "Unpublish" : "Publish"}
              </button>
              <button onClick={() => { setOpenId(openId === g.id ? null : g.id); setReason(""); setStatus("final"); }} className={ghost}>Manage</button>
            </div>
          </div>
          {g.disputeReason && <p className="text-[11px] text-orange-300 mt-1">Review: {g.disputeReason}</p>}

          {openId === g.id && (
            <div className="mt-3 pt-3 border-t border-white/10 grid sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">
                <input className={inputCls} placeholder="Reason (required, recorded in the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="final">Finalize with score</option>
                <option value="postponed">Postpone</option>
                <option value="cancelled">Cancel</option>
                <option value="contested">Mark contested</option>
                <option value="scheduled">Reset to scheduled</option>
                <option value="forfeit">Forfeit</option>
              </select>
              {status === "final" && (
                <div className="flex gap-2">
                  <input className={inputCls} type="number" placeholder="Home" value={home} onChange={(e) => setHome(e.target.value)} />
                  <input className={inputCls} type="number" placeholder="Away" value={away} onChange={(e) => setAway(e.target.value)} />
                </div>
              )}
              <div className="sm:col-span-2 flex gap-2">
                <button
                  disabled={busy}
                  className={btn}
                  onClick={() => {
                    if (status === "forfeit") override(g.id, { forfeit: { outcome: "home_forfeit", forfeitingTeam: null } });
                    else if (status === "final") override(g.id, { patch: { status: "final", homeScore: Number(home), awayScore: Number(away) } });
                    else override(g.id, { patch: { status } });
                  }}
                >
                  Apply
                </button>
                <button className={ghost} onClick={() => setOpenId(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
