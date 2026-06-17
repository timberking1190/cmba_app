"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, BarChart3, BookOpen, ClipboardList } from "lucide-react";
import { clsx } from "clsx";

// Quick-access tabs for the broad mobile audience (families checking schedule /
// scores). Role hubs (Coach/Ref) and everything else live in the header menu.
const tabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Schedule", href: "/calendar", icon: CalendarDays },
  { label: "Standings", href: "/standings", icon: BarChart3 },
  { label: "Rules", href: "/rules", icon: BookOpen },
  { label: "Report", href: "/game-report", icon: ClipboardList },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-cmba-black/95 backdrop-blur-xl border-t border-cmba-red/60 safe-bottom">
      <div className="grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className={clsx(
                "flex flex-col items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors",
                isActive ? "text-cmba-red" : "text-cmba-grey hover:text-cmba-grey-light"
              )}>
              <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
