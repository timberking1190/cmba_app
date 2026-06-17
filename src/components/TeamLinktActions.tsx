"use client";

import { LogIn, ClipboardList, UserCircle, ExternalLink } from "lucide-react";

/*
 * Reusable Off+Brand buttons that deep-link to TeamLinkt for the actions we do
 * NOT handle ourselves (login, score reporting, account). We never collect
 * TeamLinkt credentials or proxy their auth: every button opens the TeamLinkt app.
 */
export function TeamLinktActions({
  appUrl,
  layout = "stack",
}: {
  appUrl?: string;
  layout?: "stack" | "row";
}) {
  const APP = appUrl || process.env.NEXT_PUBLIC_TEAMLINKT_APP_URL || "https://app.teamlinkt.com";
  const actions = [
    { label: "Sign in", href: APP, icon: LogIn },
    { label: "Report a score", href: APP, icon: ClipboardList },
    { label: "My account", href: APP, icon: UserCircle },
  ];
  return (
    <div>
      <div className={layout === "row" ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}>
        {actions.map((a, i) => (
          <a
            key={a.label}
            href={a.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 font-display font-bold text-sm uppercase tracking-wider px-4 py-2.5 transition-colors ${
              i === 0
                ? "bg-cmba-red hover:bg-cmba-hot text-white"
                : "border border-white/15 text-cmba-grey-light hover:border-cmba-red hover:text-white"
            }`}
          >
            <a.icon size={15} /> {a.label}
          </a>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider flex items-center gap-1">
        <ExternalLink size={10} /> Opens in TeamLinkt
      </p>
    </div>
  );
}
