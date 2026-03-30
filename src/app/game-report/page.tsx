"use client";

import { useState } from "react";
import { AlertTriangle, Star, Send, Upload } from "lucide-react";

const divisions = ["U8", "U10", "U12 Boys", "U12 Girls", "U14 Boys", "U14 Girls", "U16 Boys", "U16 Girls", "U18 Boys", "U18 Girls"];
const reportedPartyOptions = ["Officials", "Coaches", "Players", "Spectators", "Gym Monitors", "CMBA Operations"];
const officialCategories = ["Professionalism", "Rules Knowledge", "Game Management"];
const submitterRoles = ["Parent", "Coach", "Referee", "Player", "Other"];

export default function GameReportPage() {
  const [reportType, setReportType] = useState<"concern" | "compliment" | null>(null);

  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            GAME <span className="text-cmba-red">REPORT</span>
          </h1>
          <p className="text-cmba-grey mt-2 max-w-lg">
            Submit game feedback — whether it&apos;s a concern or a compliment. No login required. All submissions are reviewed by CMBA administration.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {/* Report Type Selection */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setReportType("concern")}
            className={`p-6 border-2 text-center transition-all ${
              reportType === "concern"
                ? "border-red-500 bg-red-500/10"
                : "border-cmba-grey-dark/20 hover:border-red-500/30 bg-cmba-black-card"
            }`}
          >
            <AlertTriangle size={32} className={`mx-auto mb-2 ${reportType === "concern" ? "text-red-400" : "text-cmba-grey"}`} />
            <div className="font-display font-bold text-lg text-white uppercase tracking-wider">Concern</div>
            <p className="text-xs text-cmba-grey mt-1">Report an issue or concern</p>
          </button>
          <button
            onClick={() => setReportType("compliment")}
            className={`p-6 border-2 text-center transition-all ${
              reportType === "compliment"
                ? "border-green-500 bg-green-500/10"
                : "border-cmba-grey-dark/20 hover:border-green-500/30 bg-cmba-black-card"
            }`}
          >
            <Star size={32} className={`mx-auto mb-2 ${reportType === "compliment" ? "text-green-400" : "text-cmba-grey"}`} />
            <div className="font-display font-bold text-lg text-white uppercase tracking-wider">Compliment</div>
            <p className="text-xs text-cmba-grey mt-1">Recognize great work</p>
          </button>
        </div>

        {reportType && (
          <form className="space-y-6 animate-slide-up">
            {/* Who is being reported */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-6">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">
                Who is this {reportType} about?
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reportedPartyOptions.map((party) => (
                  <label key={party} className="flex items-center gap-2 bg-cmba-black-surface px-3 py-2 cursor-pointer hover:bg-cmba-red/5 transition-colors">
                    <input type="checkbox" className="accent-cmba-red w-4 h-4" />
                    <span className="text-sm text-cmba-grey">{party}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Official Category (if concern about officials) */}
            {reportType === "concern" && (
              <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-6">
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">
                  If about officials — primary area of concern
                </h3>
                <div className="flex flex-wrap gap-2">
                  {officialCategories.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 bg-cmba-black-surface px-3 py-2 cursor-pointer hover:bg-cmba-red/5 transition-colors">
                      <input type="radio" name="officialCategory" className="accent-cmba-red w-4 h-4" />
                      <span className="text-sm text-cmba-grey">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Game Details */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-6">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">Game Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Game Date *</label>
                  <input type="date" className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Division *</label>
                  <select className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors">
                    <option value="">Select division...</option>
                    {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Home Team</label>
                  <input type="text" placeholder="Team name" className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Away Team</label>
                  <input type="text" placeholder="Team name" className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Facility / Gym</label>
                  <input type="text" placeholder="Gym or facility name" className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
              </div>
            </div>

            {/* Your Information */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-6">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">Your Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Your Name *</label>
                  <input type="text" className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Email *</label>
                  <input type="email" className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Phone (optional)</label>
                  <input type="tel" className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Your Role *</label>
                  <select className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light focus:border-cmba-red focus:outline-none transition-colors">
                    <option value="">Select role...</option>
                    {submitterRoles.map((r) => <option key={r} value={r.toLowerCase()}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-6">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">
                {reportType === "concern" ? "Describe the Concern" : "Describe the Compliment"}
              </h3>
              <textarea
                rows={6}
                placeholder={reportType === "concern" ? "Please describe what happened factually and specifically..." : "Tell us who impressed you and why..."}
                className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors resize-none"
                minLength={50}
              />
              <p className="font-mono text-[10px] text-cmba-grey-dark mt-1">Minimum 50 characters</p>
            </div>

            {/* Witnesses & Evidence */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-6">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">Witnesses & Evidence (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-1">Witness Names</label>
                  <input type="text" placeholder="Names of anyone who can corroborate" className="w-full bg-cmba-black-surface border border-cmba-grey-dark/20 px-3 py-2.5 text-sm text-cmba-grey-light placeholder:text-cmba-grey-dark focus:border-cmba-red focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider mb-2">Upload Evidence</label>
                  <div className="border-2 border-dashed border-cmba-grey-dark/30 p-6 text-center hover:border-cmba-red/30 transition-colors cursor-pointer">
                    <Upload size={24} className="mx-auto text-cmba-grey-mid mb-2" />
                    <p className="text-xs text-cmba-grey">Drop files here or click to upload</p>
                    <p className="font-mono text-[10px] text-cmba-grey-dark mt-1">Video or photo evidence (max 25MB)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Acknowledgement */}
            <div className="bg-cmba-black-card border border-yellow-500/20 p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="accent-cmba-red w-5 h-5 mt-0.5 shrink-0" />
                <span className="text-sm text-cmba-grey leading-relaxed">
                  I understand that CMBA takes all reports seriously and that submitting false or embellished reports may result in disciplinary action under CMBA&apos;s policies. The information I&apos;ve provided is truthful and accurate to the best of my knowledge.
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-cmba-red hover:bg-cmba-red-dark text-white font-display font-bold text-base uppercase tracking-wider py-4 transition-colors flex items-center justify-center gap-2"
            >
              <Send size={18} />
              Submit {reportType === "concern" ? "Concern" : "Compliment"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
