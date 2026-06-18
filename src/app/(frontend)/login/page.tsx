"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, User, ExternalLink, GraduationCap, Info, ClipboardList } from "lucide-react";
import { REGISTER } from "@/lib/cmbaLinks";
import { Wordmark } from "@/components/Wordmark";

const roleHubs: Record<string, string> = {
  athlete: "/athlete",
  parent: "/parent",
  coach: "/coach",
  referee: "/ref",
};

const hubCards = [
  { label: "Athletes", role: "athlete", href: "/athlete", desc: "Development pathway, guides, and drills" },
  { label: "Parents", role: "parent", href: "/parent", desc: "Spectator training and family support" },
  { label: "Coaches", role: "coach", href: "/coach", desc: "Certification, courses, and clinics" },
  { label: "Referees", role: "referee", href: "/ref", desc: "Officiating training and resources" },
];

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [role, setRole] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(roleHubs[role] || "/");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <Image src="/cmba-logo-md.png" alt="CMBA" width={200} height={80} className="h-16 w-auto mx-auto mb-4" priority />
          <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight">
            <Wordmark /> Login
          </h1>
          <p className="text-xs text-cmba-grey-mid mt-1 font-mono uppercase tracking-[0.18em]">Training, courses & resources</p>
        </div>

        {/* Cross-link to the TeamLinkt score-report login */}
        <Link href="/score-login"
          className="flex items-center gap-3 bg-cmba-black-card border border-white/12 hover:border-cmba-red/50 p-3 mb-6 transition-colors group">
          <ClipboardList size={18} className="text-cmba-red shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xs text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">Reporting a game score?</div>
            <div className="text-[11px] text-cmba-grey">Use the TeamLinkt Score Report Login</div>
          </div>
          <ArrowRight size={16} className="text-cmba-grey-dark shrink-0 group-hover:text-cmba-red transition-colors" />
        </Link>

        {/* Training-only clarification */}
        <div className="bg-cmba-red/10 border border-cmba-red/30 p-4 mb-6 flex items-start gap-3">
          <Info size={18} className="text-cmba-red shrink-0 mt-0.5" />
          <p className="text-xs text-cmba-grey-light leading-relaxed">
            <span className="font-display font-bold text-white uppercase tracking-wider">For training and education only.</span>{" "}
            A CMBA+ account is how you reach your role&apos;s training, courses, and resources. It is <span className="text-white font-medium">not</span> your league registration. To register to play or coach, use TeamLinkt below.
          </p>
        </div>

        {/* Quick hub access */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {hubCards.map((h) => (
            <Link key={h.role} href={h.href}
              className="bg-cmba-black-card border border-white/12 hover:border-cmba-red/50 p-3 transition-colors group">
              <div className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">{h.label}</div>
              <div className="text-[11px] text-cmba-grey leading-snug mt-0.5">{h.desc}</div>
            </Link>
          ))}
        </div>

        {/* Toggle */}
        <div className="flex bg-cmba-black-card border border-white/12 mb-4">
          <button onClick={() => setMode("login")}
            className={`flex-1 py-2.5 font-display font-bold text-sm uppercase tracking-wider transition-colors ${mode === "login" ? "bg-cmba-red text-white" : "text-cmba-grey hover:text-white"}`}>
            Sign In
          </button>
          <button onClick={() => setMode("register")}
            className={`flex-1 py-2.5 font-display font-bold text-sm uppercase tracking-wider transition-colors ${mode === "register" ? "bg-cmba-red text-white" : "text-cmba-grey hover:text-white"}`}>
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-cmba-black-card border border-white/12 p-6 space-y-4">
          {mode === "register" && (
            <div>
              <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmba-grey-mid" />
                <input type="text" placeholder="Your full name" className="w-full bg-cmba-black-surface border border-white/12 pl-10 pr-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
              </div>
            </div>
          )}

          <div>
            <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">I am a...</label>
            <div className="relative">
              <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmba-grey-mid" />
              <select required value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full bg-cmba-black-surface border border-white/12 pl-10 pr-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors">
                <option value="">Select your role...</option>
                <option value="athlete">Athlete / Player</option>
                <option value="parent">Parent / Guardian</option>
                <option value="coach">Coach</option>
                <option value="referee">Referee / Official</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmba-grey-mid" />
              <input type="email" placeholder="your@email.com" className="w-full bg-cmba-black-surface border border-white/12 pl-10 pr-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmba-grey-mid" />
              <input type="password" placeholder="••••••••" className="w-full bg-cmba-black-surface border border-white/12 pl-10 pr-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
            </div>
          </div>

          <button type="submit" className="w-full bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider py-3 transition-colors flex items-center justify-center gap-2">
            Continue to My Training
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Official CMBA registration */}
        <div className="mt-6 bg-cmba-black-card border border-white/12 p-4">
          <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider mb-1">
            Registering for the season?
          </h3>
          <p className="text-xs text-cmba-grey leading-relaxed mb-3">
            League registration (different from this training account) is handled on TeamLinkt.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={REGISTER.player} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-cmba-red hover:text-white border border-cmba-red/30 hover:border-cmba-red px-3 py-1.5 transition-colors">
              Player Registration <ExternalLink size={12} />
            </a>
            <a href={REGISTER.coach} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-cmba-red hover:text-white border border-cmba-red/30 hover:border-cmba-red px-3 py-1.5 transition-colors">
              Coach Registration <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-cmba-grey-mid mt-6">
          Public rule lookups and game reports don&apos;t require an account.{" "}
          <Link href="/rules" className="text-cmba-red hover:text-cmba-red-dark">
            Browse rules
          </Link>
        </p>
      </div>
    </div>
  );
}
