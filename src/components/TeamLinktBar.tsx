import { CalendarDays, ClipboardList, ExternalLink, Trophy } from "lucide-react";

import { TEAMLINKT } from "@/lib/cmbaLinks";

/*
 * Persistent league bar. Sits directly under the site header on every frontend
 * route and is the reliable route to a game time, a league table, and score
 * reporting.
 *
 * TeamLinkt is the system of record for league play, so this stays useful
 * permanently. It is navigation, not a notice: not dismissible, no apology, no
 * "temporarily unavailable" framing.
 *
 * DELIBERATELY A SERVER COMPONENT WITH NO STATE AND NO EFFECTS. It renders as
 * plain HTML in the first byte of the document, so it is visible before any
 * script parses, and it stays visible if script never runs at all.
 *
 * DO NOT ADD `.reveal` HERE. That class starts an element at opacity 0 and waits
 * for an IntersectionObserver to add `.in`. This bar is at the very top of every
 * page, which is precisely where that pattern did the most damage: it is what
 * made /login render as an apparently empty page until the user scrolled. The
 * only motion here is `transition-colors` on hover, which the global
 * prefers-reduced-motion rule already reduces to 0.01ms without hiding anything.
 *
 * Layout decisions worth knowing, all driven by measurement rather than taste:
 *
 *  - STICKY ON DESKTOP ONLY. The header pins with its bottom edge at 65px on
 *    desktop, so the bar pins directly beneath it at that offset, one layer below
 *    the header's z-50. On a phone it scrolls away instead. Vertical space is the
 *    scarcest resource on this site: a 390x664 viewport already has a fixed
 *    MobileNav eating the bottom 65px, and pinning a second bar to the top would
 *    permanently spend another 44px of the roughly 500px a parent actually has.
 *
 *  - NO BORDER ON TOP. The header already ends in `border-b border-cmba-red/60`.
 *    A border-top here would stack against it into a 2px composite red line. The
 *    bottom border is white/10 rather than red so the chrome does not read as
 *    three red hairlines within 82px once the announcements strip is below it.
 *
 *  - THREE BANDS, NOT TWO. Under 640px the labels shorten and the topic icons go,
 *    because three 44px targets with 8px gaps leave about 106px each and the full
 *    labels do not fit. From 640px the full labels and icons return, but the row
 *    still fills the width and keeps 44px targets, because a tablet is a touch
 *    device and 40px targets on it would be a mistake. Only from 1024px, where the
 *    pointer is a mouse, does the bar go slim and right align with the framing
 *    line beside it. Measured: showing the framing line at 640px would overflow a
 *    640px viewport by roughly 150px.
 *
 *  - TOUCH TARGETS ARE 44px UP TO 1024px, then 40. WCAG 2.5.8 asks for 24, so 40
 *    is comfortable for a mouse while keeping the desktop bar close to the height
 *    of the utility bar above it.
 */

const ITEMS = [
  {
    key: "schedule",
    href: TEAMLINKT.schedule,
    icon: CalendarDays,
    /* Short label for phones, full label from the sm breakpoint up. */
    short: "Schedule",
    full: "Schedule",
    /*
     * The accessible name. It starts with the visible label so it satisfies
     * WCAG 2.5.3 Label in Name, then adds where the link goes and the fact that
     * it leaves the site, which a visual user gets from the arrow icon.
     */
    label: "Schedule on TeamLinkt, opens in a new tab",
  },
  {
    key: "standings",
    href: TEAMLINKT.standings,
    icon: Trophy,
    short: "Standings",
    full: "Standings",
    label: "Standings on TeamLinkt, opens in a new tab",
  },
  {
    key: "report-a-score",
    href: TEAMLINKT.reportScore,
    icon: ClipboardList,
    short: "Score",
    full: "Report a Score",
    label: "Report a Score on TeamLinkt, opens in a new tab",
  },
] as const;

export function TeamLinktBar() {
  return (
    <nav
      aria-label="League information on TeamLinkt"
      /*
       * safe-x keeps the row clear of the notch when a phone is held sideways.
       * The sticky offset matches the header's pinned bottom edge exactly, so the
       * bar tucks under it with no gap and no overlap and no scroll jump.
       */
      className="tl-bar safe-x relative z-40 border-b border-white/10 bg-cmba-black-light lg:sticky lg:top-[65px]"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 sm:px-4 lg:px-6">
        <p className="hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.18em] text-cmba-grey lg:block">
          Live league info in <span className="text-cmba-grey-light">TeamLinkt</span>
        </p>

        {/*
          * Items size to their own label rather than sharing the width equally.
          * Equal thirds looked tidy but forced the longest label to truncate:
          * "STANDINGS" rendered as "STANDIN..." on a 390px phone while "SCORE" sat
          * in a box half of which was empty. Natural widths spread with
          * justify-between give every label the room it needs, put the outermost
          * targets under the thumbs, and still leave gaps well above the 8px
          * minimum.
          */}
        {/*
          * role="list" is not redundant here. Tailwind preflight sets list-style:none,
          * and Safari with VoiceOver then drops list semantics entirely, so without it
          * a screen reader user loses the "3 items" count.
          *
          * overflow-x-auto is an escape valve, not the layout. The row fits at every
          * real width, but at 150 percent browser zoom on a 320px phone the labels'
          * min-content exceeds the viewport, and without this the whole DOCUMENT
          * scrolled sideways, which is a WCAG 1.4.10 Reflow failure. Scrolling inside
          * the row instead keeps the page itself locked. It is safe to combine with
          * the focus ring because that ring is inset (see .tl-bar in globals.css);
          * an outward ring would have been clipped by this overflow context.
          */}
        <ul
          role="list"
          className="hide-scrollbar flex min-w-0 flex-1 items-stretch justify-between gap-2 overflow-x-auto lg:ml-auto lg:flex-none lg:gap-1 lg:overflow-x-visible"
        >
          {ITEMS.map((item) => (
            <li key={item.key} className="min-w-0">
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.label}
                className="group flex h-11 w-full min-w-[44px] items-center justify-center gap-1.5 px-2 text-cmba-grey-light transition-colors hover:bg-white/[0.08] sm:gap-2 sm:px-3 lg:h-10"
              >
                <item.icon
                  size={15}
                  aria-hidden="true"
                  className="hidden shrink-0 text-cmba-red sm:block"
                />
                {/*
                  * No `truncate`. Clipping the label to an ellipsis at 320px is loss of
                  * information under WCAG 1.4.10, and the label is the only thing on
                  * this row a parent can read at arm's length. The type steps down one
                  * notch below 360px instead, which keeps every word whole.
                  */}
                <span className="whitespace-nowrap font-display text-[13px] font-bold uppercase tracking-[0.04em] min-[360px]:text-[15px] sm:text-sm">
                  <span className="sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">{item.full}</span>
                </span>
                {/*
                  * Red below sm, grey from sm. Two jobs: it is the only Calgary red
                  * on the bar once the topic icons drop off on a phone, and it is
                  * what distinguishes these rows from the bottom MobileNav, which
                  * carries its own SCHEDULE and STANDINGS pointing at our pages
                  * rather than TeamLinkt's. Decorative and aria-hidden, so the new
                  * tab is announced through each link's accessible name instead.
                  */}
                <ExternalLink
                  size={11}
                  aria-hidden="true"
                  className="shrink-0 text-cmba-red transition-colors group-hover:text-cmba-red sm:text-cmba-grey-mid"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
