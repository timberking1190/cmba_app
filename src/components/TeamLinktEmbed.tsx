"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

/*
 * Graceful fallback: when our own data returns nothing, we embed TeamLinkt's
 * official page so users never see a blank screen.
 *
 * NOTE: this iframe is cross-origin TeamLinkt content and CANNOT be restyled to
 * match Off+Brand; we only frame it in our own card and header.
 *
 * The embed is not allowed to fail silently any more. It shipped pointing at a
 * league slug TeamLinkt no longer serves, which redirected to the apex host our
 * CSP does not allow in frame-src, and the result was a 720px empty slab with a
 * broken image icon on every visit to /standings. We cannot read a cross-origin
 * frame to check what it rendered, but we can tell whether it ever loaded at all:
 *
 *   - `load` fires  -> the embed is up, show it.
 *   - `load` never fires within LOAD_TIMEOUT_MS -> it was blocked (a CSP refusal
 *     never fires load), so swap in a plain explanation and a working link.
 *
 * The frame is deliberately NOT lazy. In the fallback path it is the main content
 * of the page, and a lazy frame that is never scrolled to would never fire load,
 * which the timeout would then misread as a failure.
 */

const LOAD_TIMEOUT_MS = 8000;

export function TeamLinktEmbed({
  page,
  leagueUrl,
}: {
  page: "Schedule" | "Standings" | "Scores";
  leagueUrl: string;
}) {
  const src = `${leagueUrl}/${page}?iframe`;
  const openUrl = `${leagueUrl}/${page}`;
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // A frame that is already complete before hydration will not fire load again.
    if (frame.current?.contentWindow) {
      try {
        if (frame.current.contentDocument?.readyState === "complete") {
          setState("ok");
          return;
        }
      } catch {
        // Cross-origin read threw, which means a real document is there.
        setState("ok");
        return;
      }
    }
    const t = setTimeout(() => setState((s) => (s === "loading" ? "failed" : s)), LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

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

      {state === "failed" ? (
        <div className="px-5 py-10 text-center">
          <h3 className="font-display font-black text-lg text-white uppercase tracking-tight mb-2">
            The TeamLinkt view will not load here
          </h3>
          <p className="text-sm text-cmba-grey leading-relaxed max-w-md mx-auto mb-6">
            TeamLinkt is not letting us show this page inside CMBA Connect right now. The information is
            still there, so open it directly and it will work.
          </p>
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 min-h-[44px] px-5 py-3 bg-cmba-red text-white font-display font-bold text-sm uppercase tracking-wider hover:bg-white hover:text-cmba-black transition-colors"
          >
            View {page.toLowerCase()} on TeamLinkt <ExternalLink size={14} />
          </a>
        </div>
      ) : (
        <div className="relative">
          {state === "loading" && (
            <p
              role="status"
              className="absolute inset-x-0 top-0 px-5 py-3 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider"
            >
              Loading the TeamLinkt view
            </p>
          )}
          {/*
            * The backdrop is a literal white, not the `bg-white` utility. That
            * utility resolves to rgb(var(--c-white)), and the light theme remaps
            * that token to near-black so text-white reads correctly on flipped
            * cards. Behind this frame the flip is exactly backwards: TeamLinkt's
            * page is light in both themes, so the utility would paint a dark slab
            * under it in light mode and a white one in dark mode, which is the
            * blank-slab look this component exists to avoid. Applied only once the
            * frame has loaded, so nothing flashes while it is still empty.
            */}
          <iframe
            ref={frame}
            src={src}
            title={`CMBA ${page} on TeamLinkt`}
            onLoad={() => setState("ok")}
            className="w-full block"
            style={{ minHeight: 720, border: 0, backgroundColor: state === "ok" ? "#ffffff" : "transparent" }}
          />
        </div>
      )}

      <p className="px-5 py-2 border-t border-white/10 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">
        Displayed from TeamLinkt
      </p>
    </div>
  );
}
