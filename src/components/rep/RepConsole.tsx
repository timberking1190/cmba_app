"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, CheckCircle2, AlertTriangle, Clock, ExternalLink } from "lucide-react";

type RepGame = {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  division: string;
  date: string;
  status: string;
  homeScore?: number | null;
  awayScore?: number | null;
  myTeamId?: number | string;
  scoreReportId?: number | string;
  scoresheetUrl?: string | null;
};
type Dashboard = { upcoming: RepGame[]; awaitingReport: RepGame[]; awaitingConfirmation: RepGame[] };

const inputCls = "w-full bg-cmba-black-surface border border-white/12 px-2 py-1 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none";
const btn = "inline-flex items-center gap-1.5 bg-cmba-red hover:bg-cmba-hot disabled:opacity-50 text-white font-display font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 transition-colors";
const ghost = "font-mono text-[11px] text-cmba-grey hover:text-white uppercase tracking-wider px-2 py-1 transition-colors";

function key() { return `rep-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function RepConsole({ dashboard }: { dashboard: Dashboard }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [openReport, setOpenReport] = useState<number | string | null>(null);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [ack, setAck] = useState(false);

  async function submitReport(g: RepGame) {
    if (g.myTeamId == null) { setMsg("Could not determine your team."); return; }
    setBusy(true); setMsg(null);
    try {
      let fileId: number | string | undefined;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("gameId", String(g.id));
        const up = await fetch("/api/v1/uploads/scoresheet", { method: "POST", credentials: "include", body: fd });
        const upData = await up.json();
        if (!up.ok) { setMsg(upData.error || "Photo upload failed."); return; }
        fileId = upData.fileId;
      }
      const res = await fetch(`/api/v1/games/${g.id}/report`, {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key() }, credentials: "include",
        body: JSON.stringify({ submittedForTeam: g.myTeamId, homeScore: Number(home), awayScore: Number(away), scoresheetFileId: fileId }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "Could not submit the score."); return; }
      setOpenReport(null); setHome(""); setAway(""); setFile(null);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function confirm(g: RepGame, decision: "confirmed" | "disputed") {
    if (g.scoresheetUrl && decision === "confirmed" && !ack) { setMsg("Please review the scoresheet photo and tick the box first."); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/v1/games/${g.id}/confirm`, {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key() }, credentials: "include",
        body: JSON.stringify({ scoreReportId: g.scoreReportId, decision, photoAcknowledged: ack, notes: decision === "disputed" ? "Requested a review from the rep dashboard." : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "Could not submit."); return; }
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-8">
      {msg && <p className="text-xs text-cmba-grey-light">{msg}</p>}

      <Section title="Awaiting your report" icon={<ClipboardList size={14} className="text-cmba-red" />}>
        {dashboard.awaitingReport.length === 0 && <p className="text-sm text-cmba-grey">Nothing to report right now.</p>}
        {dashboard.awaitingReport.map((g) => (
          <div key={g.id} className="bg-cmba-black-card border border-white/12 p-3">
            <Row g={g} />
            <button onClick={() => { setOpenReport(openReport === g.id ? null : g.id); setMsg(null); }} className={ghost}>Report score</button>
            {openReport === g.id && (
              <div className="mt-3 pt-3 border-t border-white/10 grid sm:grid-cols-2 gap-2">
                <div className="flex gap-2">
                  <input className={inputCls} type="number" placeholder={`${g.homeTeam} (home)`} value={home} onChange={(e) => setHome(e.target.value)} />
                  <input className={inputCls} type="number" placeholder={`${g.awayTeam} (away)`} value={away} onChange={(e) => setAway(e.target.value)} />
                </div>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs text-cmba-grey-light" />
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => submitReport(g)} disabled={busy} className={btn}>{busy ? "Submitting…" : "Submit score"}</button>
                  <button onClick={() => setOpenReport(null)} className={ghost}>Cancel</button>
                </div>
                <p className="sm:col-span-2 text-[11px] text-cmba-grey-mid">Enter the home and away team scores. A scoresheet photo is optional and stays private to the two teams and admins.</p>
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section title="Awaiting your confirmation" icon={<AlertTriangle size={14} className="text-orange-400" />}>
        {dashboard.awaitingConfirmation.length === 0 && <p className="text-sm text-cmba-grey">Nothing to confirm right now.</p>}
        {dashboard.awaitingConfirmation.map((g) => (
          <div key={g.id} className="bg-cmba-black-card border border-white/12 p-3">
            <Row g={g} />
            <p className="text-sm text-cmba-grey-light">Reported: <span className="font-display font-black text-white">{g.homeScore}-{g.awayScore}</span></p>
            {g.scoresheetUrl && (
              <a href={g.scoresheetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-cmba-red hover:text-white mt-1"><ExternalLink size={11} /> View scoresheet photo</a>
            )}
            {g.scoresheetUrl && (
              <label className="flex items-center gap-2 mt-2 text-xs text-cmba-grey-light"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I have reviewed the photo and the result is correct.</label>
            )}
            <div className="mt-2 flex gap-2">
              <button onClick={() => confirm(g, "confirmed")} disabled={busy} className={btn}><CheckCircle2 size={12} /> Confirm</button>
              <button onClick={() => confirm(g, "disputed")} disabled={busy} className="inline-flex items-center gap-1.5 border border-orange-400/50 hover:border-orange-400 text-orange-300 font-display font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 transition-colors">Request review</button>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Your upcoming games" icon={<Clock size={14} className="text-cmba-grey" />}>
        {dashboard.upcoming.length === 0 && <p className="text-sm text-cmba-grey">No upcoming games.</p>}
        {dashboard.upcoming.map((g) => (
          <div key={g.id} className="bg-cmba-black-card border border-white/12 p-3"><Row g={g} /></div>
        ))}
      </Section>
    </div>
  );
}

function Row({ g }: { g: RepGame }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
      <span className="font-mono text-[10px] text-cmba-grey-mid">{g.date}</span>
      <span className="font-display font-bold text-sm text-white">{g.homeTeam} <span className="text-cmba-grey-mid">vs</span> {g.awayTeam}</span>
      <span className="font-mono text-[10px] text-cmba-grey-mid">{g.division}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-3 flex items-center gap-2">{icon} {title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
