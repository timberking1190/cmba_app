"use client";

import { useMemo, useState } from "react";
import { divisionsFrom, sortStandings, type StandingRow } from "@/lib/scheduleUtils";

const COLS: { key: keyof StandingRow; label: string; wide?: boolean }[] = [
  { key: "team", label: "Team", wide: true },
  { key: "gp", label: "GP" },
  { key: "w", label: "W" },
  { key: "l", label: "L" },
  { key: "t", label: "T" },
  { key: "pts", label: "PTS" },
  { key: "pf", label: "PF" },
  { key: "pa", label: "PA" },
  { key: "diff", label: "DIFF" },
];

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  const divs = useMemo(() => divisionsFrom(rows), [rows]);
  const [division, setDivision] = useState("all");

  const sorted = useMemo(
    () => sortStandings(division === "all" ? rows : rows.filter((r) => r.division === division)),
    [rows, division]
  );

  return (
    <div>
      {divs.length > 0 && (
        <div className="mb-6">
          <label className="inline-flex items-center gap-2">
            <span className="sr-only">Filter by division</span>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="bg-cmba-black-card border border-white/12 px-3 py-2 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none"
            >
              <option value="all">All divisions</option>
              {divs.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="overflow-x-auto bg-cmba-black-card/80 backdrop-blur-sm border border-white/12">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-white/12">
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={`font-display font-bold text-[11px] text-cmba-grey-mid uppercase tracking-widest py-3 px-4 ${c.wide ? "text-left" : "text-center"}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={`${r.team}-${i}`} className={`border-b border-white/10 ${i % 2 ? "bg-white/[0.02]" : ""}`}>
                <td className="py-3 px-4">
                  <span className="font-mono text-[11px] text-cmba-grey-mid mr-2">{i + 1}</span>
                  <span className="font-display font-bold text-sm text-white uppercase tracking-wide">{r.team}</span>
                </td>
                <td className="py-3 px-4 text-center text-sm text-cmba-grey-light tabular-nums">{r.gp}</td>
                <td className="py-3 px-4 text-center text-sm text-cmba-grey-light tabular-nums">{r.w}</td>
                <td className="py-3 px-4 text-center text-sm text-cmba-grey-light tabular-nums">{r.l}</td>
                <td className="py-3 px-4 text-center text-sm text-cmba-grey-light tabular-nums">{r.t}</td>
                <td className="py-3 px-4 text-center font-display font-black text-cmba-red tabular-nums">{r.pts}</td>
                <td className="py-3 px-4 text-center text-sm text-cmba-grey tabular-nums">{r.pf}</td>
                <td className="py-3 px-4 text-center text-sm text-cmba-grey tabular-nums">{r.pa}</td>
                <td className={`py-3 px-4 text-center text-sm tabular-nums ${r.diff > 0 ? "text-green-400" : r.diff < 0 ? "text-red-400" : "text-cmba-grey"}`}>
                  {r.diff > 0 ? `+${r.diff}` : r.diff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
