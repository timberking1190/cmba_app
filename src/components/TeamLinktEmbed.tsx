"use client";

import { ExternalLink } from "lucide-react";

/*
 * Graceful fallback: when our native JSON parse returns nothing (endpoint changed
 * or empty), we embed TeamLinkt's official page so users never see a blank screen.
 * NOTE: this iframe is cross-origin TeamLinkt content and CANNOT be restyled to
 * match Off+Brand; we only frame it in our own card/header.
 */
export function TeamLinktEmbed({
  page,
  leagueUrl,
}: {
  page: "Schedule" | "Standings" | "Scores";
  leagueUrl: string;
}) {
  const src = `${leagueUrl}/${page}?iframe`;
  const openUrl = `${leagueUrl}/${page}`;
  return (
    <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10">
        <h2 className="font-display font-bold text-sm text-white uppercase tracking-wider">
          {page} <span className="text-cmba-grey-mid font-normal normal-case">· live from TeamLinkt</span>
        </h2>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 min-h-[44px] font-mono text-[11px] text-cmba-red hover:text-white uppercase tracking-wider transition-colors shrink-0"
        >
          Open <ExternalLink size={11} />
        </a>
      </div>
      <iframe
        src={src}
        title={`CMBA ${page} on TeamLinkt`}
        loading="lazy"
        className="w-full block bg-white"
        style={{ minHeight: 720, border: 0 }}
      />
      <p className="px-5 py-2 border-t border-white/10 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">
        Displayed from TeamLinkt
      </p>
    </div>
  );
}
