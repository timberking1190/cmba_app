"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, GraduationCap, Flag, ClipboardList } from "lucide-react";
import { clsx } from "clsx";

const tabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Rules", href: "/rules", icon: BookOpen },
  { label: "Coach", href: "/coach", icon: GraduationCap },
  { label: "Ref", href: "/ref", icon: Flag },
  { label: "Report", href: "/game-report", icon: ClipboardList },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-cmba-black-light/95 backdrop-blur-md border-t-2 border-cmba-red safe-bottom">
      <div className="grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-display font-bold uppercase tracking-wider transition-colors",
                isActive
                  ? "text-cmba-red"
                  : "text-cmba-grey hover:text-cmba-grey-light"
              )}
            >
              <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
