/*
 * Stylised Calgary skyline silhouette (Calgary Tower with its observation pod +
 * needle, the curved Bow tower, Telus Sky and downtown towers). Inherits
 * currentColor — set colour/opacity via className, e.g.
 * <CalgarySkyline className="text-white/5" />. Decorative (aria-hidden).
 */
export function CalgarySkyline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 240"
      preserveAspectRatio="xMidYMax meet"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* low foreground blocks */}
      <rect x="0" y="186" width="70" height="54" />
      <rect x="74" y="160" width="48" height="80" />
      <rect x="126" y="200" width="40" height="40" />
      {/* curved "Bow" tower */}
      <path d="M176 240 V96 q34 -30 68 0 V240 Z" />
      <rect x="250" y="150" width="34" height="90" />
      <rect x="288" y="118" width="46" height="122" />
      <rect x="300" y="104" width="8" height="16" />
      {/* mid cluster */}
      <rect x="340" y="168" width="40" height="72" />
      <rect x="384" y="132" width="52" height="108" />
      <rect x="440" y="176" width="36" height="64" />
      <rect x="480" y="150" width="30" height="90" />
      {/* Calgary Tower */}
      <rect x="531" y="58" width="6" height="20" /> {/* needle */}
      <path d="M520 78 q14 -16 28 0 q4 8 -2 12 H522 q-6 -4 -2 -12 Z" /> {/* observation pod */}
      <rect x="528" y="90" width="12" height="150" /> {/* shaft */}
      <rect x="524" y="90" width="20" height="8" /> {/* deck lip */}
      {/* right cluster */}
      <rect x="560" y="142" width="42" height="98" />
      <rect x="606" y="110" width="40" height="130" />
      <rect x="624" y="96" width="6" height="14" />
      <rect x="650" y="160" width="34" height="80" />
      {/* Telus Sky-ish tapered tower */}
      <path d="M690 240 V120 q22 -10 44 0 V240 Z" />
      <rect x="740" y="150" width="40" height="90" />
      <rect x="784" y="124" width="50" height="116" />
      <rect x="838" y="172" width="38" height="68" />
      <rect x="880" y="140" width="44" height="100" />
      <rect x="898" y="126" width="8" height="14" />
      <rect x="928" y="178" width="34" height="62" />
      <rect x="966" y="150" width="46" height="90" />
      <rect x="1016" y="188" width="40" height="52" />
      <rect x="1060" y="164" width="50" height="76" />
      <rect x="1114" y="198" width="44" height="42" />
      <rect x="1162" y="176" width="38" height="64" />
    </svg>
  );
}
