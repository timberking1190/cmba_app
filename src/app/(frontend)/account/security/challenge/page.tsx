import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { safeInternalPath } from "@/lib/security/redirect";
import { MfaChallenge } from "@/components/security/MfaChallenge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify it is you | CMBA Connect" };

export default async function ChallengePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account");

  const mfa = (user as { mfa?: { enrolled?: boolean; methods?: string[] | null } }).mfa ?? {};
  if (!mfa.enrolled) redirect("/account/security");

  const sp = await searchParams;
  const next = safeInternalPath(sp?.next, "/account");

  return (
    <div className="max-w-md mx-auto px-4 lg:px-6 py-12">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={20} className="text-cmba-red" />
        <h1 className="font-display font-black text-2xl text-white uppercase tracking-tight">Verify it is you</h1>
      </div>
      <p className="text-cmba-grey text-sm mb-6">Complete your second step to continue.</p>
      <MfaChallenge methods={mfa.methods ?? []} next={next} />
    </div>
  );
}
