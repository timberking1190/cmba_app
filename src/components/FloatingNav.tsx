"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Home, BookOpen, Calendar, UserCircle, ClipboardList } from "lucide-react";

/*
 * Experimental floating nav: a radial quick-launcher (organic alternative to a
 * hamburger). Accessible — a real toggle button with aria-expanded, items are
 * links focusable only when open, ESC and outside-click close it. Hidden under
 * prefers-reduced-motion transitions still work (instant open/close).
 */
const items = [
  { label: "Home", href: "/", icon: Home },
  { label: "Rules", href: "/rules", icon: BookOpen },
  { label: "Schedule", href: "/calendar", icon: Calendar },
  { label: "Game Report", href: "/game-report", icon: ClipboardList },
  { label: "Account", href: "/account", icon: UserCircle },
];

const R = 98;

export function FloatingNav() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <div ref={wrap} className={`fab-wrap ${open ? "open" : ""}`}>
      {items.map((it, i) => {
        const theta = ((90 + i * (90 / (items.length - 1))) * Math.PI) / 180;
        const fx = Math.round(Math.cos(theta) * R);
        const fy = Math.round(-Math.sin(theta) * R);
        return (
          <Link
            key={it.href}
            href={it.href}
            className="fab-item"
            style={{ "--fx": `${fx}px`, "--fy": `${fy}px`, transitionDelay: open ? `${i * 35}ms` : "0ms" } as React.CSSProperties}
            aria-label={it.label}
            tabIndex={open ? 0 : -1}
            aria-hidden={!open}
            onClick={() => setOpen(false)}
          >
            <it.icon size={16} />
            <span className="fab-label">{it.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className={`fab-btn ${open ? "open" : ""}`}
        aria-expanded={open}
        aria-label={open ? "Close quick menu" : "Open quick menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
