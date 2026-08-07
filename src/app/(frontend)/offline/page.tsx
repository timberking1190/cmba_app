import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline | CMBA+",
  robots: { index: false, follow: false },
};

/*
 * The page the service worker serves when a navigation fails with no network.
 *
 * It is deliberately plain about what is and is not available. This app caches
 * only static assets, never page content, because every page document carries the
 * signed in person's identity in the header and an unencrypted copy of that on a
 * shared family phone is not a trade worth making for an offline schedule. So
 * this page cannot show game times, and it says so rather than looking like a
 * loading state that will eventually resolve.
 */
export default function OfflinePage() {
  return (
    <section className="px-4 md:px-10 lg:px-14 pt-16 lg:pt-24 pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="label-xs text-cmba-red mb-4 flex items-center gap-2">
          <WifiOff size={14} aria-hidden="true" />
          No connection
        </div>

        <h1 className="font-display font-black uppercase leading-[0.9] tracking-tighter2 text-[clamp(32px,9vw,72px)] text-cmba-grey-light">
          You are offline
        </h1>

        <p className="mt-5 text-base leading-relaxed text-cmba-grey">
          CMBA+ needs a connection to show game times, standings and your member card, because
          those change through the day and we do not keep a copy of them on your phone.
        </p>

        <p className="mt-4 text-base leading-relaxed text-cmba-grey">
          Gym wifi is often the problem rather than your phone. Turning wifi off and using mobile
          data usually works.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/schedule"
            className="inline-flex items-center justify-center min-h-[48px] px-6 bg-cmba-red text-white font-display font-bold uppercase tracking-wide text-sm"
          >
            Try the schedule again
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[48px] px-6 border border-cmba-grey-dark text-cmba-grey-light font-display font-bold uppercase tracking-wide text-sm"
          >
            Go to the home page
          </Link>
        </div>

        <p className="mt-10 text-sm leading-relaxed text-cmba-grey-mid">
          If you have added your member card to Apple Wallet or Google Wallet, it works with no
          connection at all. Open it from your phone&apos;s wallet rather than from this site.
        </p>
      </div>
    </section>
  );
}
