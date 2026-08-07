/*
 * Loading skeletons for the App Router `loading.tsx` boundaries.
 *
 * The point of these is NOT decoration. It is that a slow route on gym wifi shows
 * something with the same shape as the real page, so when the content arrives it
 * lands in the space the skeleton was already holding and nothing jumps. A
 * skeleton whose dimensions do not match the final layout ADDS layout shift
 * rather than removing it, which is worse than no skeleton at all.
 *
 * So the header block below is sized off the real editorial header used across
 * the site: `text-[clamp(40px,12vw,120px)]` at `leading-[0.85]`, an eyebrow above
 * it, and a paragraph under it. The variants then match the body of each page
 * type.
 *
 * Everything here is a server component with no animation dependency beyond a CSS
 * pulse, which `prefers-reduced-motion` in globals.css already neutralises.
 */

type Variant =
  | "default" // editorial header plus prose
  | "table" // standings, officials, anything row based
  | "cards" // hub pages: a grid of link cards
  | "form" // login, score reporting, game report
  | "card"; // the member card page, one large object

/*
 * Deliberately NOT animated.
 *
 * The first version of this used Tailwind's `animate-pulse` on every bar. Measured
 * against the Phase 0 baseline that cost LCP 731ms on /schedule and 567ms on
 * /standings: roughly a dozen elements each running a continuous opacity keyframe,
 * on a main thread that is already the bottleneck, during the exact window the
 * real content is trying to render. The skeleton was competing with the content it
 * was standing in for.
 *
 * A static tint communicates "this is a placeholder" just as clearly, costs
 * nothing, and has the side benefit of being correct for prefers-reduced-motion
 * without needing an override.
 */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`bg-white/[0.07] rounded-sm ${className}`} />;
}

/** The header every page on this site opens with. Sized to the real thing. */
function HeaderSkeleton() {
  return (
    <section className="px-4 md:px-10 lg:px-14 pt-12 lg:pt-20 pb-8">
      <div className="max-w-7xl mx-auto">
        <Bar className="h-3 w-32 mb-5" />
        {/* Matches h1 clamp(40px,12vw,120px) at leading-[0.85]: roughly 0.85em per line. */}
        <Bar className="h-[clamp(34px,10vw,102px)] w-[85%] max-w-3xl" />
        <Bar className="mt-4 h-4 w-full max-w-xl" />
        <Bar className="mt-2 h-4 w-3/4 max-w-lg" />
      </div>
    </section>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <Bar className="h-9 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Bar key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Bar key={i} className="h-40 w-full" />
      ))}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="max-w-md space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bar className="h-3 w-24" />
          {/* 48px matches the real control height Phase 2 enforces. */}
          <Bar className="h-12 w-full" />
        </div>
      ))}
      <Bar className="h-12 w-40" />
    </div>
  );
}

function CardObjectSkeleton() {
  return (
    <div className="max-w-sm">
      {/* Roughly a credit card aspect, which is what the member card renders at. */}
      <Bar className="w-full aspect-[1.586/1]" />
      <Bar className="mt-4 h-4 w-2/3" />
      <Bar className="mt-2 h-4 w-1/2" />
    </div>
  );
}

const BODIES: Record<Variant, () => React.ReactElement> = {
  default: () => (
    <div className="space-y-3 max-w-3xl">
      {Array.from({ length: 6 }).map((_, i) => (
        <Bar key={i} className="h-4 w-full" />
      ))}
    </div>
  ),
  table: TableSkeleton,
  cards: CardsSkeleton,
  form: FormSkeleton,
  card: CardObjectSkeleton,
};

export function PageSkeleton({
  variant = "default",
  label = "Loading",
}: {
  variant?: Variant;
  /** What a screen reader announces. Say what is loading: "Loading the schedule". */
  label?: string;
}) {
  const Body = BODIES[variant];
  return (
    <div aria-busy="true" aria-live="polite">
      {/*
       * Visually hidden but announced. Without this a screen reader user gets a
       * silent page of meaningless boxes and no idea anything is happening.
       */}
      <span className="sr-only">{label}</span>
      <HeaderSkeleton />
      <div className="max-w-7xl mx-auto px-4 md:px-10 lg:px-14 pb-20">
        <Body />
      </div>
    </div>
  );
}
