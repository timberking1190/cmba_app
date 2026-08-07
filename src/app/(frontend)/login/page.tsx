"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, ExternalLink, Info, ClipboardList, CheckCircle2 } from "lucide-react";
import { REGISTER } from "@/lib/cmbaLinks";
import { performSignIn } from "@/lib/auth/signIn";
import { safeInternalPath } from "@/lib/security/redirect";
import { Wordmark } from "@/components/Wordmark";
import { CalgarySkyline } from "@/components/graphics/CalgarySkyline";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

const hubCards = [
  { label: "Athletes", role: "athlete", href: "/athlete", desc: "Development pathway, guides, and drills" },
  { label: "Parents", role: "parent", href: "/parent", desc: "Spectator training and family support" },
  { label: "Coaches", role: "coach", href: "/coach", desc: "Certification, courses, and clinics" },
  { label: "Referees", role: "referee", href: "/ref", desc: "Officiating training and resources" },
];

function isUnder18(dob: string): boolean {
  if (!dob) return false;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age < 18;
}

type PolicyVersions = { termsVersion: string; privacyVersion: string; guardianConsentVersion: string };

/*
 * `form-control` (globals.css) carries the mobile rules: a 16px minimum so iOS
 * Safari does not zoom the whole page when the field is focused and leave the user
 * scrolling sideways, and a 48px minimum height so it can be hit one handed. The
 * text-sm that used to be here is removed on purpose, because 14px is precisely
 * what triggers that zoom.
 */
const inputCls =
  "form-control bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors";

