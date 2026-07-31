"use client";

import type { GameStatus } from "@/lib/scheduleUtils";

/*
 * ONE status vocabulary for the whole product. The scheduling console, the public
 * schedule, the team pages, and the playoff bracket all render a game's status
 * through here, so a parent and an admin read the same word for the same thing.
 *
 * Colour comes from the theme tokens (--st-ok / --st-warn / --st-danger), not the
 * fixed Tailwind palette. The fixed palette does not follow the light and dark
 * themes, and shades like green-400 fail contrast on the light surfaces.
 *
 * The record is keyed by GameStatus, so adding a status without giving it a chip
 * is a compile error rather than something that silently renders as blank.
 */

const chipBase = "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 whitespace-nowrap";

const STATUS_CHIP: Record<GameStatus, { label: string; cls: string; title: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-cmba-red/15 text-cmba-red", title: "This game is still to be played." },
  reported: { label: "Reported", cls: "bg-status-warn/15 text-status-warn", title: "One team has sent in a score and the other has not confirmed it yet." },
  contested: { label: "Contested", cls: "bg-status-warn/20 text-status-warn font-bold", title: "The two teams disagree about the score. The league office is deciding it." },
  final: { label: "Final", cls: "bg-status-ok/15 text-status-ok", title: "The result is settled and counts in the standings." },
  forfeit: { label: "Forfeit", cls: "bg-status-danger/20 text-status-danger font-bold", title: "A team did not play. The result counts in the standings." },
  postponed: { label: "Postponed", cls: "bg-cmba-grey/25 text-cmba-grey-light", title: "This game is not being played at this time. A new time will be set." },
  cancelled: { label: "Cancelled", cls: "bg-status-danger/15 text-status-danger line-through", title: "This game is not being played and will not be rescheduled." },
};

export function StatusChip({ status }: { status: GameStatus }) {
  const chip = STATUS_CHIP[status];
  if (!chip) return <span className={`${chipBase} bg-cmba-grey/20 text-cmba-grey-light`}>{String(status)}</span>;
  return (
    <span className={`${chipBase} ${chip.cls}`} title={chip.title}>
      {chip.label}
    </span>
  );
}

/** Draft versus published. A separate axis from the game status. */
export function PublishChip({ state }: { state: string }) {
  const published = state === "published";
  return (
    <span
      className={`${chipBase} ${published ? "bg-cmba-red/10 text-cmba-red" : "bg-cmba-grey/20 text-cmba-grey-light"}`}
      title={published ? "Families can see this game." : "Not shown on the public site yet."}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}
