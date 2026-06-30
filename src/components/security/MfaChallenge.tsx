"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, KeyRound, LifeBuoy, Loader2 } from "lucide-react";

/*
 * Sign-in challenge for an enrolled user. Offers passkey, authenticator code, or a
 * recovery code, posting to the /api/v1/auth/mfa challenge routes. On success the
 * session is elevated server-side and we navigate to `next`.
 */
export function MfaChallenge({ methods, next }: { methods: string[]; next: string }) {
  const router = useRouter();
  const hasPasskey = methods.includes("passkey");
  const hasTotp = methods.includes("totp");
  const [tab, setTab] = useState<"passkey" | "totp" | "recovery">(hasPasskey ? "passkey" : "totp");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function done() {
    router.replace(next || "/account");
    router.refresh();
  }

  async function passkey() {
    setBusy(true);
    setError(null);
    try {
      const o = await fetch("/api/v1/auth/mfa/passkey/auth/options", { method: "POST" });
      const optionsJSON = await o.json();
      if (!o.ok) {
        setError(optionsJSON.error || "Could not start. Try another method.");
        return;
      }
      let response;
      try {
        response = await startAuthentication({ optionsJSON });
      } catch {
        setError("Passkey sign-in was cancelled.");
        return;
      }
      const v = await fetch("/api/v1/auth/mfa/passkey/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (!v.ok) {
        setError((await v.json()).error || "We could not verify that passkey.");
        return;
      }
      done();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(method: "totp" | "recovery", e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/mfa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, token }),
      });
      if (!res.ok) {
        setError((await res.json()).error || "That code did not match.");
        return;
      }
      done();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const tabBtn = (id: typeof tab, label: string, Icon: typeof KeyRound, show: boolean) =>
    show ? (
      <button
        onClick={() => { setTab(id); setError(null); setToken(""); }}
        className={`inline-flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] uppercase tracking-wider border-b-2 transition-colors ${tab === id ? "border-cmba-red text-white" : "border-transparent text-cmba-grey-mid hover:text-white"}`}
      >
        <Icon size={13} /> {label}
      </button>
    ) : null;

  return (
    <div className="bg-cmba-black-card border border-white/12 p-5 max-w-md">
      <div className="flex gap-1 border-b border-white/10 mb-4">
        {tabBtn("passkey", "Passkey", Fingerprint, hasPasskey)}
        {tabBtn("totp", "App code", KeyRound, hasTotp)}
        {tabBtn("recovery", "Recovery", LifeBuoy, true)}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm p-3 mb-4">{error}</div>}

      {tab === "passkey" && (
        <button onClick={passkey} disabled={busy} className="inline-flex items-center gap-2 bg-cmba-red text-white font-display font-bold uppercase tracking-wide text-sm px-5 py-2.5 hover:bg-cmba-red/90 disabled:opacity-60 transition-colors">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Fingerprint size={15} />} Use a passkey
        </button>
      )}

      {tab === "totp" && (
        <form onSubmit={(e) => submitCode("totp", e)} className="space-y-3">
          <label className="block font-mono text-[11px] uppercase tracking-wider text-cmba-grey-mid">Code from your authenticator app</label>
          <input value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="w-40 font-mono text-lg tracking-[0.3em] text-white bg-cmba-black-surface border border-white/12 px-3 py-2 focus:border-cmba-red outline-none" />
          <div><button type="submit" disabled={busy || token.length !== 6} className="inline-flex items-center gap-2 bg-cmba-red text-white font-display font-bold uppercase tracking-wide text-sm px-5 py-2.5 hover:bg-cmba-red/90 disabled:opacity-60 transition-colors">{busy ? <Loader2 size={15} className="animate-spin" /> : null} Verify</button></div>
        </form>
      )}

      {tab === "recovery" && (
        <form onSubmit={(e) => submitCode("recovery", e)} className="space-y-3">
          <label className="block font-mono text-[11px] uppercase tracking-wider text-cmba-grey-mid">Recovery code</label>
          <input value={token} onChange={(e) => setToken(e.target.value.toUpperCase().slice(0, 11))} placeholder="XXXXX-XXXXX" className="w-48 font-mono text-white bg-cmba-black-surface border border-white/12 px-3 py-2 focus:border-cmba-red outline-none" />
          <p className="text-xs text-cmba-grey">Each recovery code works once. Set up a new factor afterward.</p>
          <div><button type="submit" disabled={busy || token.length < 10} className="inline-flex items-center gap-2 bg-cmba-red text-white font-display font-bold uppercase tracking-wide text-sm px-5 py-2.5 hover:bg-cmba-red/90 disabled:opacity-60 transition-colors">{busy ? <Loader2 size={15} className="animate-spin" /> : null} Verify</button></div>
        </form>
      )}
    </div>
  );
}