function Checkbox({
  checked, onChange, children,
}: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-cmba-red"
      />
      <span className="text-xs text-cmba-grey-light leading-relaxed">{children}</span>
    </label>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  // Signup bot defense: hidden honeypot + a too-fast-submit timing check (S4).
  const [hp, setHp] = useState("");
  const mountedAt = useRef(Date.now());
  const router = useRouter();

  const [policy, setPolicy] = useState<PolicyVersions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  const [dob, setDob] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gName, setGName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gPhone, setGPhone] = useState("");

  const [req1, setReq1] = useState(false);
  const [req2, setReq2] = useState(false);
  const [req3, setReq3] = useState(false);
  const [optMarketing, setOptMarketing] = useState(false);
  const [optPhoto, setOptPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [regRoles, setRegRoles] = useState<string[]>(["participant"]);
  const toggleRegRole = (v: string) =>
    setRegRoles((prev) => (prev.includes(v) ? prev.filter((r) => r !== v) : [...prev, v]));

  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

  const minor = isUnder18(dob);
  // A photo is required for the ID card. Adults choose it at signup; a minor's guardian
  // adds it after confirming the account.
  const photoOk = minor || Boolean(photoFile);

  useEffect(() => {
    fetch("/api/globals/policy-versions")
      .then((r) => r.json())
      .then((d) => setPolicy({
        termsVersion: d.termsVersion, privacyVersion: d.privacyVersion, guardianConsentVersion: d.guardianConsentVersion,
      }))
      .catch(() => {});
  }, []);

  // Auto-save the signup draft (never the password) so an interrupted signup resumes.
  const DRAFT_KEY = "cmba-signup-draft";
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (typeof d.fullName === "string") setFullName(d.fullName);
      if (typeof d.email === "string") setEmail(d.email);
      if (typeof d.dob === "string") setDob(d.dob);
      if (typeof d.gName === "string") setGName(d.gName);
      if (typeof d.gEmail === "string") setGEmail(d.gEmail);
      if (typeof d.gPhone === "string") setGPhone(d.gPhone);
      if (Array.isArray(d.regRoles)) setRegRoles(d.regRoles as string[]);
    } catch { /* ignore bad draft */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ fullName, email, dob, gName, gEmail, gPhone, regRoles }));
    } catch { /* storage may be unavailable */ }
  }, [fullName, email, dob, gName, gEmail, gPhone, regRoles]);

  function redirectTarget(): string {
    if (typeof window === "undefined") return "/account";
    const p = new URLSearchParams(window.location.search).get("redirect");
    return safeInternalPath(p, "/account");
  }

  /*
   * One submit, one landing. performSignIn confirms the session actually resolved
   * before we go anywhere, and we then navigate with a FULL document load rather
   * than the client router.
   *
   * The client router can serve a cached server render of the destination from
   * before the sign in, and for a gated page like /manage that cached render is
   * the redirect back to /login. That is exactly why signing in used to take two
   * or three attempts to reach the admin side. A document navigation cannot come
   * from that cache, so the server always renders with the new session cookie.
   *
   * busy stays true through the navigation on purpose: the button must not look
   * ready to press again while the page is already on its way.
   */
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await performSignIn({ fetchImpl: fetch }, { email: siEmail, password: siPassword, redirectTo: redirectTarget() });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    window.location.assign(result.destination);
  }

  const requiredOk = minor ? req1 && req2 && req3 : req1 && req2;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!policy) { setError("Could not load the current policies. Please refresh."); return; }
    if (!requiredOk) return;
    setBusy(true);
    try {
      const acceptedAt = new Date().toISOString();
      const consents: Record<string, unknown> = {
        termsVersion: policy.termsVersion,
        privacyVersion: policy.privacyVersion,
        acceptedAt,
        marketingOptIn: optMarketing,
        photoOptIn: optPhoto,
      };
      const body: Record<string, unknown> = {
        fullName,
        dateOfBirth: dob,
        consents,
        // Self-service member types (server-side sanitizeSelfRoles blocks any escalation).
        // Minors are participants; their guardian can adjust later.
        roles: minor ? ["participant"] : regRoles.length ? regRoles : ["participant"],
      };
      if (minor) {
        consents.guardianConsentVersion = policy.guardianConsentVersion;
        body.email = gEmail; // guardian is the account holder
        body.password = password;
        body.guardian = { name: gName, email: gEmail, phone: gPhone, relationship: "Parent/Guardian" };
      } else {
        body.email = email;
        body.password = password;
      }

      const hpSignal = hp ? "hp" : Date.now() - mountedAt.current < 1500 ? "timing" : "";
      const turnstileToken =
        typeof window !== "undefined"
          ? ((window as unknown as { __cmbaTurnstileToken?: string }).__cmbaTurnstileToken || "")
          : "";
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cmba-hp": hpSignal, "x-cmba-turnstile": turnstileToken },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.errors?.[0]?.message || "We could not create the account. Please check your entries.");
        return;
      }

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      if (minor) {
        setPendingMsg(
          `We sent a confirmation link to ${gEmail}. The account stays pending until you confirm it from that email.`,
        );
        return;
      }
      await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      // Attach the ID-card photo now that we're authenticated. Best-effort: if it fails,
      // the account still exists and the account page prompts for the photo.
      if (!minor && photoFile && data?.doc?.id) {
        try {
          const fd = new FormData();
          fd.append("file", photoFile);
          fd.append("_payload", JSON.stringify({ alt: `${fullName} — CMBA member photo` }));
          const up = await fetch("/api/media", { method: "POST", credentials: "include", body: fd });
          const upData = await up.json();
          if (up.ok && upData?.doc?.id) {
            await fetch(`/api/users/${data.doc.id}`, {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profilePhoto: upData.doc.id }),
            });
          }
        } catch {
          /* photo can be added on the account page */
        }
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 py-12 overflow-hidden">
      <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-24 text-white/5" />
      <div className="relative w-full max-w-md">
        <div className="reveal text-center mb-6">
          <Image src="/cmba-logo-md.png" alt="CMBA" width={200} height={80} className="h-16 w-auto mx-auto mb-4" priority />
          <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight">
            <Wordmark /> Account
          </h1>
          <p className="text-xs text-cmba-grey-mid mt-1 font-mono uppercase tracking-[0.18em]">Training, courses &amp; resources</p>
        </div>

        {/* Cross-link to the TeamLinkt score-report login */}
        <Link href="/score-login"
          className="reveal flex items-center gap-3 bg-cmba-black-card border border-white/12 hover:border-cmba-red/50 p-3 mb-6 transition-colors group">
          <ClipboardList size={18} className="text-cmba-red shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xs text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">Reporting a game score?</div>
            <div className="text-[11px] text-cmba-grey">Use the TeamLinkt Score Report Login</div>
          </div>
          <ArrowRight size={16} className="text-cmba-grey-dark shrink-0 group-hover:text-cmba-red transition-colors" />
        </Link>

        {/* Training-only clarification */}
        <div className="reveal bg-cmba-red/10 border border-cmba-red/30 p-4 mb-6 flex items-start gap-3">
          <Info size={18} className="text-cmba-red shrink-0 mt-0.5" />
          <p className="text-xs text-cmba-grey-light leading-relaxed">
            <span className="font-display font-bold text-white uppercase tracking-wider">For training and education only.</span>{" "}
            A CMBA Connect account is how you reach your role&apos;s training, courses, and resources. It is <span className="text-white font-medium">not</span> your league registration. To register to play or coach, use TeamLinkt below.
          </p>
        </div>

        {/* Quick hub access (public discovery, signed out) */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {hubCards.map((h, i) => (
            <Link key={h.role} href={h.href} style={{ transitionDelay: `${i * 60}ms` }}
              className="reveal rv-scale bg-cmba-black-card border border-white/12 hover:border-cmba-red/50 p-3 transition-colors group">
              <div className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">{h.label}</div>
              <div className="text-[11px] text-cmba-grey leading-snug mt-0.5">{h.desc}</div>
            </Link>
          ))}
        </div>

        {/* Toggle */}
        <div className="reveal flex bg-cmba-black-card border border-white/12 mb-4">
          <button onClick={() => { setMode("signin"); setError(null); }}
            className={`flex-1 py-2.5 font-display font-bold text-sm uppercase tracking-wider transition-colors ${mode === "signin" ? "bg-cmba-red text-white" : "text-cmba-grey hover:text-white"}`}>
            Sign In
          </button>
          <button onClick={() => { setMode("register"); setError(null); }}
            className={`flex-1 py-2.5 font-display font-bold text-sm uppercase tracking-wider transition-colors ${mode === "register" ? "bg-cmba-red text-white" : "text-cmba-grey hover:text-white"}`}>
            Create Account
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-xs p-3 mb-4">{error}</div>
        )}

        {pendingMsg ? (
          <div className="reveal rv-scale bg-cmba-black-card border border-cmba-red/30 p-6 text-center">
            <CheckCircle2 size={36} className="text-cmba-red mx-auto mb-3" />
            <h2 className="font-display font-bold text-white uppercase tracking-wide mb-2">Almost done</h2>
            <p className="text-sm text-cmba-grey-light leading-relaxed">{pendingMsg}</p>
          </div>
        ) : mode === "signin" ? (
          <form onSubmit={handleSignIn} className="reveal bg-cmba-black-card border border-white/12 p-6 space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmba-grey-mid" />
                <input type="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" inputMode="email" enterKeyHint="next" className={`${inputCls} pl-10`} />
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cmba-grey-mid" />
                <input type="password" required value={siPassword} onChange={(e) => setSiPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" enterKeyHint="go" className={`${inputCls} pl-10`} />
              </div>
            </div>
            <button type="submit" disabled={busy} className="w-full bg-cmba-red hover:bg-cmba-hot disabled:opacity-50 text-white font-display font-bold text-sm uppercase tracking-wider py-3 transition-colors flex items-center justify-center gap-2">
              {busy ? "Signing you in" : "Sign In"} <ArrowRight size={16} aria-hidden />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="reveal bg-cmba-black-card border border-white/12 p-6 space-y-4">
            {/* Honeypot: hidden from people, tempting to naive bots. */}
            <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden">
              <label htmlFor="reg-website">Website</label>
              <input id="reg-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
            </div>
            {/* Step 1 — age check */}
            <div>
              <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm">Let us set up the right account</h2>
              <p className="text-xs text-cmba-grey mt-1 mb-3">
                Enter the participant&apos;s date of birth. If the participant is under 18, a parent or guardian will set up and manage the account.
              </p>
              <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Participant date of birth</label>
              <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} autoComplete="bday" className={inputCls} />
            </div>

            {dob && (
              <>
                {minor ? (
                  <div className="space-y-3 border-t border-white/10 pt-4">
                    <h3 className="font-display font-bold text-white uppercase tracking-wide text-sm">Guardian setup</h3>
                    <p className="text-xs text-cmba-grey">
                      You are setting up an account for an athlete under 18. We will confirm your email so we know the account is connected to a guardian.
                    </p>
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Athlete full name" autoComplete="name" enterKeyHint="next" className={inputCls} />
                    <input type="text" required value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Guardian name" autoComplete="off" enterKeyHint="next" className={inputCls} />
                    <input type="email" required value={gEmail} onChange={(e) => setGEmail(e.target.value)} placeholder="Guardian email" autoComplete="off" inputMode="email" enterKeyHint="next" className={inputCls} />
                    <input type="tel" value={gPhone} onChange={(e) => setGPhone(e.target.value)} placeholder="Guardian phone" autoComplete="off" inputMode="tel" enterKeyHint="next" className={inputCls} />
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" autoComplete="new-password" enterKeyHint="done" className={inputCls} />

                    <div className="space-y-2.5 pt-2">
                      <Checkbox checked={req1} onChange={setReq1}>I am the parent or legal guardian of this athlete.</Checkbox>
                      <Checkbox checked={req2} onChange={setReq2}>
                        I have read and agree to the{" "}
                        <Link href="/terms" target="_blank" className="text-cmba-red underline">Terms of Use</Link>, the{" "}
                        <Link href="/privacy" target="_blank" className="text-cmba-red underline">Privacy Policy</Link>, and the{" "}
                        <Link href="/guardian-consent" target="_blank" className="text-cmba-red underline">Guardian Consent and Children&apos;s Privacy Notice</Link>.
                      </Checkbox>
                      <Checkbox checked={req3} onChange={setReq3}>
                        I consent to CMBA collecting and using my child&apos;s information as described, and I understand I can withdraw consent at any time.
                      </Checkbox>
                      <Checkbox checked={optMarketing} onChange={setOptMarketing}>Send certification and CMBA updates to my email.</Checkbox>
                      <Checkbox checked={optPhoto} onChange={setOptPhoto}>I allow CMBA to use my child&apos;s profile photo inside CMBA Connect.</Checkbox>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-white/10 pt-4">
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" autoComplete="name" enterKeyHint="next" className={inputCls} />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" inputMode="email" enterKeyHint="next" className={inputCls} />
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" autoComplete="new-password" enterKeyHint="done" className={inputCls} />

                    <div className="pt-1">
                      <p className="text-xs text-cmba-grey-light mb-2">I am a&hellip; (choose all that apply)</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { v: "participant", l: "Player" },
                          { v: "coach", l: "Coach" },
                          { v: "official", l: "Official / Referee" },
                          { v: "parent", l: "Parent / Spectator" },
                        ].map((o) => (
                          <button type="button" key={o.v} onClick={() => toggleRegRole(o.v)}
                            className={`px-3 py-2 text-xs font-medium border transition-colors ${regRoles.includes(o.v) ? "border-cmba-red bg-cmba-red/10 text-white" : "border-white/12 text-cmba-grey-light hover:border-white/25"}`}>
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-cmba-grey-light mb-1">ID card photo <span className="text-cmba-red">*</span></label>
                      <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="text-xs text-cmba-grey-light" />
                      <p className="text-[11px] text-cmba-grey-mid mt-1">A clear head-and-shoulders photo for your member ID card.</p>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <Checkbox checked={req1} onChange={setReq1}>
                        I have read and agree to the{" "}
                        <Link href="/terms" target="_blank" className="text-cmba-red underline">Terms of Use</Link> and the{" "}
                        <Link href="/privacy" target="_blank" className="text-cmba-red underline">Privacy Policy</Link>.
                      </Checkbox>
                      <Checkbox checked={req2} onChange={setReq2}>I confirm the information I provide is true and current.</Checkbox>
                      <Checkbox checked={optMarketing} onChange={setOptMarketing}>Send me reminders about my certifications and CMBA updates by email.</Checkbox>
                      <Checkbox checked={optPhoto} onChange={setOptPhoto}>I allow CMBA to use my profile photo inside CMBA Connect.</Checkbox>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-cmba-grey leading-relaxed border-t border-white/10 pt-3">
                  We keep your information safe and in Canada, we never sell it, and you can view, correct, download, or delete it at any time.
                </p>

                {/* Bot challenge (renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set) */}
                <TurnstileWidget />

                {!minor && !photoOk && (
                  <p className="text-[11px] text-cmba-red">An ID card photo is required to create your account.</p>
                )}
                <button type="submit" disabled={busy || !requiredOk || !photoOk}
                  className="w-full bg-cmba-red hover:bg-cmba-hot disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-bold text-sm uppercase tracking-wider py-3 transition-colors flex items-center justify-center gap-2">
                  {busy ? "Creating…" : minor ? "Create my child's account" : "Create my account"}
                </button>
              </>
            )}
          </form>
        )}

        {/* Official CMBA registration */}
        <div className="reveal mt-6 bg-cmba-black-card border border-white/12 p-4">
          <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider mb-1">Registering for the season?</h3>
          <p className="text-xs text-cmba-grey leading-relaxed mb-3">
            League registration (different from this training account) is handled on TeamLinkt.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={REGISTER.player} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[44px] font-mono text-xs text-cmba-red hover:text-white border border-cmba-red/30 hover:border-cmba-red px-3 py-1.5 transition-colors">
              Player Registration <ExternalLink size={12} />
            </a>
            <a href={REGISTER.coach} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[44px] font-mono text-xs text-cmba-red hover:text-white border border-cmba-red/30 hover:border-cmba-red px-3 py-1.5 transition-colors">
              Coach Registration <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-cmba-grey-mid mt-6">
          Public rule lookups and game reports don&apos;t require an account.{" "}
          <Link href="/rules" className="text-cmba-red hover:text-cmba-red-dark">Browse rules</Link>
        </p>
      </div>
    </div>
  );
}
