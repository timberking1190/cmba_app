"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, ArrowRight, User } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/cmba-logo.png"
            alt="CMBA"
            width={200}
            height={80}
            className="h-16 w-auto mx-auto mb-4"
            priority
          />
          <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight">
            <span className="text-cmba-red">Connect</span>
          </h1>
          <p className="text-sm text-cmba-grey mt-2">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex bg-cmba-black-card border border-cmba-grey-dark/20 mb-6">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 font-display font-bold text-sm uppercase tracking-wider transition-colors ${mode === "login" ? "bg-cmba-red text-white" : "text-cmba-grey hover:text-white"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 py-2.5 font-display font-bold text-sm uppercase tracking-wider transition-colors ${mode === "register" ? "bg-cmba-red text-white" : "text-cmba-grey hover:text-white"}`}
          >
            Register
          </button>
        </div>

        <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-6 space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmba-grey-mid" />
                  <input type="text" placeholder="Your full name" className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 pl-10 pr-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Role</label>
                <select className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors">
                  <option value="">Select your role...</option>
                  <option value="coach">Coach</option>
                  <option value="referee">Referee</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmba-grey-mid" />
              <input type="email" placeholder="your@email.com" className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 pl-10 pr-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmba-grey-mid" />
              <input type="password" placeholder="••••••••" className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 pl-10 pr-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
            </div>
          </div>

          {mode === "login" && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-cmba-red w-4 h-4" />
                <span className="text-xs text-cmba-grey">Remember me</span>
              </label>
              <button className="text-xs text-cmba-red hover:text-cmba-red-dark transition-colors">
                Forgot password?
              </button>
            </div>
          )}

          <button className="w-full bg-cmba-red hover:bg-cmba-red-dark text-white font-display font-bold text-sm uppercase tracking-wider py-3 transition-colors flex items-center justify-center gap-2">
            {mode === "login" ? "Sign In" : "Create Account"}
            <ArrowRight size={16} />
          </button>

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cmba-grey-dark/20" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-cmba-black-card px-3 text-xs text-cmba-grey-mid">or</span>
            </div>
          </div>

          <button className="w-full border border-cmba-grey-dark/20 text-cmba-grey-light hover:border-cmba-red/30 hover:text-white font-display font-bold text-sm uppercase tracking-wider py-3 transition-colors flex items-center justify-center gap-2">
            <Mail size={16} />
            Sign in with Magic Link
          </button>
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
