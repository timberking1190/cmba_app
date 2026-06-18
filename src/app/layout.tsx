import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileNav } from "@/components/MobileNav";
import { FluidBackground } from "@/components/FluidBackground";
import { GlobalFX } from "@/components/GlobalFX";

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
  title: "CMBA+ | Calgary Minor Basketball Association",
  description:
    "The official platform for Calgary Minor Basketball Association: rules, education, certification tracking, and game reports for coaches, referees, parents, and admins.",
  keywords: ["CMBA", "Calgary", "basketball", "minor basketball", "coaches", "referees"],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      </body>
    </html>
  );
}
