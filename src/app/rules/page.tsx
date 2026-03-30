import { BookOpen, MessageSquare, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

const categories = [
  { name: "Violations", count: 12, icon: "🏀" },
  { name: "Fouls", count: 8, icon: "✋" },
  { name: "Timing & Clock", count: 6, icon: "⏱️" },
  { name: "Court & Equipment", count: 5, icon: "📏" },
  { name: "Eligibility", count: 4, icon: "📋" },
  { name: "Substitutions", count: 3, icon: "🔄" },
];

const divisionRules = [
  { division: "U8", pressing: "No pressing", shotClock: "None", laneViolation: "Not enforced", freeThrowLine: "Modified" },
  { division: "U10", pressing: "Half court only", shotClock: "None", laneViolation: "Warning first", freeThrowLine: "Modified" },
  { division: "U12", pressing: "Full court Q3-Q4", shotClock: "30 seconds", laneViolation: "Enforced", freeThrowLine: "Standard" },
  { division: "U14", pressing: "Full court", shotClock: "24 seconds", laneViolation: "Enforced", freeThrowLine: "Standard" },
  { division: "U16", pressing: "Full court", shotClock: "24 seconds", laneViolation: "Enforced", freeThrowLine: "Standard" },
  { division: "U18", pressing: "Full court", shotClock: "24 seconds", laneViolation: "Enforced", freeThrowLine: "Standard" },
];

const popularQuestions = [
  "Can a U12 team full-court press in the first half?",
  "What is the shot clock for U14 divisions?",
  "How many fouls before a player fouls out?",
  "What are the lane violation rules for U10?",
  "When can teams make substitutions?",
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
              The official CMBA rulebook — fully searchable with AI-powered answers.
              Find any rule in seconds, from the bench or from home.
            </p>
          </div>

          {/* AI Search Box */}
          <div className="max-w-2xl">
            <div className="relative">
              <div className="flex items-center gap-3 bg-cmba-black-card border-2 border-cmba-red/30 focus-within:border-cmba-red px-5 py-4 transition-colors">
                <MessageSquare size={22} className="text-cmba-red shrink-0" />
                <input
                  type="text"
                  placeholder='Ask CMBA anything... e.g. "Can U10 full-court press?"'
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

      {/* Rule Categories */}
      <section className="bg-cmba-black">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-8">
            Browse by <span className="text-cmba-red">Category</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/rules?category=${cat.name.toLowerCase()}`}
                className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/50 p-5 text-center card-hover group"
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-1 group-hover:text-cmba-red transition-colors">
                  {cat.name}
                </h3>
                <span className="font-mono text-[10px] text-cmba-grey-mid">
                  {cat.count} rules
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Division Comparison Table */}
      <section className="bg-cmba-black-light border-y border-cmba-grey-dark/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Division <span className="text-cmba-red">Modifications</span>
          </h2>
          <p className="text-cmba-grey text-sm mb-8">
            Side-by-side comparison of how rules differ across age divisions.
          </p>
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b-2 border-cmba-red/30">
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">
                    Division
                  </th>
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">
                    Pressing
                  </th>
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">
                    Shot Clock
                  </th>
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">
                    Lane Violation
                  </th>
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">
                    Free Throw
                  </th>
                </tr>
              </thead>
              <tbody>
                {divisionRules.map((row, i) => (
                  <tr
                    key={row.division}
                    className={`border-b border-cmba-grey-dark/10 ${
                      i % 2 === 0 ? "bg-cmba-black-card/50" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-display font-black text-cmba-red text-lg">
                      {row.division}
                    </td>
                    <td className="py-3 px-4 text-sm text-cmba-grey-light">
                      {row.pressing}
                    </td>
                    <td className="py-3 px-4 text-sm text-cmba-grey-light">
                      {row.shotClock}
                    </td>
                    <td className="py-3 px-4 text-sm text-cmba-grey-light">
                      {row.laneViolation}
                    </td>
                    <td className="py-3 px-4 text-sm text-cmba-grey-light">
                      {row.freeThrowLine}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Document Library */}
      <section className="bg-cmba-black">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">
              Document <span className="text-cmba-red">Library</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { title: "CMBA Official Rulebook 2025-26", type: "PDF", size: "2.4 MB" },
              { title: "Basketball Alberta Rules Supplement", type: "PDF", size: "1.1 MB" },
              { title: "Coach Code of Conduct", type: "PDF", size: "340 KB" },
              { title: "Parent Guide to CMBA", type: "PDF", size: "890 KB" },
              { title: "Equipment Standards by Division", type: "PDF", size: "560 KB" },
              { title: "Discipline Policy & Procedures", type: "PDF", size: "420 KB" },
            ].map((doc) => (
              <div
                key={doc.title}
                className="flex items-center gap-4 bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 p-4 transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 bg-cmba-red/10 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-cmba-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-sm text-white uppercase tracking-wide truncate group-hover:text-cmba-red transition-colors">
                    {doc.title}
                  </h4>
                  <span className="font-mono text-[10px] text-cmba-grey-mid">
                    {doc.type} · {doc.size}
                  </span>
                </div>
                <ArrowRight size={16} className="text-cmba-grey-dark group-hover:text-cmba-red transition-colors shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
