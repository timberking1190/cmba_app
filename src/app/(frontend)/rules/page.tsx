"use client";

import { useState } from "react";
import {
  BookOpen,
  FileText,
  ArrowRight,
  ExternalLink,
  Search,
  X,
  MessageCircle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { rulesDocuments, RULES_DRIVE_URL } from "@/lib/rulesData";
import { answerQuestion } from "@/lib/rulesQA";
import type { QAResult } from "@/lib/rulesQA";
import { PhotoBand } from "@/components/media/PhotoBand";
import { CourtLines } from "@/components/graphics/CourtLines";

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
  "Can I press in U11?",
  "What is the mercy policy?",
  "What are the overtime rules?",
  "U13 ball size",
  "Concussion policy",
  "Can U13 double team?",
  "Zone defense rules",
];

export default function RulesPage() {
  const [query, setQuery] = useState("");
  const [qaResult, setQaResult] = useState<QAResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.trim().length >= 2) {
      const result = answerQuestion(q);
      setQaResult(result);
      setHasSearched(true);
    } else {
      setQaResult(null);
      setHasSearched(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setQaResult(null);
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
              ASK <span className="text-cmba-red">CMBA</span>
            </h1>
            <p className="text-cmba-grey text-base lg:text-lg mb-8">
              Ask any basketball rule question and get an instant, direct answer
              with rule citations from the official CMBA rulebook.
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
                  placeholder='Ask a question... e.g. "Can I press in U11?"'
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

      {/* Direct Answer */}
      {hasSearched && qaResult?.directAnswer && (
        <section className="bg-cmba-black border-b border-cmba-grey-dark/20">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-10">
            <div className="max-w-2xl">
              <div className="bg-cmba-black-card border-l-4 border-cmba-red p-6">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle size={18} className="text-cmba-red" />
                  <span className="font-display font-bold text-sm text-cmba-red uppercase tracking-wider">
                    Direct Answer
                  </span>
                  <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5">
                    <CheckCircle size={10} />
                    {qaResult.directAnswer.confidence === "high" ? "Verified" : "Likely"}
                  </span>
                </div>
                <div className="text-cmba-grey-light text-base leading-relaxed whitespace-pre-line">
                  {qaResult.directAnswer.answer.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                      return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-cmba-grey-dark/20 flex items-center gap-2">
                  <AlertCircle size={12} className="text-cmba-grey-mid" />
                  <span className="font-mono text-[10px] text-cmba-grey-mid">
                    Source: {qaResult.directAnswer.ruleReference}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* No Answer Found */}
      {hasSearched && !qaResult?.directAnswer && qaResult?.searchResults.length === 0 && (
        <section className="bg-cmba-black border-b border-cmba-grey-dark/20">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-10">
            <div className="max-w-2xl">
              <div className="bg-cmba-black-card border-l-4 border-cmba-grey-mid p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={18} className="text-cmba-grey-mid" />
                  <span className="font-display font-bold text-sm text-cmba-grey-mid uppercase tracking-wider">
                    Not Found
                  </span>
                </div>
                <p className="text-cmba-grey text-base">
                  Sorry, I couldn&apos;t find a specific answer for &ldquo;{query}&rdquo;.
                  Try rephrasing your question or{" "}
                  <a
                    href={RULES_DRIVE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cmba-red underline"
                  >
                    browse all rules on Google Drive
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search Results */}
      {hasSearched && qaResult && qaResult.searchResults.length > 0 && (
        <section className="bg-cmba-black border-b border-cmba-grey-dark/20">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider mb-6">
              {qaResult.directAnswer ? (
                <>
                  Related <span className="text-cmba-red">Documents</span>
                </>
              ) : (
                <>
                  Found{" "}
                  <span className="text-cmba-red">{qaResult.searchResults.length}</span>{" "}
                  result{qaResult.searchResults.length !== 1 ? "s" : ""} for &ldquo;{query}
                  &rdquo;
                </>
              )}
            </h2>
            <div className="space-y-4">
              {qaResult.searchResults.map((result) => (
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
      <section className="relative bg-cmba-black overflow-hidden">
        <CourtLines className="pointer-events-none absolute top-0 right-0 w-64 text-cmba-red/[0.06] hidden lg:block" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Core <span className="text-cmba-red">Rules</span>
          </h2>
          <p className="reveal text-cmba-grey text-sm mb-8">
            Foundational rules governing CMBA operations, games, and discipline.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ruleDocuments.map((doc, i) => (
              <a
                key={doc.id}
                href={doc.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ transitionDelay: `${i * 60}ms` }}
                className="reveal flex items-center gap-4 bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 p-4 transition-colors group"
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
          <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Division <span className="text-cmba-red">Modifications</span>
          </h2>
          <p className="reveal text-cmba-grey text-sm mb-8">
            Each age division has specific rule modifications.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {divisionMods.map((doc, i) => {
              const division =
                doc.title.match(/U\d+/)?.[0] || "Division";
              return (
                <a
                  key={doc.id}
                  href={doc.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ transitionDelay: `${i * 60}ms` }}
                  className="reveal rv-scale bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/50 p-6 text-center transition-all card-hover group"
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
          <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
            Policies <span className="text-cmba-red">& Special Rules</span>
          </h2>
          <p className="reveal text-cmba-grey text-sm mb-8">
            Additional policies covering specific situations.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...policyDocuments, ...otherDocuments].map((doc, i) => (
              <a
                key={doc.id}
                href={doc.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ transitionDelay: `${i * 60}ms` }}
                className="reveal flex items-center gap-4 bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 p-4 transition-colors group"
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

      {/* Closing photo band */}
      <section className="bg-cmba-black">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-12 lg:pb-16">
          <PhotoBand
            image="swish"
            side="right"
            eyebrow="Know the game"
            title="One rulebook, one standard"
          >
            <p>From U11 press rules to overtime and mercy policies, every CMBA decision traces back to the official rulebook. Search it above, or open the full set of documents on Google Drive.</p>
          </PhotoBand>
        </div>
      </section>
    </div>
  );
}
