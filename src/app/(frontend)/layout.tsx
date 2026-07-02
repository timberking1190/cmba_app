import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileNav } from "@/components/MobileNav";
import { FluidBackground } from "@/components/FluidBackground";
import { GlobalFX } from "@/components/GlobalFX";
import { FloatingNav } from "@/components/FloatingNav";
import { Observability } from "@/components/Observability";
import { JsonLd } from "@/components/JsonLd";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { siteUrl, SITE_DESCRIPTION } from "@/lib/siteUrl";

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

// Deploys: this repo (cmba_app) auto-deploys to the cmba_platform Vercel project
// at cmbaplatform.vercel.app on every push to main.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "CMBA+ | Calgary Minor Basketball Association",
  description: SITE_DESCRIPTION,
  keywords: ["CMBA", "Calgary", "basketball", "minor basketball", "coaches", "referees"],
  applicationName: "CMBA Connect",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    siteName: "CMBA Connect",
    title: "CMBA Connect | Calgary Minor Basketball Association",
    description: SITE_DESCRIPTION,
    url: siteUrl(),
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: "CMBA Connect | Calgary Minor Basketball Association",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#08080A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading the per-request nonce opts the public site into dynamic rendering so
  // Next applies the strict CSP nonce (set in middleware) to every script it
  // emits. Without this, statically rendered pages would ship un-nonced scripts
  // that a nonce + strict-dynamic policy would block. (Stage C / S0->S1.)
  await headers();
  const base = siteUrl();
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: "Calgary Minor Basketball Association",
    alternateName: "CMBA",
    url: base,
    logo: `${base}/cmba-logo.png`,
    sport: "Basketball",
    areaServed: "Calgary, Alberta, Canada",
  };
  return (
    <html lang="en" className="dark">
      <body
        className={`${archivo.variable} ${inter.variable} ${jetbrains.variable} font-body antialiased text-cmba-grey-light`}
      >
        {/* Editorial chrome */}
        <FluidBackground />
        <GlobalFX />

        <Header />
        {/* overflow-x-clip on mobile guards against any stray horizontal scroll;
            visible on lg so desktop sticky sidebars are unaffected. */}
        <main className="relative z-10 min-h-screen pb-16 lg:pb-0 overflow-x-clip lg:overflow-x-visible">{children}</main>
        <Footer />
        <MobileNav />
        <FloatingNav />
        <Observability />
        <ServiceWorkerRegister />
        <JsonLd data={orgLd} />
      </body>
    </html>
  );
}
