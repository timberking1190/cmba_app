import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ClipboardList, MessageCircle, ArrowRight } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { CalgarySkyline } from "@/components/graphics/CalgarySkyline";

export const dynamic = "force-dynamic";

/*
 * Score reporting now lives in CMBA Connect (this app is the source of truth). A
 * signed-in user is sent straight to their rep dashboard; a signed-out user gets a
 * sign-in prompt. The concern or compliment link still points at the game report.
 */
export default async function ScoreLoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/rep");

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 py-12 overflow-hidden">
      <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-24 text-white/[0.035]" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <Image src="/cmba-logo-md.png" alt="CMBA" width={200} height={80} className="h-16 w-auto mx-auto mb-4" priority />
          <div className="font-mono text-[11px] text-cmba-grey-mid uppercase tracking-[0.2em] mb-2">Team representatives</div>
          <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight">
            Report a <span className="text-cmba-red">Score</span>
          </h1>
        </div>

        <div className="reveal rv-scale bg-cmba-black-card border border-cmba-red/30 p-6 mb-6">
          <div className="flex items-start gap-3 mb-5">
            <ClipboardList size={20} className="text-cmba-red shrink-0 mt-0.5" />
            <p className="text-sm text-cmba-grey-light leading-relaxed">
              Scores are reported in CMBA Connect. Sign in to your account to report your game and confirm the other team&apos;s result.
            </p>
          </div>
          <Link
            href="/login?redirect=/rep"
            className="w-full inline-flex items-center justify-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider py-3 transition-colors"
          >
            Sign in to report <ArrowRight size={16} />
          </Link>
        </div>

        <div className="reveal bg-cmba-black-card border border-white/12 p-4 mb-6" style={{ transitionDelay: "80ms" }}>
          <div className="flex items-start gap-3">
            <MessageCircle size={18} className="text-cmba-grey-mid shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-cmba-grey leading-relaxed mb-2">
                Reporting a concern or compliment about a game (not a score)? Use the CMBA Game Report instead.
              </p>
              <Link href="/game-report" className="inline-flex items-center gap-1.5 font-mono text-xs text-cmba-red hover:text-white transition-colors">
                Open Game Report <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
