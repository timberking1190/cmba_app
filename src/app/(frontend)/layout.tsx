import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Archivo, Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileNav } from "@/components/MobileNav";
import { FluidBackground } from "@/components/FluidBackground";
import { GlobalFX } from "@/components/GlobalFX";
import { AssistantWidget } from "@/components/AssistantWidget";
import { getCurrentUser } from "@/lib/auth";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Retro pixel font for the home-page arcade game (self-hosted by next/font, so it
// is served from our own origin and satisfies the strict CSP font-src 'self').
const pressStart = Press_Start_2P({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-arcade",
  display: "swap",
});

// Deploys: this repo (cmba_app) auto-deploys to the cmba_platform Vercel project
// at cmbaplatform.vercel.app on every push to main.
export const metadata: Metadata = {
  title: "CMBA+ | Calgary Minor Basketball Association",
  description:
    "The official platform for Calgary Minor Basketball Association: rules, education, certification tracking, and game reports for coaches, referees, parents, and admins.",
  keywords: ["CMBA", "Calgary", "basketball", "minor basketball", "coaches", "referees"],
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CMBA+" },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080A",
  width: "device-width",
  initialScale: 1,
  /*
   * maximumScale stays at 5 and userScalable is deliberately NOT set to false.
   * Blocking pinch zoom is a WCAG 1.4.4 failure, and it is the single most common
   * accessibility mistake in mobile web. Someone who needs to zoom in on a game
   * time must be able to. e2e/mobile.spec.ts asserts this and will fail the build
   * if anyone ever "fixes" the double tap zoom by disabling it.
   */
  maximumScale: 5,
  /*
   * Lets the page paint into the notch and home indicator areas instead of being
   * letterboxed by them. This is what makes env(safe-area-inset-*) return real
   * values; without it those insets are always 0 and every safe area rule in
   * globals.css is silently dead. The fixed bottom nav depends on it.
   */
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading the per-request nonce opts the public site into dynamic rendering so
  // Next applies the strict CSP nonce (set in src/proxy.ts) to every script it
  // emits. Without this, statically rendered pages would ship un-nonced scripts
  // that a nonce + strict-dynamic policy would block. (Stage C / S0->S1.)
  await headers();

  /*
   * Resolve the session HERE, on the server, and pass it down. The header used to
   * fetch /api/users/me from the browser while the page it sits above read the
   * session cookie on the server. When those two disagreed the header showed Sign
   * In to someone who was signed in, and every load flashed the signed out state
   * first. One source of truth removes both.
   */
  const sessionUser = await getCurrentUser();
  const headerUser = sessionUser
    ? {
        id: sessionUser.id,
        email: sessionUser.email,
        fullName: (sessionUser as { fullName?: string }).fullName,
        roles: (sessionUser.roles ?? []) as string[],
      }
    : null;

  return (
    <html lang="en" data-theme="dark">
      <body
        className={`${archivo.variable} ${inter.variable} ${jetbrains.variable} ${pressStart.variable} font-body antialiased text-cmba-grey-light`}
      >
        {/* Editorial chrome */}
        <FluidBackground />
        <GlobalFX />

        <Header user={headerUser} />
        {/* overflow-x-clip on mobile guards against any stray horizontal scroll;
            visible on lg so desktop sticky sidebars are unaffected. */}
        {/* pb-mobile-nav reserves the bottom nav's real height (4rem + its 1px
            border) plus the home indicator inset, instead of the flat pb-16 that
            left the last row of content 1px under the nav and more than that on a
            notched phone. See globals.css. */}
        <main className="relative z-10 min-h-screen pb-mobile-nav overflow-x-clip lg:overflow-x-visible">{children}</main>
        <Footer />
        <MobileNav />
        <AssistantWidget />
      </body>
    </html>
  );
}
