"use client";

import Link from "next/link";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";

/*
 * The screen someone sees when a page failed.
 *
 * Design rules this follows, and why each one is here rather than a nicer looking
 * alternative:
 *
 *  - No `.reveal`. That class starts at opacity 0 and waits for an
 *    IntersectionObserver in GlobalFX to add `.in`. If the page is already broken
 *    enough to hit an error boundary, betting the error message on more
 *    JavaScript succeeding is how you get a blank screen instead of an apology.
 *  - Body copy at 16px, not the site's usual text-sm. This is read by someone who
 *    is already annoyed, often one handed, often outdoors.
 *  - Actions are stacked and full width below sm, so the primary action sits in
 *    the thumb arc rather than in a corner. They carry min-h-[48px], which is the
 *    Android target size, not just the 44px iOS one.
 *  - Plain language. "Try again" not "Retry operation". No stack traces, no
 *    "unexpected error occurred", no error codes as the headline.
 *  - The digest is shown small and last. It is the only thing that helps a support
 *    conversation, and it is safe to show: Next.js replaces the real message with
 *    an opaque hash in production precisely so internals do not leak.
 */

export type ErrorStateProps = {
  /** Short, human. "This page did not load." Not "Error 500". */
  title?: string;
  /** One or two sentences saying what happened and what it means for them. */
  body?: string;
  /** Wired to the boundary's reset(). Omitted on 404, where retrying is pointless. */
  onRetry?: () => void;
  /** Where "home" goes. A role area can send someone back to its own hub instead. */
  homeHref?: string;
  homeLabel?: string;
  /** Next.js error digest, for support. Never the raw message. */
  digest?: string;
};

export function ErrorState({
  title = "This page did not load",
  body = "Something on our end went wrong. It is usually temporary, so trying again often works.",
  onRetry,
  homeHref = "/",
  homeLabel = "Go to the home page",
  digest,
}: ErrorStateProps) {
  return (
    <section
      className="px-4 md:px-10 lg:px-14 pt-16 lg:pt-24 pb-20"
      // Announced to a screen reader as soon as it replaces the page content.
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-2xl mx-auto">
        <div className="label-xs text-cmba-red mb-4 flex items-center gap-2">
          <AlertTriangle size={14} aria-hidden="true" />
          Something went wrong
        </div>

        <h1 className="font-display font-black uppercase leading-[0.9] tracking-tighter2 text-[clamp(32px,9vw,72px)] text-cmba-grey-light">
          {title}
        </h1>

        <p className="mt-5 text-base leading-relaxed text-cmba-grey max-w-prose">{body}</p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 bg-cmba-red text-white font-display font-bold uppercase tracking-wide text-sm transition-colors hover:bg-cmba-hot focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <RefreshCw size={18} aria-hidden="true" />
              Try again
            </button>
          ) : null}

          <Link
            href={homeHref}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 border border-cmba-grey-dark text-cmba-grey-light font-display font-bold uppercase tracking-wide text-sm transition-colors hover:border-cmba-red hover:text-cmba-red"
          >
            <Home size={18} aria-hidden="true" />
            {homeLabel}
          </Link>
        </div>

        {digest ? (
          <p className="mt-10 font-mono text-[11px] text-cmba-grey-mid">
            If you report this, quote reference {digest}
          </p>
        ) : null}
      </div>
    </section>
  );
}
