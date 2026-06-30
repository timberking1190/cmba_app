"use client";

import { useEffect, useState } from "react";
import { Monitor, Loader2, ShieldCheck } from "lucide-react";

type Session = {
  id: string;
  current: boolean;
  createdAt: string;
  expiresAt: string;
  aal: string;
  ip: string | null;
  device: string | null;
};

function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/iphone|ipad|ios/i.test(ua)) return "iOS device";
  if (/android/i.test(ua)) return "Android device";
  if (/mac/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows PC";
  return "Web browser";
}

export function SessionsList() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/v1/auth/mfa/sessions");
      const j = await res.json();
      if (res.ok) setSessions(j.sessions);
    } catch {
      /* leave as loading; non-fatal */
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function revoke(body: { sid?: string; all?: boolean }, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/mfa/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError((await res.json()).error || "Could not sign out that device.");
        return;
      }
      await load();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!sessions) {
    return (
      <div className="bg-cmba-black-card border border-white/12 p-5 text-sm text-cmba-grey flex items-center gap-2">
        <Loader2 size={15} className="animate-spin" /> Loading your devices...
      </div>
    );
  }

  const others = sessions.filter((s) => !s.current).length;

  return (
    <div className="bg-cmba-black-card border border-white/12 p-5">
      {error && <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm p-3 mb-4">{error}</div>}
      <ul className="divide-y divide-white/10">
        {sessions.map((s) => (
          <li key={s.id} className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Monitor size={18} className="text-cmba-grey-mid shrink-0" />
              <div className="min-w-0">
                <div className="text-sm text-white flex items-center gap-2">
                  {deviceLabel(s.device)}
                  {s.current && <span className="font-mono text-[10px] uppercase tracking-wider text-green-400">This device</span>}
                  {s.aal === "aal2" && <ShieldCheck size={13} className="text-green-400" />}
                </div>
                <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider truncate">
                  {s.ip ? `${s.ip} | ` : ""}signed in {new Date(s.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            {!s.current && (
              <button
                onClick={() => revoke({ sid: s.id }, s.id)}
                disabled={busy === s.id}
                className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-cmba-red hover:text-white disabled:opacity-60 transition-colors"
              >
                {busy === s.id ? "..." : "Sign out"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {others > 0 && (
        <button
          onClick={() => revoke({ all: true }, "all")}
          disabled={busy === "all"}
          className="mt-4 font-mono text-[11px] uppercase tracking-wider text-cmba-grey-light hover:text-white disabled:opacity-60 transition-colors"
        >
          {busy === "all" ? "Signing out..." : "Sign out all other devices"}
        </button>
      )}
    </div>
  );
}
