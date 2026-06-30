"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, Copy, Check, KeyRound } from "lucide-react";

type EnrollData = { secret: string; uri: string; qr: string };

/*
 * Authenticator-app (TOTP) setup. Enroll generates a QR + manual key; confirming a
 * 6-digit code activates it, returns one-time recovery codes (shown once), and
 * elevates this session. Calls the /api/v1/auth/mfa/totp routes with the session
 * cookie (same-origin).
 */
export function TotpSetup({ enrolled }: { enrolled: boolean }) {
  const [data, setData] = useState<EnrollData | null>(null);
  const [token, setToken] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [active, setActive] = useState(enrolled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/mfa/totp/enroll", { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not start setup. Please try again.");
        return;
      }
      setData(j);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/mfa/totp/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "That code did not match. Please try again.");
        return;
      }
      setCodes(j.recoveryCodes || []);
      setActive(true);
      setData(null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // After activation: show recovery codes once.
  if (codes) {
    const text = codes.join("\n");
    return (
      <div className="bg-cmba-black-card border border-green-500/30 p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={18} className="text-green-400" />
          <h3 className="font-display font-bold text-white uppercase tracking-wide text-sm">Authenticator app is on</h3>
        </div>
        <p className="text-sm text-cmba-grey-light mb-3">
          Save these recovery codes somewhere safe. Each one can be used once if you lose your authenticator. You will not see them again.
        </p>
        <div className="grid grid-cols-2 gap-2 font-mono text-sm text-white bg-cmba-black-surface border border-white/12 p-3">
          {codes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text);
            setCopied(true);
          }}
          className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-cmba-red hover:text-white transition-colors"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy codes"}
        </button>
      </div>
    );
  }

  // Already enrolled (and not mid-setup).
  if (active && !data) {
    return (
      <div className="bg-cmba-black-card border border-white/12 p-5 flex items-center gap-3">
        <ShieldCheck size={20} className="text-green-400 shrink-0" />
        <div>
          <div className="font-display font-bold text-white uppercase tracking-wide text-sm">Authenticator app</div>
          <p className="text-sm text-cmba-grey">On. You will be asked for a code when you sign in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cmba-black-card border border-white/12 p-5">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={18} className="text-cmba-red" />
        <h3 className="font-display font-bold text-white uppercase tracking-wide text-sm">Authenticator app</h3>
      </div>
      <p className="text-sm text-cmba-grey mb-4">
        Use an app like Google Authenticator, 1Password, or Authy to generate a sign-in code. This is the strong second step that protects your account.
      </p>

      {error && <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm p-3 mb-4">{error}</div>}

      {!data ? (
        <button
          onClick={startEnroll}
          disabled={busy}
          className="inline-flex items-center gap-2 bg-cmba-red text-white font-display font-bold uppercase tracking-wide text-sm px-5 py-2.5 hover:bg-cmba-red/90 disabled:opacity-60 transition-colors"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null} Set up authenticator app
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.qr} alt="Authenticator QR code" width={168} height={168} className="border border-white/12 bg-white p-2 shrink-0" />
            <div className="text-sm text-cmba-grey-light">
              <p className="mb-2">Scan this with your authenticator app. Cannot scan? Enter this key manually:</p>
              <code className="block font-mono text-xs text-white bg-cmba-black-surface border border-white/12 px-2 py-1 break-all">{data.secret}</code>
            </div>
          </div>
          <form onSubmit={activate} className="space-y-3">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-cmba-grey-mid">Enter the 6-digit code</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="w-40 font-mono text-lg tracking-[0.3em] text-white bg-cmba-black-surface border border-white/12 px-3 py-2 focus:border-cmba-red outline-none"
            />
            <div>
              <button
                type="submit"
                disabled={busy || token.length !== 6}
                className="inline-flex items-center gap-2 bg-cmba-red text-white font-display font-bold uppercase tracking-wide text-sm px-5 py-2.5 hover:bg-cmba-red/90 disabled:opacity-60 transition-colors"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : null} Confirm and turn on
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
