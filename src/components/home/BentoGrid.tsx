"use client";

import Link from "next/link";
import { Trophy, Shield, Flag, Users, BookOpen, ArrowUpRight, Sparkles } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { ArcadeGameLazy } from "@/components/fx/arcade/ArcadeGameLazy";

// cursor-following sheen (sets the CSS vars the .bento-tile::after gradient reads)
function sheen(e: React.MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

const hubs = [
  { label: "Athletes", href: "/athlete", icon: Trophy, desc: "Development pathway & guides" },
  { label: "Coaches", href: "/coach", icon: Shield, desc: "Certification, courses & clinics" },
  { label: "Referees", href: "/ref", icon: Flag, desc: "RAMP pathway & signals" },
  { label: "Parents", href: "/parent", icon: Users, desc: "Spectator training & support" },
];

export function BentoGrid() {
  return (
    <section className="px-5 md:px-10 lg:px-14 pb-20 lg:pb-28">
      <div className="max-w-7xl mx-auto">
        <div className="reveal flex items-baseline justify-between mb-6">
          <h2 className="font-display font-black uppercase tracking-tighter2 text-[clamp(26px,4.6vw,52px)]">
            One platform, <span className="text-cmba-red">everything in reach</span>
          </h2>
          <span className="label-sm text-cmba-grey hidden md:block">Explore</span>
        </div>

        <div className="bento">
          {/* Playable retro arcade basketball game (lazy, WebGL-gated, shared high scores) */}
          <div className="bento-tile reveal rv-scale bento-c2 bento-r2 min-h-[300px] lg:min-h-[460px] relative overflow-hidden">
            <ArcadeGameLazy />
          </div>

          {/* Hub tiles */}
          {hubs.map((h, i) => (
            <Link
              key={h.href}
              href={h.href}
              onMouseMove={sheen}
              style={{ transitionDelay: `${80 + i * 70}ms` }}
              className="bento-tile reveal rv-up group min-h-[150px]"
            >
              <div className="relative z-10 flex items-start justify-between">
                <h.icon size={22} className="text-cmba-red" />
                <ArrowUpRight size={18} className="text-cmba-grey-dark group-hover:text-cmba-red transition-colors" />
              </div>
              <div className="relative z-10">
                <div className="font-display font-black uppercase tracking-wide text-lg">{h.label}</div>
                <div className="text-xs text-cmba-grey mt-0.5 leading-snug">{h.desc}</div>
              </div>
            </Link>
          ))}

          {/* Rules wide tile */}
          <Link
            href="/rules"
            onMouseMove={sheen}
            style={{ transitionDelay: "120ms" }}
            className="bento-tile reveal rv-left bento-c2 group min-h-[150px]"
          >
            <div className="relative z-10 flex items-start justify-between">
              <BookOpen size={22} className="text-cmba-red" />
              <ArrowUpRight size={18} className="text-cmba-grey-dark group-hover:text-cmba-red transition-colors" />
            </div>
            <div className="relative z-10">
              <div className="font-display font-black uppercase tracking-wide text-xl">Searchable rulebook</div>
              <div className="text-xs text-cmba-grey mt-0.5">Rules of play, division mods, and points of emphasis — find any rule fast.</div>
            </div>
          </Link>

          {/* Stats tile */}
          <div onMouseMove={sheen} style={{ transitionDelay: "160ms" }} className="bento-tile reveal rv-scale min-h-[150px]">
            <div className="relative z-10"><Sparkles size={20} className="text-cmba-red" /></div>
            <div className="relative z-10 grid grid-cols-2 gap-2">
              <div>
                <div className="font-display font-black text-3xl text-white"><CountUp value="5" /></div>
                <div className="label-xs text-cmba-grey-mid">Age groups</div>
              </div>
              <div>
                <div className="font-display font-black text-3xl text-cmba-red"><CountUp value="13" /></div>
                <div className="label-xs text-cmba-grey-mid">Certifications</div>
              </div>
            </div>
          </div>

          {/* CTA tile */}
          <Link
            href="/login"
            onMouseMove={sheen}
            style={{ transitionDelay: "200ms" }}
            className="bento-tile reveal rv-right group min-h-[150px] !bg-cmba-red/10 border-cmba-red/30"
          >
            <div className="relative z-10"><ArrowUpRight size={22} className="text-cmba-red" /></div>
            <div className="relative z-10">
              <div className="font-display font-black uppercase tracking-wide text-lg text-white">Create account</div>
              <div className="text-xs text-cmba-grey mt-0.5">Track your certifications & pathway.</div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
