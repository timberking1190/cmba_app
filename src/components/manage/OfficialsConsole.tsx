"use client";

import { useState } from "react";

type Game = { id: number | string; label: string };
type Official = { id: number | string; name: string; rampLevel?: string };

const inputCls = "w-full bg-cmba-black-surface border border-white/12 px-2 py-1 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none";
const btn = "inline-flex items-center gap-1.5 bg-cmba-red hover:bg-cmba-hot disabled:opacity-50 text-white font-display font-bold text-xs uppercase tracking-wider px-4 py-2 transition-colors";

export function OfficialsConsole({ games, officials }: { games: Game[]; officials: Official[] }) {
  const [gameId, setGameId] = useState<string>(games[0] ? String(games[0].id) : "");
  const [picks, setPicks] = useState<Record<string, string>>({}); // officialId -> role
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: unknown[]; blocked: Array<{ officialId: number | string; reason: string }>; warnings: Array<{ kind: string; detail: string }> } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(id: number | string, role: string) {
    setPicks((p) => {
      const next = { ...p };
      if (next[id] === role) delete next[id];
      else next[id] = role;
      return next;
    });
  }

  async function assign() {
    const assignments = Object.entries(picks).map(([officialId, role]) => ({ officialId, role }));
    if (!gameId || !assignments.length) { setMsg("Pick a game and at least one official."); return; }
    setBusy(true); setMsg(null); setResult(null);
    try {
      const res = await fetch(`/api/v1/admin/games/${gameId}/officials`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ assignments, force }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "Assign failed."); return; }
      setResult(data);
      setPicks({});
    } finally { setBusy(false); }
  }

  if (!games.length) return <p className="text-sm text-cmba-grey">No upcoming games to assign.</p>;

  return (
    <div className="space-y-5">
      <div className="max-w-md">
        <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Game</label>
        <select className={inputCls} value={gameId} onChange={(e) => { setGameId(e.target.value); setResult(null); }}>
          {games.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </div>

      <div className="bg-cmba-black-card border border-white/12 p-4">
        <div className="font-display font-bold text-white uppercase tracking-wide text-xs mb-3">Assign officials</div>
        <div className="space-y-2">
          {officials.map((o) => (
            <div key={o.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-cmba-grey-light">{o.name}{o.rampLevel ? ` · ${o.rampLevel}` : ""}</span>
              {["referee1", "referee2", "scorekeeper"].map((role) => (
                <button key={role} onClick={() => toggle(o.id, role)}
                  className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 border transition-colors ${picks[o.id] === role ? "bg-cmba-red text-white border-cmba-red" : "border-white/12 text-cmba-grey hover:border-cmba-red/40"}`}>
                  {role.replace("referee", "ref ")}
                </button>
              ))}
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 mt-3 text-xs text-cmba-grey-light">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> Override double-booking conflicts
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={assign} disabled={busy} className={btn}>{busy ? "Assigning…" : "Assign"}</button>
          {msg && <span className="text-xs text-cmba-grey-light">{msg}</span>}
        </div>
      </div>

      {result && (
        <div className="bg-cmba-black-card border border-white/12 p-4 text-xs space-y-1">
          <p className="text-green-400">Assigned {result.created.length}.</p>
          {result.blocked.map((b, i) => <p key={`b-${i}`} className="text-red-400">Blocked official {String(b.officialId)}: {b.reason}</p>)}
          {result.warnings.map((w, i) => <p key={`w-${i}`} className="text-orange-400">{w.detail}</p>)}
        </div>
      )}
    </div>
  );
}
