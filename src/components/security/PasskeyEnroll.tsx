"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, Loader2, CheckCircle2 } from "lucide-react";

/*
 * Passkey (WebAuthn) enrollment. Fetches creation options, runs the platform
 * ceremony via @simplewebauthn/browser, and posts the result to be verified +
 * stored. Same-origin fetch carries the session cookie.
 */
export function PasskeyEnroll({ hasPasskey }: { hasPasskey: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(hasPasskey);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const optRes = await fetch("/api/v1/auth/mfa/passkey/register/options", { method: "POST" });
      const optionsJSON = await optRes.json();
      if (!optRes.ok) {
        setError(optionsJSON.error || "Could not start passkey setup.");
        return;
      }
      let response;
      try {
        response = await startRegistration({ optionsJSON });
      } catch (e) {
        const name = (e as { name?: string })?.name;
        setError(name === "InvalidStateError" ? "This device already has a passkey for your account." : "Passkey setup was cancelled.");
        return;
      }
      const vRes = await fetch("/api/v1/auth/mfa/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const v = await vRes.json();
      if (!vRes.ok) {
        setError(v.error || "Could not verify the passkey. Please try again.");
        return;
      }
      setAdded(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-cmba-black-card border border-white/12 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Fingerprint size={18} className="text-cmba-red" />
        <h3 className="font-display font-bold text-white uppercase tracking-wide text-sm">Passkey</h3>
      </div>
      <p className="text-sm text-cmba-grey mb-4">
        A passkey uses your device fingerprint, face, or screen lock to sign in. It is the strongest and most phishing-resistant option.
      </p>

      {error && <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm p-3 mb-4">{error}</div>}

      {added ? (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle2 size={16} /> Passkey registered. You can add another device below.
        </div>
      ) : null}

      <button
        onClick={add}
        disabled={busy}
        className="mt-2 inline-flex items-center gap-2 bg-cmba-red text-white font-display font-bold uppercase tracking-wide text-sm px-5 py-2.5 hover:bg-cmba-red/90 disabled:opacity-60 transition-colors"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Fingerprint size={15} />} {added ? "Add another passkey" : "Add a passkey"}
      </button>
    </div>
  );
}
