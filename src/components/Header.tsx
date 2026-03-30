"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  X,
  ChevronDown,
  Search,
  User,
  BookOpen,
  Flag,
  Calendar,
  HelpCircle,
  Phone,
  Shield,
  ClipboardList,
} from "lucide-react";

const navLinks = [
  {
    label: "RULES",
    href: "/rules",
    icon: BookOpen,
  },
  {
    label: "COACHES",
    href: "/coach",
    icon: Shield,
    children: [
      { label: "Dashboard", href: "/coach" },
      { label: "Certification Pathway", href: "/coach/pathway" },
      { label: "Courses", href: "/coach/courses" },
      { label: "Clinics", href: "/coach/clinics" },
    ],
  },
  {
    label: "REFEREES",
    href: "/ref",
    icon: Flag,
    children: [
      { label: "Dashboard", href: "/ref" },
      { label: "Quick Reference", href: "/ref/quick-ref" },
      { label: "Signals Guide", href: "/ref/signals" },
    ],
  },
  {
    label: "GAME REPORT",
    href: "/game-report",
    icon: ClipboardList,
  },
  {
    label: "CALENDAR",
    href: "/calendar",
    icon: Calendar,
  },
];

const utilLinks = [
  { label: "FAQ", href: "/faq", icon: HelpCircle },
  { label: "Contact", href: "/contact", icon: Phone },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <>
      {/* Top hat bar */}
      <div className="hidden lg:block bg-cmba-black border-b border-cmba-red/30">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-8">
          <div className="flex items-center gap-4">
            {utilLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-cmba-grey text-xs font-medium hover:text-cmba-red transition-colors uppercase tracking-wider"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-cmba-grey text-xs font-medium hover:text-cmba-red transition-colors uppercase tracking-wider"
            >
              Admin
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-cmba-grey text-xs font-medium hover:text-cmba-red transition-colors uppercase tracking-wider"
            >
              <User size={12} />
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <header className="sticky top-0 z-50 bg-cmba-black/95 backdrop-blur-md border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center justify-between h-14 lg:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image
              src="/cmba-logo-sm.png"
              alt="CMBA"
              width={120}
              height={48}
              className="h-9 lg:h-10 w-auto"
              priority
            />
            <div className="hidden sm:block">
              <div className="font-display font-black text-white text-xl uppercase leading-none tracking-tight">
                <span className="text-cmba-red">Connect</span>
              </div>
              <div className="text-[10px] text-cmba-grey tracking-[3px] uppercase">
                Calgary Minor Basketball
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.href}
                className="relative group"
                onMouseEnter={() =>
                  link.children && setActiveDropdown(link.label)
                }
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={link.href}
                  className="flex items-center gap-1 px-4 py-2 font-display font-bold text-sm text-cmba-grey-light uppercase tracking-wider hover:text-cmba-red transition-colors"
                >
                  {link.label}
                  {link.children && <ChevronDown size={14} className="opacity-50" />}
                </Link>
                {link.children && activeDropdown === link.label && (
                  <div className="absolute top-full left-0 bg-cmba-black-light border border-cmba-grey-dark/30 rounded-b-sm min-w-[200px] py-2 shadow-xl animate-slide-up">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2 text-sm text-cmba-grey hover:text-white hover:bg-cmba-red/10 transition-colors"
                      >
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
            <button
              aria-label="Search"
              className="p-2 text-cmba-grey hover:text-cmba-red transition-colors"
            >
              <Search size={20} />
            </button>
            <Link
              href="/login"
              className="hidden lg:flex items-center gap-2 bg-cmba-red hover:bg-cmba-red-dark text-white font-display font-bold text-sm uppercase tracking-wider px-4 py-2 transition-colors"
            >
              <User size={16} />
              Sign In
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-cmba-grey-light"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-cmba-black-light border-t border-cmba-grey-dark/20 animate-slide-up max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 font-display font-bold text-base text-cmba-grey-light uppercase tracking-wider hover:text-cmba-red hover:bg-cmba-red/5 rounded transition-colors"
                  >
                    <link.icon size={20} className="text-cmba-red" />
                    {link.label}
                  </Link>
                  {link.children && (
                    <div className="ml-11 space-y-0.5">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className="block px-3 py-2 text-sm text-cmba-grey hover:text-cmba-red transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t border-cmba-grey-dark/20 pt-3 mt-3">
                {utilLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 text-sm text-cmba-grey hover:text-cmba-red transition-colors"
                  >
                    <link.icon size={18} className="text-cmba-grey" />
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm text-cmba-red font-semibold"
                >
                  <User size={18} />
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
