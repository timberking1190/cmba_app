"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, Search } from "lucide-react";

const faqCategories = [
  {
    category: "Registration",
    questions: [
      { q: "When does registration open for the next season?", a: "Registration typically opens in late August for the fall/winter season. Watch for announcements on CMBA Connect and via email. Early bird pricing is usually available for the first two weeks." },
      { q: "What is the cost to register?", a: "Registration fees vary by division and are set each season by the CMBA board. Fees cover gym rental, referee costs, team jerseys, and league administration. Check the current season page for exact pricing." },
      { q: "Can my child play up a division?", a: "Players may request to play up one division with approval from the CMBA executive. A request form must be submitted before the season starts. Playing down is not permitted." },
    ],
  },
  {
    category: "Rules & Play",
    questions: [
      { q: "What are the pressing rules for U10?", a: "U10 divisions use half-court press only. Full-court pressing is not permitted at any point in the game. This is designed to encourage ball handling development." },
      { q: "Is there a shot clock?", a: "U12 uses a 30-second shot clock. U14 and above use the standard 24-second shot clock. U8 and U10 do not have a shot clock." },
      { q: "How many players are on a team?", a: "Team sizes vary by division. U8 typically plays 4-on-4, U10 plays 5-on-5, and U12+ follows standard 5-on-5 rules. Roster sizes are set each season." },
    ],
  },
  {
    category: "Coaches",
    questions: [
      { q: "What certifications do I need to coach?", a: "All head coaches must complete the NCCP Community Coach pathway as a minimum. This includes the Make Ethical Decisions online module and the Coaching Children workshop. See the Coach Hub for full pathway details." },
      { q: "How do I register as a coach?", a: "Create an account on CMBA Connect with the 'Coach' role. You'll gain access to the Coach Hub where you can start your certification pathway and register for clinics." },
    ],
  },
  {
    category: "Referees",
    questions: [
      { q: "How do I become a CMBA referee?", a: "Register on CMBA Connect as a referee, complete the RAMP Basic pathway, and attend one in-person Referee Development Day. The Referee Hub has all the resources you need." },
      { q: "How are referees assigned to games?", a: "The Officials Assignor handles game assignments. Referees can view and manage their availability through the CMBA Connect platform (coming soon)." },
    ],
  },
  {
    category: "Discipline",
    questions: [
      { q: "How do I report a concern about a game?", a: "Use the Game Report feature on CMBA Connect. Select 'Concern', provide the game details, and describe the situation. All reports are reviewed by CMBA administration. No login is required." },
      { q: "What happens after I submit a game report?", a: "You'll receive a confirmation email with a reference number. An admin will review the report and triage it. You may be contacted for additional information. Reports are handled confidentially." },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggle = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <HelpCircle size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Help Center</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            FREQUENTLY ASKED <span className="text-cmba-red">QUESTIONS</span>
          </h1>
          <div className="max-w-lg mt-6">
            <div className="flex items-center gap-3 bg-cmba-black-card border border-cmba-grey-dark/20 px-4 py-3">
              <Search size={18} className="text-cmba-grey-mid" />
              <input type="text" placeholder="Search questions..." className="flex-1 bg-transparent text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark outline-none" />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-8">
        {faqCategories.map((cat) => (
          <div key={cat.category}>
            <h2 className="font-display font-black text-xl text-white uppercase tracking-wider mb-4 flex items-center gap-3">
              <span className="text-cmba-red">{"//  "}</span>{cat.category}
            </h2>
            <div className="space-y-2">
              {cat.questions.map((item) => {
                const id = `${cat.category}-${item.q}`;
                const isOpen = openItems.includes(id);
                return (
                  <div key={id} className="bg-cmba-black-card border border-cmba-grey-dark/20">
                    <button
                      onClick={() => toggle(id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left group"
                    >
                      <span className="font-display font-bold text-sm text-cmba-grey-light uppercase tracking-wide group-hover:text-cmba-red transition-colors pr-4">
                        {item.q}
                      </span>
                      <ChevronDown
                        size={18}
                        className={`text-cmba-grey shrink-0 transition-transform ${isOpen ? "rotate-180 text-cmba-red" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 animate-slide-up">
                        <p className="text-sm text-cmba-grey leading-relaxed border-t border-cmba-grey-dark/10 pt-3">
                          {item.a}
                        </p>
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
