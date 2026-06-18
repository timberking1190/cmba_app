import Link from "next/link";
import Image from "next/image";
import { ExternalLink, ClipboardList, MessageCircle, ArrowRight } from "lucide-react";

/*
 * TeamLinkt Score Report Login. Final scores are reported in TeamLinkt, so this
 * deep-links there. We never collect TeamLinkt credentials or proxy their auth.
 */
const APP_URL = process.env.NEXT_PUBLIC_TEAMLINKT_APP_URL || "https://app.teamlinkt.com";

export default function ScoreLoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <Image src="/cmba-logo-md.png" alt="CMBA" width={200} height={80} className="h-16 w-auto mx-auto mb-4" priority />
          <div className="font-mono text-[11px] text-cmba-grey-mid uppercase tracking-[0.2em] mb-2">TeamLinkt · Coaches & Officials</div>
          <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight">
            Score Report <span className="text-cmba-red">Login</span>
          </h1>
        </div>

        {/* Sign in to TeamLinkt */}
        <div className="bg-cmba-black-card border border-cmba-red/30 p-6 mb-6">
          <div className="flex items-start gap-3 mb-5">
            <ClipboardList size={20} className="text-cmba-red shrink-0 mt-0.5" />
            <p className="text-sm text-cmba-grey-light leading-relaxed">
              Final game scores are reported in <span className="text-white font-medium">TeamLinkt</span>. Sign in with your TeamLinkt account to submit a score for your game.
            </p>
          </div>
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider py-3 transition-colors"
          >
            Sign in to TeamLinkt <ExternalLink size={16} />
          </a>
          <p className="mt-3 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider flex items-center justify-center gap-1">
            <ExternalLink size={10} /> Opens in TeamLinkt
          </p>
        </div>

        {/* Concern/compliment (not a score) */}
        <div className="bg-cmba-black-card border border-white/12 p-4 mb-6">
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

        <p className="text-center text-xs text-cmba-grey-mid">
          Looking for training, courses, and resources?{" "}
          <Link href="/login" className="text-cmba-red hover:text-cmba-red-dark">CMBA+ Login</Link>
        </p>
      </div>
    </div>
  );
}
