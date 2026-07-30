"use client";

/*
 * Shared building blocks for the scheduling console. These exist so every manage
 * screen says the same thing the same way, and so three rules from the overhaul
 * brief are enforced by the component rather than by everyone remembering them:
 *
 *  1. A disabled control ALWAYS says why it is disabled and what unlocks it.
 *     ActionButton will not render a silently dead control: pass `disabledReason`
 *     and the reason is shown and announced, or do not disable the button.
 *  2. Status is one vocabulary everywhere. StatusChip is exhaustive over the game
 *     status union, so adding a status without a chip is a compile error.
 *  3. Colour comes from the theme tokens, so the console is readable in both the
 *     light and the dark theme. Fixed palette colours are avoided on text.
 *
 * Times shown to people are 12 hour with am or pm. Only machine formats and the
 * CSV templates use 24 hour.
 */

import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useId, type ReactNode } from "react";

import type { GameStatus } from "@/lib/scheduleUtils";

/* ------------------------------------------------------------------ status */

const chipBase =
  "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 whitespace-nowrap";

// Deliberately readable on both themes: a tinted background plus a text colour
// that is a theme token or a shade that clears AA on either surface.
const STATUS_CHIP: Record<GameStatus, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-cmba-red/15 text-cmba-red" },
  reported: { label: "Reported", cls: "bg-status-warn/15 text-status-warn" },
  contested: { label: "Contested", cls: "bg-status-warn/20 text-status-warn font-bold" },
  final: { label: "Final", cls: "bg-status-ok/15 text-status-ok" },
  forfeit: { label: "Forfeit", cls: "bg-status-danger/20 text-status-danger font-bold" },
  postponed: { label: "Postponed", cls: "bg-cmba-grey/25 text-cmba-grey-light" },
  cancelled: { label: "Cancelled", cls: "bg-status-danger/15 text-status-danger line-through" },
};

/** One status vocabulary for every screen. Exhaustive over GameStatus. */
export function StatusChip({ status }: { status: GameStatus }) {
  const chip = STATUS_CHIP[status];
  if (!chip) return <span className={`${chipBase} bg-cmba-grey/20 text-cmba-grey-light`}>{String(status)}</span>;
  return <span className={`${chipBase} ${chip.cls}`}>{chip.label}</span>;
}

/** Draft versus published is a separate axis from the game status. */
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

/* ----------------------------------------------------------------- buttons */

type Variant = "primary" | "secondary" | "danger" | "quiet";

const VARIANT: Record<Variant, string> = {
  primary: "bg-cmba-red hover:bg-cmba-hot text-white border border-cmba-red",
  secondary: "bg-cmba-black-surface hover:bg-cmba-black-card text-cmba-grey-light border border-white/25 hover:border-cmba-red/60",
  // Irreversible actions look different from everything else on purpose.
  danger: "bg-transparent hover:bg-status-danger/15 text-status-danger border border-status-danger/60 hover:border-status-danger",
  quiet: "bg-transparent hover:bg-white/5 text-cmba-grey hover:text-cmba-grey-light border border-transparent",
};

export type ActionButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  /*
   * The reason the control cannot be used right now, in words a volunteer
   * understands, naming what unlocks it. Supplying this is what disables the
   * button: there is no bare `disabled` prop, so a dead control cannot ship.
   */
  disabledReason?: string | null;
  busy?: boolean;
  busyLabel?: string;
  type?: "button" | "submit";
  className?: string;
  title?: string;
};

/**
 * A button that can never be silently dead. When `disabledReason` is set the
 * control is inert and the reason is rendered beside it and wired to the button
 * with aria-describedby. aria-disabled rather than the disabled attribute keeps
 * it focusable, so a screen reader user can reach it and hear why.
 */
export function ActionButton({
  children,
  onClick,
  variant = "secondary",
  disabledReason = null,
  busy = false,
  busyLabel,
  type = "button",
  className = "",
  title,
}: ActionButtonProps) {
  const reasonId = useId();
  const inert = Boolean(disabledReason) || busy;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type={type}
        title={title}
        aria-disabled={inert || undefined}
        aria-describedby={disabledReason ? reasonId : undefined}
        onClick={inert ? undefined : onClick}
        className={`inline-flex items-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider px-3 py-2 min-h-[44px] sm:min-h-0 sm:py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmba-red ${VARIANT[variant]} ${
          inert ? "opacity-45 cursor-not-allowed" : ""
        } ${className}`}
      >
        {busy && <Loader2 size={13} className="animate-spin motion-reduce:animate-none" aria-hidden />}
        {busy ? busyLabel ?? "Working" : children}
      </button>
      {disabledReason && (
        <span id={reasonId} className="text-[11px] text-cmba-grey-light max-w-xs">
          {disabledReason}
        </span>
      )}
    </span>
  );
}

/** A link that looks and behaves like a button. Uses next/link for client routing. */
export function LinkButton({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: Variant }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider px-3 py-2 min-h-[44px] sm:min-h-0 sm:py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmba-red ${VARIANT[variant]}`}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------- messages */

type Tone = "info" | "success" | "warning" | "error";

const TONE: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: "border-cmba-grey-dark/60 bg-cmba-black-surface text-cmba-grey-light", Icon: Info },
  success: { cls: "border-status-ok/50 bg-status-ok/10 text-status-ok", Icon: CheckCircle2 },
  warning: { cls: "border-status-warn/50 bg-status-warn/10 text-status-warn", Icon: AlertTriangle },
  error: { cls: "border-status-danger/60 bg-status-danger/10 text-status-danger", Icon: XCircle },
};

/**
 * Every message a console shows goes through here so it reads the same way:
 * what happened, and what to do next. `role="alert"` for errors so the change is
 * announced without the user hunting for it.
 */
export function Callout({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  const { cls, Icon } = TONE[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-2.5 border p-3 ${cls}`}>
      <Icon size={16} className="shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="font-display font-bold text-xs uppercase tracking-wide">{title}</p>
        {children && <div className="text-[12px] leading-relaxed mt-1">{children}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ layout */

export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-cmba-black-card border border-white/12 p-4 sm:p-5">
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            {title && <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm">{title}</h2>}
            {description && <p className="text-[12px] text-cmba-grey mt-1 max-w-2xl">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** What a first time scheduler sees before anything exists. Always offers a way in. */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-white/20 bg-cmba-black-surface/40 p-6 sm:p-8 text-center">
      {icon && <div className="flex justify-center text-cmba-red mb-3">{icon}</div>}
      <p className="font-display font-bold text-white uppercase tracking-wide text-sm">{title}</p>
      <div className="text-[12px] text-cmba-grey mt-2 max-w-md mx-auto leading-relaxed">{children}</div>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-xs text-cmba-grey-light">
      <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden /> {label}
    </p>
  );
}

/* ------------------------------------------------------------------ fields */

export const inputCls =
  "w-full bg-cmba-black-surface border border-white/20 px-3 py-2 text-sm text-cmba-grey-light placeholder:text-cmba-grey-mid focus:border-cmba-red focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cmba-red transition-colors";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">
        {label}
      </label>
      {children({ id, describedBy })}
      {hint && (
        <p id={hintId} className="text-[11px] text-cmba-grey-mid mt-1">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-[11px] text-status-danger mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
