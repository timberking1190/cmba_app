"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu, X, ChevronDown, Search, User, BookOpen, Flag,
  Calendar, HelpCircle, Phone, Shield, BarChart3, Trophy, Users, ClipboardList,
  LogOut, UserCircle, IdCard, ScanLine,
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";

type AuthUser = { id: number | string; email: string; fullName?: string; roles?: string[] } | null;

// All officials scan: game officials (official) + league officials + staff admins.
// Keep in sync with access/index.ts canScan.
const SCAN_ROLES = ["official", "league_official", "club_admin", "super_admin"];

const navLinks = [
  { label: "RULES", href: "/rules", icon: BookOpen },
  {
    label: "ATHLETES", href: "/athlete", icon: Trophy,
    children: [
      { label: "Athlete Hub", href: "/athlete" },
      { label: "Skill Challenges", href: "/athlete/challenges" },
      { label: "Basketball IQ", href: "/athlete/quiz" },
    ],
  },
  {
    label: "COACHES", href: "/coach", icon: Shield,
    children: [
      { label: "Dashboard", href: "/coach" },
      { label: "Verify Challenges", href: "/coach/challenges" },
      { label: "Certification Pathway", href: "/coach/pathway" },
      { label: "Courses", href: "/coach/courses" },
      { label: "Training & Clinics", href: "/coach/clinics" },
    ],
  },
  {
    label: "REFEREES", href: "/ref", icon: Flag,
    children: [
      { label: "Dashboard", href: "/ref" },
      { label: "Quick Reference", href: "/ref/quick-ref" },
      { label: "Signals Guide", href: "/ref/signals" },
    ],
  },
  { label: "PARENTS", href: "/parent", icon: Users },
  { label: "SCHEDULE", href: "/schedule", icon: Calendar },
  { label: "STANDINGS", href: "/standings", icon: BarChart3 },
];

const utilLinks = [
  { label: "Game Report", href: "/game-report", icon: ClipboardList },
  { label: "FAQ", href: "/faq", icon: HelpCircle },
  { label: "Contact", href: "/contact", icon: Phone },
];

/*
 * The signed in state comes from the SERVER, through the layout, not from a
 * browser fetch. The old header called /api/users/me while the page above it read
 * the session cookie on the server; when those disagreed the header showed Sign In
 * to a signed in member, and every load flashed the signed out state first.
 *
 * The only local state is the optimistic clear on sign out, so the header updates
 * the instant someone signs out rather than waiting for the navigation.
 */
