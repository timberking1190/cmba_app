/*
 * Basketball half-court line motif (key, free-throw circle, three-point arc,
 * hoop). Stroke inherits currentColor — set colour/opacity via className, e.g.
 * <CourtLines className="text-cmba-red/10" />. Decorative (aria-hidden); great as
 * a faint section background accent.
 */
export function CourtLines({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 360"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      {/* baseline */}
      <line x1="40" y1="338" x2="360" y2="338" />
      {/* backboard + hoop */}
      <line x1="176" y1="330" x2="224" y2="330" />
      <circle cx="200" cy="322" r="9" />
      {/* the key / paint */}
      <rect x="150" y="188" width="100" height="150" />
      {/* free-throw circle */}
      <circle cx="200" cy="188" r="52" />
      {/* restricted-area arc */}
      <path d="M178 338 a22 22 0 0 1 44 0" />
      {/* three-point arc */}
      <path d="M64 338 V300 a136 136 0 0 1 272 0 V338" />
    </svg>
  );
}
