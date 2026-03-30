"use client";

import { useState } from "react";
import {
  BookOpen,
  FileText,
  ArrowRight,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import { searchRules, rulesDocuments, RULES_DRIVE_URL } from "@/lib/rulesData";

const ruleDocuments = rulesDocuments.filter((d) =>
  /^(Section |7\.\d|FIBA)/.test(d.title) || d.title.startsWith("7.")
);

const policyDocuments = rulesDocuments.filter(
  (d) =>
    !ruleDocuments.includes(d) &&
    (d.title.toLowerCase().includes("policy") ||
      d.title.toLowerCase().includes("rule") ||
      d.title.toLowerCase().includes("overtime") ||
      d.title.toLowerCase().includes("seeding"))
);

const otherDocuments = rulesDocuments.filter(
  (d) => !ruleDocuments.includes(d) && !policyDocuments.includes(d)
);

const divisionMods = rulesDocuments.filter(
  (d) =>
    d.title.includes("U11 Rule") ||
    d.title.includes("U13 Rule") ||
    d.title.includes("U15 Rule") ||
    d.title.includes("U18 Rule")
);

const popularQuestions = [
  "Can U11 full-court press?",
  "What is the mercy policy?",
  "What are the overtime rules?",
  "U13 ball size",
  "Concussion policy",
];

export default function RulesPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    ReturnType<typeof searchRules>
  >([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.trim().length >= 2) {
      setResults(searchRules(q));
      setHasSearched(true);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

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
              Search the official CMBA rules instantly. Type any question and get
              answers directly from the rulebook.
            </p>
          </div>

          {/* Search Box */}
          <div className="max-w-2xl">
            <div className="relative">
              <div className="flex items-center gap-3 bg-cmba-black-card border-2 border-cmba-red/30 focus-within:border-cmba-red px-5 py-4 transition-colors">
                <Search size={22} className="text-cmba-red shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder='Search rules... e.g. "mercy policy" or "U13 ball size"'
                  className="flex-1 bg-transparent text-cmba-grey-light text-base placeholder:text-cmba-grey-mid outline-none font-body"
                />
                {query && (
                  <button
                    onClick={clearSearch}
                    className="text-cmba-grey hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-cmba-grey-mid">Try:</span>
                {popularQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSearch(q)}
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

      {/* Search Results */}
      {hasSearched && (
        <section className="bg-cmba-black border-b border-cmba-grey-dark/20">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider mb-6">
              {results.length > 0 ? (
                <>
                  Found{" "}
                  <span className="text-cmba-red">{results.length}</span>{" "}
                  result{results.length !== 1 ? "s" : ""} for &ldquo;{query}
                  &rdquo;
                </>
              ) : (
                <>
                  No results for &ldquo;{query}&rdquo;{" "}
                  <span className="text-cmba-grey font-body font-normal text-sm normal-case">
                    — Try different keywords or{" "}
                    <a
                      href={RULES_DRIVE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cmba-red underline"
                    >
                      browse all rules on Google Drive
                    </a>
                  </span>
                </>
              )}
            </h2>
            <div className="space-y-4">
              {results.map((result) => (
                <a
                  key={result.document.id}
                  href={result.document.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/40 p-5 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-cmba-red/10 flex items-center justify-center shrink-0 mt-1">
                      <FileText size={20} className="text-cmba-red" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-base text-white uppercase tracking-wide group-hover:text-cmba-red transition-colors">
                          {result.document.title}
                        </h3>
                        <ExternalLink
                          size={12}
                          className="text-cmba-grey-dark shrink-0"
                        />
                      </div>
                      <p className="text-sm text-cmba-grey leading-relaxed">
                        {result.snippet}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

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
            Foundational rules governing CMBA operations, games, and discipline.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ruleDocuments.map((doc) => (
              <a
                key={doc.id}
                href={doc.driveUrl}
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
            Each age division has specific rule modifications.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {divisionMods.map((doc) => {
              const division =
                doc.title.match(/U\d+/)?.[0] || "Division";
              return (
                <a
                  key={doc.id}
                  href={doc.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/50 p-6 text-center transition-all card-hover group"
                >
                  <div className="font-display font-black text-4xl text-cmba-red/30 group-hover:text-cmba-red/60 transition-colors mb-2">
                    {division}
                  </div>
                  <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-1 group-hover:text-cmba-red transition-colors">
                    Rule Modifications
                  </h3>
                  <div className="mt-3 flex items-center justify-center gap-1 text-cmba-red">
                    <span className="font-mono text-[10px] uppercase">
                      View Document
                    </span>
                    <ExternalLink size={10} />
                  </div>
                </a>
              );
            })}
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
            Additional policies covering specific situations.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...policyDocuments, ...otherDocuments].map((doc) => (
              <a
                key={doc.id}
                href={doc.driveUrl}
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
    </div>
  );
}