export function Header({ user: serverUser = null }: { user?: AuthUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const user = signedOut ? null : serverUser;
  const canScan = Boolean(user?.roles?.some((r) => SCAN_ROLES.includes(r)));

  // A new server render means a fresh session; drop the optimistic override.
  useEffect(() => {
    setSignedOut(false);
  }, [serverUser]);

  async function signOut() {
    try {
      await fetch("/api/users/logout", { method: "POST", credentials: "include" });
    } catch { /* the cookie is cleared server side either way */ }
    setSignedOut(true);
    // A full document load, for the same reason sign in uses one: the client
    // router may hold a cached render made while the member was still signed in.
    window.location.assign("/");
  }

  return (
    <>
      {/* Top hat bar */}
      <div className="hidden lg:block bg-cmba-black/70 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-8">
          <div className="flex items-center gap-5">
            {utilLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className="font-mono text-[11px] text-cmba-grey hover:text-cmba-red transition-colors uppercase tracking-[0.18em]">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-5">
            {/* The static "league resources / operations" page moved from /admin
                to /resources (Payload's management panel now owns /admin). */}
            <Link href="/resources"
              className="font-mono text-[11px] text-cmba-grey hover:text-cmba-red transition-colors uppercase tracking-[0.18em]">
              Resources
            </Link>
            {user ? (
              <>
                <Link href="/account/card"
                  className="flex items-center gap-1.5 font-mono text-[11px] text-cmba-grey hover:text-cmba-red transition-colors uppercase tracking-[0.18em]">
                  <IdCard size={12} /> Card
                </Link>
                {canScan && (
                  <Link href="/scan"
                    className="flex items-center gap-1.5 font-mono text-[11px] text-cmba-grey hover:text-cmba-red transition-colors uppercase tracking-[0.18em]">
                    <ScanLine size={12} /> Scanner
                  </Link>
                )}
                <Link href="/account"
                  className="flex items-center gap-1.5 font-mono text-[11px] text-cmba-grey hover:text-cmba-red transition-colors uppercase tracking-[0.18em]">
                  <UserCircle size={12} /> Account
                </Link>
                <button onClick={signOut}
                  className="flex items-center gap-1.5 font-mono text-[11px] text-cmba-grey hover:text-cmba-red transition-colors uppercase tracking-[0.18em]">
                  <LogOut size={12} /> Sign Out
                </button>
              </>
            ) : (
              <Link href="/login"
                className="flex items-center gap-1.5 font-mono text-[11px] text-cmba-grey hover:text-cmba-red transition-colors uppercase tracking-[0.18em]">
                <User size={12} /> Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main nav */}
      <header className="sticky top-0 z-50 bg-cmba-black/75 backdrop-blur-xl border-b border-cmba-red/60">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center justify-between h-14 lg:h-16">
          {/* Logo + editorial wordmark */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image src="/cmba-logo-sm.png" alt="CMBA" width={120} height={48}
              className="h-9 lg:h-10 w-auto" priority />
            <div className="hidden sm:block leading-none">
              <Wordmark className="font-display font-black text-white text-2xl uppercase tracking-tight" />
              <div className="font-mono text-[9px] text-cmba-grey tracking-[0.28em] uppercase mt-0.5">
                Calgary Minor Basketball
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main" className="hidden lg:flex items-center gap-1 mix-blend-difference">
            {navLinks.map((link) => (
              <div key={link.href} className="relative group"
                onMouseEnter={() => link.children && setActiveDropdown(link.label)}
                onMouseLeave={() => setActiveDropdown(null)}>
                <Link href={link.href}
                  className="flex items-center gap-1 px-2.5 py-2 font-mono font-medium text-[12px] text-cmba-grey-light uppercase tracking-[0.1em] hover:text-cmba-red transition-colors whitespace-nowrap">
                  {link.label}
                  {link.children && <ChevronDown size={13} className="opacity-50" />}
                </Link>
                {link.children && activeDropdown === link.label && (
                  <div className="absolute top-full left-0 bg-cmba-black-light border border-white/12 min-w-[210px] py-2 shadow-2xl animate-slide-up">
                    {link.children.map((child) => (
                      <Link key={child.href} href={child.href}
                        className="block px-4 py-2.5 text-sm text-cmba-grey hover:text-white hover:bg-cmba-red/10 transition-colors">
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button aria-label="Search" className="p-2 text-cmba-grey hover:text-cmba-red transition-colors">
              <Search size={20} />
            </button>
            {/* Training-account auth lives on our Payload backend (resolves the
                earlier TODO about deferring to TeamLinkt). TeamLinkt remains the
                league system of record; score reporting still deep-links there. */}
            {user ? (
              <Link href="/account"
                className="hidden lg:flex items-center gap-1.5 bg-cmba-red hover:bg-cmba-hot text-white font-display font-black text-xs uppercase tracking-[0.06em] px-3.5 py-1.5 transition-colors">
                <UserCircle size={14} /> Account
              </Link>
            ) : (
              <Link href="/login"
                className="hidden lg:flex items-center gap-1.5 bg-cmba-red hover:bg-cmba-hot text-white font-display font-black text-xs uppercase tracking-[0.06em] px-3.5 py-1.5 transition-colors">
                <User size={14} /> Sign In
              </Link>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-cmba-grey-light" aria-label="Toggle menu">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-cmba-black/97 backdrop-blur-xl border-t border-white/12 animate-slide-up max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <div key={link.href}>
                  <Link href={link.href} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 font-display font-black text-base text-cmba-grey-light uppercase tracking-[0.06em] hover:text-cmba-red hover:bg-cmba-red/5 transition-colors">
                    <link.icon size={20} className="text-cmba-red" />
                    {link.label}
                  </Link>
                  {link.children && (
                    <div className="ml-11 space-y-0.5">
                      {link.children.map((child) => (
                        <Link key={child.href} href={child.href} onClick={() => setMobileOpen(false)}
                          className="block px-3 py-2 text-sm text-cmba-grey hover:text-cmba-red transition-colors">
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t border-white/12 pt-3 mt-3">
                {utilLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 font-mono text-sm text-cmba-grey hover:text-cmba-red transition-colors uppercase tracking-[0.1em]">
                    <link.icon size={18} className="text-cmba-grey" />
                    {link.label}
                  </Link>
                ))}
                <Link href="/resources" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 font-mono text-sm text-cmba-grey hover:text-cmba-red transition-colors uppercase tracking-[0.1em]">
                  <BookOpen size={18} className="text-cmba-grey" /> Resources
                </Link>
                {user ? (
                  <>
                    <Link href="/account/card" onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 text-sm text-cmba-red font-display font-black uppercase tracking-[0.06em]">
                      <IdCard size={18} /> My Member Card
                    </Link>
                    {canScan && (
                      <Link href="/scan" onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 text-sm text-cmba-red font-display font-black uppercase tracking-[0.06em]">
                        <ScanLine size={18} /> Scanner
                      </Link>
                    )}
                    <Link href="/account" onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 text-sm text-cmba-red font-display font-black uppercase tracking-[0.06em]">
                      <UserCircle size={18} /> Account
                    </Link>
                    <button onClick={() => { setMobileOpen(false); signOut(); }}
                      className="flex w-full items-center gap-3 px-3 py-3 text-sm text-cmba-grey font-display font-black uppercase tracking-[0.06em] hover:text-cmba-red transition-colors">
                      <LogOut size={18} /> Sign Out
                    </button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 text-sm text-cmba-red font-display font-black uppercase tracking-[0.06em]">
                    <User size={18} /> Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
