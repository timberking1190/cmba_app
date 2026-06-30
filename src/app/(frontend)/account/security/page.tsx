import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { isAnyAdmin } from "@/access/index";
import { TotpSetup } from "@/components/security/TotpSetup";
import { PasskeyEnroll } from "@/components/security/PasskeyEnroll";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Security | CMBA Connect" };

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account/security");

  const mfa = (user as { mfa?: { enrolled?: boolean; methods?: string[] | null } }).mfa ?? {};
  const enrolled = Boolean(mfa.enrolled);
  const hasPasskey = (mfa.methods ?? []).includes("passkey");
  const admin = isAnyAdmin(user);

  return (
    <div>
      <section className="relative overflow-hidden bg-hero-gradient border-b-2 border-cmba-red">
        <div className="relative max-w-3xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
          <Link href="/account" className="inline-flex items-center gap-1.5 font-mono text-[11px] text-cmba-grey-mid hover:text-white uppercase tracking-wider mb-2">
            <ArrowLeft size={12} /> My account
          </Link>
          <h1 className="font-display font-black text-3xl lg:text-4xl text-white uppercase tracking-tight">Security</h1>
          <p className="text-cmba-grey mt-2 max-w-lg">
            Protect your account with a second sign-in step. {admin ? "Admins are required to set this up." : "Recommended for everyone."}
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        {admin && !enrolled && (
          <div className="bg-orange-500/10 border border-orange-500/40 p-4 flex items-start gap-3">
            <ShieldCheck size={18} className="text-orange-400 shrink-0 mt-0.5" />
            <p className="text-sm text-cmba-grey-light">
              Your account has admin access, so two-factor authentication is required. Set up an authenticator app below to keep full access.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm">Two-factor authentication</h2>
          <PasskeyEnroll hasPasskey={hasPasskey} />
          <TotpSetup enrolled={enrolled} />
        </div>

        <p className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider">
          Managing your active devices and sign-in challenge are coming next.
        </p>
      </div>
    </div>
  );
}
