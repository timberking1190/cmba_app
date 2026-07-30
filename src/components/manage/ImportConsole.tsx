"use client";

import { useRef, useState } from "react";
import { Upload, Download, CheckCircle2, AlertTriangle, XCircle, Undo2, RotateCcw } from "lucide-react";

import { ActionButton, Callout, Panel, inputCls } from "./ui";

type Season = { id: number | string; name: string };
type Issue = { severity: "error" | "warning"; message: string; value?: string };
type Reading = { date?: string; time?: string; timeDisplay?: string };
type Row = { row: number; status: string; issues: Issue[]; normalized?: Reading };
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

const labelCls = "block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1";

/*
 * The import console. Three steps, and the scheduler can go back to step two as
 * many times as they need.
 *
 * The reported bug ("I had to refresh the page before it would look at my
 * corrected file") had two causes, both fixed here:
 *
 *  - The file input kept the previously chosen path, and a browser fires no
 *    change event when the same file name is picked again. Every read now clears
 *    the input value, so reselecting the same corrected file always re-reads it.
 *  - Only part of the screen state was cleared between attempts, so a message
 *    from the previous try stayed on screen next to the new file. resetRun now
 *    clears everything derived from a file in one place, and a Start over control
 *    does the same on demand.
 */
export function ImportConsole({ seasons }: { seasons: Season[] }) {
  const [csv, setCsv] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [kind, setKind] = useState<string>("auto");
  const [publishMode, setPublishMode] = useState<"draft" | "published">("draft");
  const [seasonId, setSeasonId] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [result, setResult] = useState<{ batchId: number | string; counts: Record<string, number> } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  /** Everything derived from a chosen file, cleared in one place. */
  function resetRun() {
    setPreview(null);
    setResult(null);
    setAck(false);
    setMsg(null);
  }

  function startOver() {
    resetRun();
    setCsv("");
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onFile(input: HTMLInputElement) {
    const f = input.files?.[0] ?? null;
    resetRun();
    // Clear the input BEFORE the await. A browser only fires change when the
    // value changes, so leaving the old path here is what forced a page reload
    // between attempts at the same corrected file.
    input.value = "";
    if (!f) {
      setCsv("");
      setFileName("");
      return;
    }
    setFileName(f.name);
    try {
      setCsv(await f.text());
    } catch {
      setCsv("");
      setMsg({ tone: "error", text: "That file could not be read. Save it again from your spreadsheet as CSV and choose it once more." });
    }
  }

  async function validate() {
    if (!csv) {
      setMsg({ tone: "error", text: "Choose a .csv file first, then select Validate file." });
      return;
    }
    setBusy(true);
    setMsg(null);
    setResult(null);
    try {
      const res = await fetch("/api/v1/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ csv, kind: kind === "auto" ? undefined : kind, seasonId: seasonId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ tone: "error", text: data.error || "The file could not be checked. Please try again in a moment." });
        return;
      }
      setPreview(data);
    } catch {
      setMsg({ tone: "error", text: "The file could not be checked because the connection failed. Check your internet and select Validate file again." });
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `import-${fileName}-${csv.length}` },
        credentials: "include",
        body: JSON.stringify({ csv, kind: preview.kind, publishMode, acknowledged: ack, seasonId: seasonId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ tone: "error", text: data.error || "The import did not run and nothing was saved. Fix what is listed above and try again." });
        return;
      }
      setResult({ batchId: data.batchId, counts: data.counts || {} });
      setPreview(null);
    } catch {
      setMsg({ tone: "error", text: "The import could not be sent because the connection failed. Nothing was saved. Check your internet and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!result) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/import/${result.batchId}/undo`, { method: "POST", credentials: "include" });
      const data = await res.json();
      setMsg(
        res.ok
          ? { tone: "info", text: `Undone. ${data.removed} records were removed and nothing from this import remains.` }
          : { tone: "error", text: data.error || "The undo did not run. The import is still in place." },
      );
      if (res.ok) setResult(null);
    } catch {
      setMsg({ tone: "error", text: "The undo could not be sent because the connection failed. The import is still in place." });
    } finally {
      setBusy(false);
    }
  }

  const s = preview?.validation.summary;
  const errorRows = preview?.validation.rows.filter((r) => r.status === "error") ?? [];
  const warnRows = preview?.validation.rows.filter((r) => r.status === "warning") ?? [];
  const readings = (preview?.validation.rows ?? []).filter((r) => r.normalized?.timeDisplay || r.normalized?.date);

  // Why the Import button cannot be used yet, in the order a scheduler hits them.
  const importBlockedBecause = !preview
    ? "Validate a file first."
    : !preview.canImport
      ? "Fix the errors listed above in your spreadsheet, save it, then choose the file again and validate."
      : preview.needsAck && !ack
        ? "Tick the box above to confirm you have read the warnings."
        : null;

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
              <a
                href={`/templates/${t.file}`}
                download
                className="mt-3 inline-flex items-center gap-1.5 border border-cmba-red/40 hover:border-cmba-red text-cmba-red hover:text-white font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 min-h-[44px] sm:min-h-0 transition-colors w-fit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmba-red"
              >
                <Download size={12} /> Download
              </a>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-cmba-grey-mid mt-2">Import order is Teams and Venues and Officials first, then Games, because games refer to them by name.</p>
        <p className="text-[11px] text-cmba-grey-mid mt-1">
          Times can be written either way. 8:00 AM, 8:00 PM, 08:00, and 20:00 all work, and so does a time your spreadsheet has turned into a number. Dates use the year
          first, like 2026-12-10. After you upload, the preview shows the exact date and time the system read for every game so you can check it before anything is saved.
        </p>
      </section>

      {/* Step 2: upload */}
      <Panel
        title="2. Upload a file"
        actions={
          (fileName || preview || result) && (
            <ActionButton variant="quiet" onClick={startOver}>
              <RotateCcw size={12} /> Start over
            </ActionButton>
          )
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="import-file" className={labelCls}>
              CSV file
            </label>
            <input
              id="import-file"
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFile(e.currentTarget)}
              className="text-xs text-cmba-grey-light file:mr-3 file:border file:border-white/25 file:bg-cmba-black-surface file:text-cmba-grey-light file:px-3 file:py-2 file:font-mono file:text-[11px] file:uppercase file:tracking-wider hover:file:border-cmba-red/60"
            />
            {fileName ? (
              <p className="text-[11px] text-cmba-grey-mid mt-1">{fileName}</p>
            ) : (
              <p className="text-[11px] text-cmba-grey-mid mt-1">No file chosen yet.</p>
            )}
            <p className="text-[11px] text-cmba-grey-mid mt-1">You can fix your file and choose it again as many times as you need. Nothing is saved until you approve it.</p>
          </div>
          <div>
            <label htmlFor="import-kind" className={labelCls}>
              File type
            </label>
            <select id="import-kind" className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="auto">Auto detect</option>
              <option value="teams">Teams</option>
              <option value="venues">Venues</option>
              <option value="officials">Officials</option>
              <option value="games">Games</option>
            </select>
          </div>
          {seasons.length > 0 && (
            <div>
              <label htmlFor="import-season" className={labelCls}>
                Season (optional scope)
              </label>
              <select id="import-season" className={inputCls} value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
                <option value="">All seasons</option>
                {seasons.map((se) => (
                  <option key={se.id} value={se.id}>
                    {se.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {(kind === "games" || kind === "auto") && (
            <div>
              <label htmlFor="import-publish" className={labelCls}>
                Games: save as
              </label>
              <select id="import-publish" className={inputCls} value={publishMode} onChange={(e) => setPublishMode(e.target.value as "draft" | "published")}>
                <option value="draft">Draft (not shown publicly)</option>
                <option value="published">Publish when approved</option>
              </select>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ActionButton
            variant="primary"
            onClick={validate}
            busy={busy}
            busyLabel="Checking"
            disabledReason={!csv ? "Choose a .csv file first." : null}
          >
            <Upload size={14} /> Validate file
          </ActionButton>
        </div>
        {msg && (
          <div className="mt-3">
            <Callout tone={msg.tone === "error" ? "error" : "info"} title={msg.tone === "error" ? "That did not work" : "Done"}>
              {msg.text}
            </Callout>
          </div>
        )}
      </Panel>

      {/* Step 3: preview */}
      {preview && s && (
        <Panel title={`3. Review the preview (${preview.kind})`} description="Nothing has been saved yet. Check what the system read, then import.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat label="Ready" value={s.ready} cls="text-status-ok" />
            <Stat label="Warnings" value={s.warnings} cls="text-status-warn" />
            <Stat label="Errors" value={s.errors} cls="text-status-danger" />
            <Stat label="Conflicts" value={preview.conflicts.length} cls="text-status-warn" />
          </div>

          {readings.length > 0 && (
            <Block title="What the system read (check these before importing)" icon={<CheckCircle2 size={14} className="text-status-ok" />}>
              {readings.slice(0, 200).map((r) => (
                <li key={`n-${r.row}`} className="text-xs text-cmba-grey-light">
                  Row {r.row}. {r.normalized?.date ?? "no date"} at {r.normalized?.timeDisplay ?? "no time"}
                </li>
              ))}
              {readings.length > 200 && <li className="text-xs text-cmba-grey-mid">Showing the first 200 of {readings.length} rows.</li>}
            </Block>
          )}

          {errorRows.length > 0 && (
            <Block title="Errors (these rows will not import)" icon={<XCircle size={14} className="text-status-danger" />}>
              {errorRows.map((r) =>
                r.issues
                  .filter((i) => i.severity === "error")
                  .map((i, j) => (
                    <li key={`${r.row}-${j}`} className="text-xs text-cmba-grey-light">
                      Row {r.row}. {i.message}
                      {i.value ? ` Value: ${i.value}` : ""}
                    </li>
                  )),
              )}
            </Block>
          )}
          {warnRows.length > 0 && (
            <Block title="Warnings (these rows will import if you continue)" icon={<AlertTriangle size={14} className="text-status-warn" />}>
              {warnRows.map((r) =>
                r.issues
                  .filter((i) => i.severity === "warning")
                  .map((i, j) => (
                    <li key={`${r.row}-${j}`} className="text-xs text-cmba-grey-light">
                      Row {r.row}. {i.message}
                      {i.value ? ` Value: ${i.value}` : ""}
                    </li>
                  )),
              )}
            </Block>
          )}
          {preview.conflicts.length > 0 && (
            <Block title="Conflicts" icon={<AlertTriangle size={14} className="text-status-warn" />}>
              {preview.conflicts.map((c, j) => (
                <li key={j} className="text-xs text-cmba-grey-light">
                  {c.kind.replaceAll("_", " ").toLowerCase()}. Shared {c.sharedKey} overlapping at{" "}
                  {new Date(c.window.start).toLocaleString("en-CA", { timeZone: "America/Edmonton", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.
                </li>
              ))}
            </Block>
          )}

          {preview.needsAck && (
            <label className="flex items-start gap-2 mt-4 text-xs text-cmba-grey-light cursor-pointer">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-4 w-4 accent-cmba-red" />
              <span>I have reviewed the warnings and conflicts and want to continue. Errors can never be bypassed.</span>
            </label>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ActionButton variant="primary" onClick={commit} busy={busy} busyLabel="Importing" disabledReason={importBlockedBecause}>
              <CheckCircle2 size={14} /> Import now
            </ActionButton>
            <ActionButton variant="quiet" onClick={startOver}>
              <RotateCcw size={12} /> Start over
            </ActionButton>
          </div>
        </Panel>
      )}

      {/* After import */}
      {result && (
        <Panel>
          <Callout tone="success" title="Imported">
            {Object.entries(result.counts)
              .map(([k, v]) => `${v} ${k}`)
              .join(", ") || "Done"}
            . You can undo this import for the next hour.
          </Callout>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton variant="danger" onClick={undo} busy={busy} busyLabel="Undoing">
              <Undo2 size={12} /> Undo this import
            </ActionButton>
            <ActionButton variant="quiet" onClick={startOver}>
              <RotateCcw size={12} /> Import another file
            </ActionButton>
          </div>
        </Panel>
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
      <summary className="flex items-center gap-2 font-display font-bold text-xs text-white uppercase tracking-wide cursor-pointer">
        {icon} {title}
      </summary>
      <ul className="mt-2 space-y-1 pl-1 max-h-64 overflow-y-auto">{children}</ul>
    </details>
  );
}
