import { BookOpen, MessageSquare, FileText, ArrowRight, ExternalLink } from "lucide-react";

const RULES_DRIVE_URL =
  "https://drive.google.com/drive/folders/1l0BUfCp8iDpIhf1-emuoesNf3ONnjz_7?usp=sharing";

const ruleDocuments = [
  { title: "1 General", category: "General" },
  { title: "3 Fees", category: "General" },
  { title: "4 Registration", category: "Registration" },
  { title: "5 Participation", category: "General" },
  { title: "6 Games and Competition", category: "Games" },
  { title: "7 Rules of Play", category: "Rules" },
  { title: "7.1 U11 MODS", category: "Division Mods" },
  { title: "7.2 U13 MODS", category: "Division Mods" },
  { title: "7.3 U15 MODS", category: "Division Mods" },
  { title: "7.4 U18 MODS", category: "Division Mods" },
  { title: "7.5 Platinum League Rules", category: "Rules" },
  { title: "8 Discipline", category: "Discipline" },
  { title: "9 Officials Discipline", category: "Discipline" },
];

const policyDocuments = [
  { title: "40 PT Mercy Policy", category: "Policy" },
  { title: "Concussion Policy", category: "Policy" },
  { title: "Forfeit Policy", category: "Policy" },
  { title: "Jewelry Policy", category: "Policy" },
  { title: "Overtime Rules", category: "Rules" },
  { title: "Rule of Two", category: "Policy" },
  { title: "Transgender Policy", category: "Policy" },
  { title: "U11 Seeding Rules", category: "Rules" },
];

const divisionMods = [
  {
    division: "U11",
    doc: "7.1 U11 MODS",
    description: "Modified rules for U11 age division",
  },
  {
    division: "U13",
    doc: "7.2 U13 MODS",
    description: "Modified rules for U13 age division",
  },
  {
    division: "U15",
    doc: "7.3 U15 MODS",
    description: "Modified rules for U15 age division",
  },
  {
    division: "U18",
    doc: "7.4 U18 MODS",
    description: "Modified rules for U18 age division",
  },
];

const popularQuestions = [
  "Can a U11 team full-court press?",
  "What are the overtime rules?",
  "What is the mercy policy?",
  "What are the U13 rule modifications?",
  "What is the concussion policy?",
];

export default function RulesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient border-b border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-6">
              <BookOpen size={14} className="text-cmba-red" />
              <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">
                Rules & Information Hub
              </span>
            </div>
            <h1 className="font-display font-black text-4xl lg:text-6xl text-white uppercase tracking-tight leading-[0.95] mb-4">
              RULES <span className="text-cmba-red">&</span> INFO
            </h1>
            <p className="text-cmba-grey text-base lg:text-lg mb-8">
              The official CMBA rulebook and policies. All rules documents are
              maintained in our shared Google Drive and accessible to everyone.
            </p>
          </div>

          {/* AI Search Box */}
          <div className="max-w-2xl">
            <div className="relative">
              <div className="flex items-center gap-3 bg-cmba-black-card border-2 border-cmba-red/30 focus-within:border-cmba-red px-5 py-4 transition-colors">
                <MessageSquare size={22} className="text-cmba-red shrink-0" />
                <input
                  type="text"
                  placeholder='Ask CMBA anything... e.g. "What is the mercy policy?"'
                  className="flex-1 bg-transparent text-cmba-grey-light text-base placeholder:text-cmba-grey-mid outline-none font-body"
                />
                <button className="bg-cmba-red hover:bg-cmba-red-dark text-white font-display font-bold text-sm uppercase tracking-wider px-4 py-2 transition-colors shrink-0">
                  Ask
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-cmba-grey-mid">Popular:</span>
                {popularQuestions.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    className="text-xs text-cmba-grey hover:text-cmba-red bg-cmba-black-surface px-2 py-1 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* View All Rules CTA */}
      <section className="bg-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <a
            href={RULES_DRIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 text-white font-display font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <ExternalLink size={18} />
            View All Rules Documents on Google Drive
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Core Rules */}
      <section className="bg-cmba-black">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Core <span className="text-cmba-red">Rules</span>
          </h2>
          <p className="text-cmba-grey text-sm mb-8">
            The foundational rules governing CMBA operations, registration,
            games, and discipline.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ruleDocuments.map((doc) => (
              <a
                key={doc.title}
                href={RULES_DRIVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 p-4 transition-colors group"
              >
                <div className="w-10 h-10 bg-cmba-red/10 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-cmba-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-sm text-white uppercase tracking-wide truncate group-hover:text-cmba-red transition-colors">
                    {doc.title}
                  </h4>
                  <span className="font-mono text-[10px] text-cmba-grey-mid">
                    Google Doc
                  </span>
                </div>
                <ExternalLink
                  size={14}
                  className="text-cmba-grey-dark group-hover:text-cmba-red transition-colors shrink-0"
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Division Modifications */}
      <section className="bg-cmba-black-light border-y border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Division <span className="text-cmba-red">Modifications</span>
          </h2>
          <p className="text-cmba-grey text-sm mb-8">
            Each age division has specific rule modifications. Click to view the
            full document.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {divisionMods.map((mod) => (
              <a
                key={mod.division}
                href={RULES_DRIVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/50 p-6 text-center transition-all card-hover group"
              >
                <div className="font-display font-black text-4xl text-cmba-red/30 group-hover:text-cmba-red/60 transition-colors mb-2">
                  {mod.division}
                </div>
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-1 group-hover:text-cmba-red transition-colors">
                  {mod.doc}
                </h3>
                <p className="text-xs text-cmba-grey">{mod.description}</p>
                <div className="mt-3 flex items-center justify-center gap-1 text-cmba-red">
                  <span className="font-mono text-[10px] uppercase">
                    View Document
                  </span>
                  <ExternalLink size={10} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="bg-cmba-black">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Policies <span className="text-cmba-red">& Special Rules</span>
          </h2>
          <p className="text-cmba-grey text-sm mb-8">
            Additional policies covering specific situations including
            concussions, forfeits, mercy rule, and more.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {policyDocuments.map((doc) => (
              <a
                key={doc.title}
                href={RULES_DRIVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 p-4 transition-colors group"
              >
                <div className="w-10 h-10 bg-cmba-red/10 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-cmba-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-sm text-white uppercase tracking-wide truncate group-hover:text-cmba-red transition-colors">
                    {doc.title}
                  </h4>
                  <span className="font-mono text-[10px] text-cmba-grey-mid">
                    Google Doc
                  </span>
                </div>
                <ExternalLink
                  size={14}
                  className="text-cmba-grey-dark group-hover:text-cmba-red transition-colors shrink-0"
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="bg-cmba-black-light border-t border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Additional <span className="text-cmba-red">Resources</span>
          </h2>
          <p className="text-cmba-grey text-sm mb-8">
            Scoresheets and other downloadable resources.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            <a
              href={RULES_DRIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 p-4 transition-colors group"
            >
              <div className="w-10 h-10 bg-cmba-red/10 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-cmba-red" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-bold text-sm text-white uppercase tracking-wide truncate group-hover:text-cmba-red transition-colors">
                  CMBA U11 Scoresheet 2024
                </h4>
                <span className="font-mono text-[10px] text-cmba-grey-mid">
                  PDF
                </span>
              </div>
              <ExternalLink
                size={14}
                className="text-cmba-grey-dark group-hover:text-cmba-red transition-colors shrink-0"
              />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
