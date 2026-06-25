"use client";

import { useState } from "react";
import { Upload, Download, CheckCircle2, AlertTriangle, XCircle, Undo2 } from "lucide-react";

type Season = { id: number | string; name: string };
type Issue = { severity: "error" | "warning"; message: string; value?: string };
type Row = { row: number; status: string; issues: Issue[] };
type Conflict = { kind: string; gameA: string | number; gameB: string | number; sharedKey: string; window: { start: string; end: string } };
type Preview = {
  kind: string;
  validation: { rows: Row[]; summary: { ready: number; warnings: number; errors: number } };
  conflicts: Conflict[];
  canImport: boolean;
  needsAck: boolean;
};

const TEMPLATES = [
  { kind: "teams", title: "Teams", desc: "Your teams and which division each one plays in.", file: "CMBA_Teams_Template.csv" },
  { kind: "venues", title: "Venues", desc: "Your gyms and courts, with addresses for directions.", file: "CMBA_Venues_Template.csv" },
  { kind: "officials", title: "Officials", desc: "Your referees and their levels. Optional.", file: "CMBA_Officials_Template.csv" },
  { kind: "games", title: "Games", desc: "Your full game schedule. Import this last.", file: "CMBA_Games_Template.csv" },
];

const inputCls = "w-full bg-cmba-black-surface border border-white/12 px-3 py-2 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors";
const labelCls = "block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1";
const btn = "inline-flex items-center gap-1.5 bg-cmba-red hover:bg-cmba-hot disabled:opacity-50 text-white font-display font-bold text-xs uppercase tracking-wider px-4 py-2 transition-colors";

