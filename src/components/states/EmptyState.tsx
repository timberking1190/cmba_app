import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

/*
 * "There is nothing here" as a deliberate state rather than an accident.
 *
 * An empty list and a failed fetch look identical to a user if neither says
 * anything. The difference matters: one means "no games this week", the other
 * means "we could not reach the schedule". Saying which one it is out loud is the
 * whole job of this component.
 *
 * No `.reveal` here either, for the same reason as ErrorState: an empty state
 * that animates in only after an observer fires is an empty state that sometimes
 * never appears.
 */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  actionHref,
  actionLabel,
}: {
  icon?: LucideIcon;
  /** What is empty, in the user's words. "No games scheduled". */
  title: string;
  /** Why it is empty and what they could do about it, if anything. */
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="border border-white/10 bg-cmba-black-card/60 backdrop-blur-sm px-6 py-12 text-center">
      <Icon size={28} className="mx-auto text-cmba-grey-mid" aria-hidden="true" />
      <h2 className="mt-4 font-display font-black uppercase tracking-tight text-lg text-cmba-grey-light">
        {title}
      </h2>
      <p className="mt-2 text-base leading-relaxed text-cmba-grey max-w-md mx-auto">{body}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex items-center justify-center min-h-[48px] px-6 border border-cmba-grey-dark text-cmba-grey-light font-display font-bold uppercase tracking-wide text-sm transition-colors hover:border-cmba-red hover:text-cmba-red"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
