import Link from "next/link";
import Image from "next/image";
import {
  Flag,
  FileText,
  BookOpen,
  Trophy,
  Calendar,
  ChevronRight,
  Play,
  Lock,
  AlertCircle,
} from "lucide-react";

const certLevels = [
  { level: "Basic", status: "completed", progress: 100 },
  { level: "Intermediate", status: "in_progress", progress: 45 },
  { level: "Advanced", status: "locked", progress: 0 },
];

const poeItems = [
  "Consistent travelling calls across all divisions",
  "Proper use of the shot clock in U14+ games",
  "Emphasis on sportsmanship and bench conduct",
  "Lane violation enforcement timing in U12",
];

const quickActions = [
  { label: "Quick Reference Card", href: "/ref/quick-ref", icon: FileText, desc: "Pre-game essentials" },
  { label: "Signals Guide", href: "/ref/signals", icon: BookOpen, desc: "All officiating signals" },
  { label: "Mechanics Library", href: "/ref", icon: Flag, desc: "Positioning & rotation" },
  { label: "Video Examples", href: "/ref", icon: Play, desc: "Correct & incorrect calls" },
];

export default function RefDashboard() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
                <Flag size={14} className="text-cmba-red" />
                <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Referee Hub</span>
              </div>
              <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
                REFEREE <span className="text-cmba-red">DASHBOARD</span>
              </h1>
              <p className="text-cmba-grey mt-2">Signals, mechanics, rule interpretations, and certification tracking.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/ref/quick-ref" className="bg-cmba-red hover:bg-cmba-red-dark text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
                Quick Ref Card
              </Link>
              <Link href="/ref/signals" className="border border-cmba-grey-dark text-cmba-grey-light hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
                Signals Guide
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/50 p-5 transition-all card-hover group">
              <action.icon size={24} className="text-cmba-red mb-3" />
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-0.5 group-hover:text-cmba-red transition-colors">{action.label}</h3>
              <p className="text-xs text-cmba-grey">{action.desc}</p>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* RAMP Certification */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="px-6 py-4 border-b border-cmba-grey-dark/20">
                <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                  RAMP Certification Pathway
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {certLevels.map((cert) => (
                  <div key={cert.level} className={`flex items-center gap-4 p-4 border ${cert.status === "in_progress" ? "border-cmba-red/30 bg-cmba-red/5" : cert.status === "completed" ? "border-green-500/20 bg-green-500/5" : "border-cmba-grey-dark/10 opacity-50"}`}>
                    <div className="shrink-0">
                      {cert.status === "completed" ? (
                        <div className="w-10 h-10 bg-green-500/20 flex items-center justify-center">
                          <Trophy size={18} className="text-green-400" />
                        </div>
                      ) : cert.status === "in_progress" ? (
                        <div className="w-10 h-10 bg-cmba-red/20 flex items-center justify-center">
                          <Play size={18} className="text-cmba-red" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-cmba-grey-dark/20 flex items-center justify-center">
                          <Lock size={18} className="text-cmba-grey-mid" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">RAMP {cert.level}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-cmba-grey-dark/30 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${cert.status === "completed" ? "bg-green-500" : "bg-cmba-red"}`} style={{ width: `${cert.progress}%` }} />
                        </div>
                        <span className="font-mono text-xs text-cmba-grey-mid">{cert.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rule Interpretation Library Preview */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="flex items-center justify-between px-6 py-4 border-b border-cmba-grey-dark/20">
                <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">Rule Interpretations</h2>
                <Link href="/rules" className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider flex items-center gap-1">
                  Full Library <ChevronRight size={14} />
                </Link>
              </div>
              <div className="divide-y divide-cmba-grey-dark/10">
                {["Travelling & Double Dribble", "Backcourt Violations", "Shot Clock Administration", "Foul Types & Penalties", "Lane Violation Timing"].map((rule) => (
                  <Link key={rule} href="/rules" className="flex items-center gap-3 px-6 py-3 hover:bg-cmba-red/5 transition-colors group">
                    <BookOpen size={16} className="text-cmba-red/50 shrink-0" />
                    <span className="text-sm text-cmba-grey group-hover:text-white transition-colors">{rule}</span>
                    <ChevronRight size={14} className="text-cmba-grey-dark ml-auto" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Points of Emphasis */}
            <div className="bg-cmba-black-card border border-cmba-red/30">
              <div className="px-5 py-3 border-b border-cmba-red/20 bg-cmba-red/5">
                <h3 className="font-display font-bold text-sm text-cmba-red uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle size={16} />Points of Emphasis
                </h3>
                <span className="font-mono text-[10px] text-cmba-grey-mid">2025-26 Season</span>
              </div>
              <div className="p-5 space-y-3">
                {poeItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-cmba-red mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-xs text-cmba-grey leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Card */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-6 text-center">
              <div className="w-16 h-16 bg-cmba-black-surface rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-cmba-red/30 overflow-hidden">
                <Image src="/cmba-logo-vector.svg" alt="CMBA" width={40} height={40} className="w-10 h-10" />
              </div>
              <h3 className="font-display font-bold text-lg text-white uppercase">Jane Smith</h3>
              <p className="text-xs text-cmba-grey-mid mt-1">Referee · RAMP Basic Certified</p>
              <div className="flex justify-center gap-2 mt-3">
                <span className="font-mono text-[10px] bg-cmba-red/15 text-cmba-red px-2 py-1">RAMP Basic</span>
                <span className="font-mono text-[10px] bg-green-500/15 text-green-400 px-2 py-1">Active</span>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="px-5 py-3 border-b border-cmba-grey-dark/20">
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={16} className="text-cmba-red" />Upcoming
                </h3>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <h4 className="font-display font-bold text-xs text-white uppercase">Referee Development Day</h4>
                  <p className="font-mono text-[10px] text-cmba-grey-mid">Apr 5, 2025 · Trico Centre</p>
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs text-white uppercase">Rules Quiz — Pre-Season</h4>
                  <p className="font-mono text-[10px] text-cmba-grey-mid">Opens Sep 1, 2025</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