export function ImportConsole({ seasons }: { seasons: Season[] }) {
  const [csv, setCsv] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [kind, setKind] = useState<string>("auto");
  const [publishMode, setPublishMode] = useState<"draft" | "published">("draft");
  const [seasonId, setSeasonId] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ batchId: number | string; counts: Record<string, number> } | null>(null);

  async function onFile(f: File | null) {
    setPreview(null);
    setResult(null);
    setAck(false);
    if (!f) { setCsv(""); setFileName(""); return; }
    setFileName(f.name);
    setCsv(await f.text());
  }

  async function validate() {
    if (!csv) { setMsg("Choose a .csv file first."); return; }
    setBusy(true); setMsg(null); setResult(null);
    try {
      const res = await fetch("/api/v1/import/validate", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ csv, kind: kind === "auto" ? undefined : kind, seasonId: seasonId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "Validation failed."); return; }
      setPreview(data);
    } finally { setBusy(false); }
  }

  async function commit() {
    if (!preview) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/v1/import/commit", {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": `import-${fileName}-${csv.length}` }, credentials: "include",
        body: JSON.stringify({ csv, kind: preview.kind, publishMode, acknowledged: ack, seasonId: seasonId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "Import failed."); return; }
      setResult({ batchId: data.batchId, counts: data.counts || {} });
      setPreview(null);
    } finally { setBusy(false); }
  }

  async function undo() {
    if (!result) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/v1/import/${result.batchId}/undo`, { method: "POST", credentials: "include" });
      const data = await res.json();
      setMsg(res.ok ? `Undone. Removed ${data.removed} records.` : data.error || "Undo failed.");
      if (res.ok) setResult(null);
    } finally { setBusy(false); }
  }

  const s = preview?.validation.summary;
  const errorRows = preview?.validation.rows.filter((r) => r.status === "error") ?? [];
  const warnRows = preview?.validation.rows.filter((r) => r.status === "warning") ?? [];
  const canImportNow = preview && preview.canImport && (!preview.needsAck || ack);

  return (
    <div className="space-y-8">
      {/* Step 1: templates */}
      <section>
        <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-3">1. Download templates</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <div key={t.kind} className="bg-cmba-black-card border border-white/12 p-4 flex flex-col">
              <div className="font-display font-bold text-sm text-white uppercase tracking-wide">{t.title}</div>
              <p className="text-[11px] text-cmba-grey mt-1 flex-1">{t.desc}</p>
              <a href={`/templates/${t.file}`} download className="mt-3 inline-flex items-center gap-1.5 border border-cmba-red/40 hover:border-cmba-red text-cmba-red hover:text-white font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 transition-colors w-fit">
                <Download size={12} /> Download
              </a>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-cmba-grey-mid mt-2">Import order is Teams and Venues and Officials first, then Games, because games refer to them by name.</p>
      </section>

      {/* Step 2: upload */}
      <section className="bg-cmba-black-card border border-white/12 p-5">
        <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-4">2. Upload a file</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>CSV file</label>
            <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="text-xs text-cmba-grey-light" />
            {fileName && <p className="text-[11px] text-cmba-grey-mid mt-1">{fileName}</p>}
          </div>
          <div>
            <label className={labelCls}>File type</label>
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="auto">Auto detect</option>
              <option value="teams">Teams</option>
              <option value="venues">Venues</option>
              <option value="officials">Officials</option>
              <option value="games">Games</option>
            </select>
          </div>
          {seasons.length > 0 && (
            <div>
              <label className={labelCls}>Season (optional scope)</label>
              <select className={inputCls} value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
                <option value="">All seasons</option>
                {seasons.map((se) => <option key={se.id} value={se.id}>{se.name}</option>)}
              </select>
            </div>
          )}
          {(kind === "games" || kind === "auto") && (
            <div>
              <label className={labelCls}>Games: save as</label>
              <select className={inputCls} value={publishMode} onChange={(e) => setPublishMode(e.target.value as "draft" | "published")}>
                <option value="draft">Draft (not shown publicly)</option>
                <option value="published">Publish when approved</option>
              </select>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={validate} disabled={busy || !csv} className={btn}><Upload size={14} /> {busy ? "Working…" : "Validate file"}</button>
          {msg && <span className="text-xs text-cmba-grey-light">{msg}</span>}
        </div>
      </section>

      {/* Step 3: preview */}
      {preview && s && (
        <section className="bg-cmba-black-card border border-white/12 p-5">
          <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-4">3. Review the preview ({preview.kind})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat label="Ready" value={s.ready} cls="text-green-400" />
            <Stat label="Warnings" value={s.warnings} cls="text-orange-400" />
            <Stat label="Errors" value={s.errors} cls="text-red-400" />
            <Stat label="Conflicts" value={preview.conflicts.length} cls="text-orange-400" />
          </div>

          {errorRows.length > 0 && (
            <Block title="Errors (these rows will not import)" icon={<XCircle size={14} className="text-red-400" />}>
              {errorRows.map((r) => r.issues.filter((i) => i.severity === "error").map((i, j) => (
                <li key={`${r.row}-${j}`} className="text-xs text-cmba-grey-light">Row {r.row}. {i.message}{i.value ? ` Value: ${i.value}` : ""}</li>
              )))}
            </Block>
          )}
          {warnRows.length > 0 && (
            <Block title="Warnings (these rows will import if you continue)" icon={<AlertTriangle size={14} className="text-orange-400" />}>
              {warnRows.map((r) => r.issues.filter((i) => i.severity === "warning").map((i, j) => (
                <li key={`${r.row}-${j}`} className="text-xs text-cmba-grey-light">Row {r.row}. {i.message}{i.value ? ` Value: ${i.value}` : ""}</li>
              )))}
            </Block>
          )}
          {preview.conflicts.length > 0 && (
            <Block title="Conflicts" icon={<AlertTriangle size={14} className="text-orange-400" />}>
              {preview.conflicts.map((c, j) => (
                <li key={j} className="text-xs text-cmba-grey-light">{c.kind.replaceAll("_", " ")}. Shared {c.sharedKey} overlapping at {new Date(c.window.start).toLocaleString("en-CA")}.</li>
              ))}
            </Block>
          )}

          {preview.needsAck && (
            <label className="flex items-center gap-2 mt-4 text-xs text-cmba-grey-light">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              I have reviewed the warnings and conflicts and want to continue. Errors can never be bypassed.
            </label>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button onClick={commit} disabled={busy || !canImportNow} className={btn}><CheckCircle2 size={14} /> {busy ? "Importing…" : "Import now"}</button>
            {!preview.canImport && <span className="text-xs text-red-400">Fix the errors and re-upload.</span>}
          </div>
        </section>
      )}

      {/* After import */}
      {result && (
        <section className="bg-cmba-black-card border border-cmba-red/30 p-5">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 size={18} className="text-green-400" /><span className="font-display font-bold text-white uppercase tracking-wide text-sm">Imported</span></div>
          <p className="text-xs text-cmba-grey-light">{Object.entries(result.counts).map(([k, v]) => `${v} ${k}`).join(", ") || "Done"}.</p>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={undo} disabled={busy} className="inline-flex items-center gap-1.5 border border-white/30 hover:border-cmba-red text-cmba-grey-light hover:text-white font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 transition-colors"><Undo2 size={12} /> Undo this import</button>
            {msg && <span className="text-xs text-cmba-grey-light">{msg}</span>}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="bg-cmba-black-surface border border-white/10 p-3 text-center">
      <div className={`font-display font-black text-2xl tabular-nums ${cls}`}>{value}</div>
      <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Block({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="border-t border-white/10 pt-3 mt-3" open>
      <summary className="flex items-center gap-2 font-display font-bold text-xs text-white uppercase tracking-wide cursor-pointer">{icon} {title}</summary>
      <ul className="mt-2 space-y-1 pl-1 max-h-64 overflow-y-auto">{children}</ul>
    </details>
  );
}
