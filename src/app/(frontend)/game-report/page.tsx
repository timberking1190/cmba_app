"use client";

import { useState } from "react";
import { AlertTriangle, Star, Send, Upload, CheckCircle } from "lucide-react";
import { CMBA } from "@/lib/cmbaLinks";
import { PhotoBand } from "@/components/media/PhotoBand";
import { CourtLines } from "@/components/graphics/CourtLines";

const divisions = ["Tykes", "U11 Boys", "U11 Girls", "U13 Boys", "U13 Girls", "U15 Boys", "U15 Girls", "U18 Boys", "U18 Girls"];
const reportedPartyOptions = ["Officials", "Coaches", "Players", "Spectators", "Gym Monitors", "CMBA Operations"];
const officialCategories = ["Professionalism", "Rules Knowledge", "Game Management"];
const submitterRoles = ["Parent", "Coach", "Referee", "Player", "Other"];

export default function GameReportPage() {
  const [reportType, setReportType] = useState<"concern" | "compliment" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parties = fd.getAll("reportedParty").join(", ");
    const extra = [
      parties ? `About: ${parties}` : "",
      reportType === "concern" && fd.get("officialCategory") ? `Officials area: ${fd.get("officialCategory")}` : "",
      fd.get("reporterPhone") ? `Phone: ${fd.get("reporterPhone")}` : "",
      fd.get("witnesses") ? `Witnesses: ${fd.get("witnesses")}` : "",
    ].filter(Boolean).join("\n");
    const description = `${fd.get("description") || ""}${extra ? `\n\n— — —\n${extra}` : ""}`;

    setSubmitting(true);
    setError(null);
    try {
      // Submits natively to the GameReports collection (reviewed in /admin).
      const res = await fetch("/api/game-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          reporterName: fd.get("reporterName"),
          reporterEmail: fd.get("reporterEmail"),
          role: fd.get("reporterRole"),
          gameDate: fd.get("gameDate") || undefined,
          division: fd.get("division"),
          homeTeam: fd.get("homeTeam"),
          awayTeam: fd.get("awayTeam"),
          location: fd.get("facility"),
          description,
        }),
      });
      if (!res.ok) {
        setError(`We couldn't submit your report. Please try again, or email ${CMBA.email}.`);
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(`Something went wrong. Please try again, or email ${CMBA.email}.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-hero-gradient border-b-2 border-cmba-red">
        <CourtLines className="pointer-events-none absolute -top-4 right-0 w-72 text-cmba-red/[0.06] hidden lg:block" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            GAME <span className="text-cmba-red">REPORT</span>
          </h1>
          <p className="reveal text-cmba-grey mt-2 max-w-lg">
            Submit game feedback, whether it&apos;s a concern or a compliment. No login required. Reports are reviewed by CMBA.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {/* Native intake note */}
        <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 p-4 mb-8">
          <p className="text-sm text-cmba-grey">
            Reports are submitted directly to CMBA and reviewed by the league. No login required.
            You&apos;ll get a confirmation here when your report is received.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm p-4 mb-8">{error}</div>
        )}

        {submitted && (
          <div className="bg-green-500/10 border border-green-500/40 p-6 mb-8 flex items-start gap-3">
            <CheckCircle size={22} className="text-green-400 shrink-0" />
            <div>
              <h3 className="font-display font-bold text-white uppercase tracking-wider text-sm">Report Received</h3>
              <p className="text-sm text-cmba-grey mt-1">
                Thank you — your report was submitted to CMBA and will be reviewed. If you need to add anything,
                email {CMBA.email}.
              </p>
            </div>
          </div>
        )}

        {/* Report Type Selection */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setReportType("concern")}
            className={`p-6 border-2 text-center transition-all ${reportType === "concern" ? "border-red-500 bg-red-500/10" : "border-white/12 hover:border-red-500/30 bg-cmba-black-card/80"}`}
          >
            <AlertTriangle size={32} className={`mx-auto mb-2 ${reportType === "concern" ? "text-red-400" : "text-cmba-grey"}`} />
            <div className="font-display font-bold text-lg text-white uppercase tracking-wider">Concern</div>
            <p className="text-xs text-cmba-grey mt-1">Report an issue or concern</p>
          </button>
          <button
            onClick={() => setReportType("compliment")}
            className={`p-6 border-2 text-center transition-all ${reportType === "compliment" ? "border-green-500 bg-green-500/10" : "border-white/12 hover:border-green-500/30 bg-cmba-black-card/80"}`}
          >
            <Star size={32} className={`mx-auto mb-2 ${reportType === "compliment" ? "text-green-400" : "text-cmba-grey"}`} />
            <div className="font-display font-bold text-lg text-white uppercase tracking-wider">Compliment</div>
            <p className="text-xs text-cmba-grey mt-1">Recognize great work</p>
          </button>
        </div>

        {reportType && !submitted && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Who is being reported */}
            <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 p-6">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">
                Who is this {reportType} about?
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reportedPartyOptions.map((party) => (
                  <label key={party} className="flex items-center gap-2 bg-cmba-black-surface px-3 py-2 cursor-pointer hover:bg-cmba-red/5 transition-colors">
                    <input type="checkbox" name="reportedParty" value={party} className="accent-cmba-red w-4 h-4" />
                    <span className="text-sm text-cmba-grey">{party}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Official Category (if concern about officials) */}
            {reportType === "concern" && (
              <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 p-6">
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">
                  If about officials, primary area of concern
                </h3>
                <div className="flex flex-wrap gap-2">
                  {officialCategories.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 bg-cmba-black-surface px-3 py-2 cursor-pointer hover:bg-cmba-red/5 transition-colors">
                      <input type="radio" name="officialCategory" value={cat} className="accent-cmba-red w-4 h-4" />
                      <span className="text-sm text-cmba-grey">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Game Details */}
            <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 p-6">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">Game Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Game Date *</label>
                  <input required type="date" name="gameDate" className="w-full bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Division *</label>
                  <select required name="division" className="w-full bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors">
                    <option value="">Select division...</option>
                    {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Home Team</label>
                  <input type="text" name="homeTeam" placeholder="Team name" className="w-full bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Away Team</label>
                  <input type="text" name="awayTeam" placeholder="Team name" className="w-full bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Facility / Gym</label>
                  <input type="text" name="facility" placeholder="Gym or facility name" className="w-full bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
              </div>
            </div>

            {/* Your Information */}
            <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 p-6">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">Your Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Your Name *</label>
                  <input required type="text" name="reporterName" className="w-full bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Email *</label>
                  <input required type="email" name="reporterEmail" className="w-full bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Phone (optional)</label>
                  <input type="tel" name="reporterPhone" className="w-full bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Your Role *</label>
                  <select required name="reporterRole" className="w-full bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors">
                    <option value="">Select role...</option>
                    {submitterRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 p-6">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">
                {reportType === "concern" ? "Describe the Concern" : "Describe the Compliment"}
              </h3>
              <textarea
                required
                name="description"
                rows={6}
                placeholder={reportType === "concern" ? "Please describe what happened factually and specifically..." : "Tell us who impressed you and why..."}
                className="w-full bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors resize-none"
                minLength={50}
              />
              <p className="font-mono text-[10px] text-cmba-grey-dark mt-1">Minimum 50 characters</p>
            </div>

            {/* Witnesses & Evidence */}
            <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 p-6">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">Witnesses & Evidence (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Witness Names</label>
                  <input type="text" name="witnesses" placeholder="Names of anyone who can corroborate" className="w-full bg-cmba-black-surface border border-white/12 px-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-2">Evidence</label>
                  <div className="border-2 border-dashed border-white/20 p-6 text-center">
                    <Upload size={24} className="mx-auto text-cmba-grey-mid mb-2" />
                    <p className="text-xs text-cmba-grey">Have video or photos? Mention them in your report and CMBA will follow up for the files.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Acknowledgement */}
            <div className="bg-cmba-black-card/80 backdrop-blur-sm border border-yellow-500/20 p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input required type="checkbox" className="accent-cmba-red w-5 h-5 mt-0.5 shrink-0" />
                <span className="text-sm text-cmba-grey leading-relaxed">
                  I understand that CMBA takes all reports seriously and that submitting false or embellished reports may result in disciplinary action under CMBA&apos;s policies. The information I&apos;ve provided is truthful and accurate to the best of my knowledge.
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-cmba-red hover:bg-cmba-hot disabled:opacity-50 text-white font-display font-bold text-base uppercase tracking-wider py-4 transition-colors flex items-center justify-center gap-2"
            >
              <Send size={18} />
              {submitting ? "Submitting…" : `Submit ${reportType === "concern" ? "Concern" : "Compliment"}`}
            </button>
          </form>
        )}

        {/* Why it matters */}
        <PhotoBand
          image="swish"
          side="right"
          eyebrow="Every report counts"
          title="A better game for everyone"
          className="mt-12"
        >
          <p>Your feedback helps CMBA recognize great work and address concerns fairly. Every report is read by the league and handled with care.</p>
        </PhotoBand>
      </div>
    </div>
  );
}
