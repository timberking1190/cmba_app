"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, ExternalLink } from "lucide-react";
import { CMBA, REGISTER, COURSES, DOCS, REF } from "@/lib/cmbaLinks";
import { PhotoHero } from "@/components/media/PhotoHero";
import { CourtLines } from "@/components/graphics/CourtLines";

type Q = { q: string; a: string; link?: { label: string; href: string; internal?: boolean } };

const faqCategories: { category: string; questions: Q[] }[] = [
  {
    category: "Registration",
    questions: [
      { q: "When does registration open?", a: "CMBA registers through TeamLinkt. Fall/Winter registration typically opens in late summer, and Spring League opens in late winter. Watch cmba.ab.ca and CMBA's Instagram for the exact dates each season.", link: { label: "Register a Player", href: REGISTER.player } },
      { q: "What does it cost to register?", a: "Fees are set each season and vary by age group and league. They cover gym rental, officials, and league administration. The current fee schedule is published in CMBA's Fees document.", link: { label: "View Fees", href: DOCS.fees } },
      { q: "How do I register my child?", a: "Create a TeamLinkt account and complete the player registration for the league and age group you want. Tykes, U11, U13, U15, and U18 are all registered the same way.", link: { label: "Player Registration", href: REGISTER.player } },
    ],
  },
  {
    category: "Divisions & Play",
    questions: [
      { q: "What age groups does CMBA offer?", a: "CMBA runs Tykes, U11, U13, U15, and U18, across the Club Weeknight League and the Rec Weekend League, plus a Spring League and summer camps." },
      { q: "What rules does CMBA play under?", a: "CMBA plays under the FIBA Official Rules of the Game, with CMBA modifications for each age group (U11, U13, U15, U18).", link: { label: "7. Rules of Play", href: DOCS.rulesOfPlay } },
      { q: "Are there pressing or defense restrictions?", a: "Yes. Younger divisions require person-to-person defense and limit full-court pressing, with allowances that change by division. Always confirm against the official modification documents.", link: { label: "Rule Modifications Guide", href: DOCS.ruleModsGuide } },
    ],
  },
  {
    category: "Coaches",
    questions: [
      { q: "What training do I need to coach?", a: "All CMBA coaches must complete the mandatory online Coach Training (hosted on reach360) and Safe CMBA Interactions, and follow the Rule of Two for supervising minors.", link: { label: "Start Coach Training", href: COURSES.coachTrainingRegister } },
      { q: "How do I register as a coach?", a: "Register as a coach on TeamLinkt, then complete your required training and explore the athlete-development guides in the Coach Hub.", link: { label: "Coach Registration", href: REGISTER.coach } },
    ],
  },
  {
    category: "Referees",
    questions: [
      { q: "How do I become a CMBA referee?", a: "Complete the Intro to CMBA Officiating course and review the Referee Handbook. New officials are supported through CMBA's officiating program.", link: { label: "Intro to Officiating", href: COURSES.introOfficiating } },
      { q: "How are referees assigned to games?", a: "Game assignments and availability are managed through RAMP Assigning. Sign in to your official's account to view and manage your schedule.", link: { label: "RAMP Assigning", href: REF.assigning } },
    ],
  },
  {
    category: "Reports & Conduct",
    questions: [
      { q: "How do I report a concern or compliment about a game?", a: "Use the Game Report to submit a concern or a compliment. No login is required, and all submissions are reviewed by CMBA.", link: { label: "Open Game Report", href: "/game-report", internal: true } },
      { q: "Where can I find CMBA's policies?", a: "Discipline, concussion, mercy, forfeit, and conduct policies are all published on cmba.ab.ca, including the Sportsmanship and Conduct Committee (SCC) Code of Conduct.", link: { label: "SCC Code of Conduct", href: DOCS.sccCodeOfConduct } },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const toggle = (id: string) =>
    setOpenItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqCategories;
    return faqCategories
      .map((cat) => ({
        ...cat,
        questions: cat.questions.filter(
          (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.questions.length > 0);
  }, [query]);

  // Rows remount when the search filter changes; the global .reveal observer
  // only snapshots on route change, so reveal any rows it didn't catch to
  // ensure filtered/restored content is never left stuck at opacity:0.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document
        .querySelectorAll(".faq-reveal:not(.in)")
        .forEach((el) => el.classList.add("in"));
    });
    return () => cancelAnimationFrame(id);
  }, [filtered]);

  return (
    <div>
      <PhotoHero
        image="skylineNight"
        eyebrow="Help Center"
        title="Frequently Asked"
        accent="Questions"
        subtitle="Registration, divisions, coaching, officiating, and conduct — answered. Search below or browse by category."
        className="min-h-[clamp(300px,42vh,440px)]"
      >
        <div className="max-w-lg">
          <div className="flex items-center gap-3 bg-cmba-black-card border border-white/12 px-4 py-3 backdrop-blur-sm">
            <Search size={18} className="text-cmba-grey-mid" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions..."
              className="flex-1 bg-transparent text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark outline-none"
            />
          </div>
        </div>
      </PhotoHero>

      <div className="relative max-w-4xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-8">
        <CourtLines className="pointer-events-none absolute -top-6 right-0 w-64 text-cmba-red/[0.06] hidden lg:block" />
        {filtered.length === 0 && (
          <p className="text-sm text-cmba-grey">
            No questions match &quot;{query}&quot;. Try a different term, or email{" "}
            <a href={CMBA.emailHref} className="text-cmba-red hover:text-white transition-colors">{CMBA.email}</a>.
          </p>
        )}
        {filtered.map((cat) => (
          <div key={cat.category}>
            <h2 className="reveal font-display font-black text-xl text-white uppercase tracking-wider mb-4 flex items-center gap-3">
              <span className="text-cmba-red">{"//  "}</span>{cat.category}
            </h2>
            <div className="space-y-2">
              {cat.questions.map((item, i) => {
                const id = `${cat.category}-${item.q}`;
                const isOpen = openItems.includes(id) || query.trim().length > 0;
                return (
                  <div key={id} style={{ transitionDelay: `${i * 60}ms` }} className="reveal rv-left faq-reveal bg-cmba-black-card/80 backdrop-blur-sm border border-white/12">
                    <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-5 py-4 text-left group">
                      <span className="font-display font-bold text-sm text-cmba-grey-light uppercase tracking-wide group-hover:text-cmba-red transition-colors pr-4">
                        {item.q}
                      </span>
                      <ChevronDown size={18} className={`text-cmba-grey shrink-0 transition-transform ${isOpen ? "rotate-180 text-cmba-red" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4">
                        <p className="text-sm text-cmba-grey leading-relaxed border-t border-white/10 pt-3">{item.a}</p>
                        {item.link && (
                          item.link.internal ? (
                            <Link href={item.link.href} className="inline-flex items-center gap-1.5 mt-3 font-mono text-xs text-cmba-red hover:text-white transition-colors">
                              {item.link.label} <ExternalLink size={12} />
                            </Link>
                          ) : (
                            <a href={item.link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 font-mono text-xs text-cmba-red hover:text-white transition-colors">
                              {item.link.label} <ExternalLink size={12} />
                            </a>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
