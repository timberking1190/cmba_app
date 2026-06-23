"use client";

import Link from "next/link";
import { Printer, ExternalLink } from "lucide-react";
import { REF, DOCS } from "@/lib/cmbaLinks";
import { PhotoHero } from "@/components/media/PhotoHero";
import { PhotoBand } from "@/components/media/PhotoBand";
import { CourtLines } from "@/components/graphics/CourtLines";
import { CalgarySkyline } from "@/components/graphics/CalgarySkyline";

const violations = [
  { name: "Travelling", rule: "Player moves one or both feet illegally while holding the ball", signal: "Rotate fists" },
  { name: "Double Dribble", rule: "Player dribbles, stops, then dribbles again", signal: "Pat motion" },
  { name: "Backcourt Violation", rule: "Ball returned to backcourt after establishing frontcourt", signal: "Point to backcourt" },
  { name: "Shot Clock Violation", rule: "Failure to attempt a shot before the shot clock expires", signal: "Tap shoulder" },
  { name: "Lane Violation", rule: "Player enters the lane before the ball leaves the shooter's hand on a free throw", signal: "Point to lane" },
  { name: "3-Second Violation", rule: "Offensive player in the key for more than 3 consecutive seconds", signal: "Three fingers" },
  { name: "5-Second Violation", rule: "Failure to inbound the ball or pass/shoot when closely guarded within 5 seconds", signal: "Five fingers" },
  { name: "Out of Bounds", rule: "Ball or player with ball touches or crosses the boundary line", signal: "Point direction" },
];

const fouls = [
  { name: "Personal Foul", penalty: "Free throws if in bonus; side out otherwise", limit: "5 per player" },
  { name: "Technical Foul", penalty: "2 free throws + possession to offended team", limit: "2 = ejection" },
  { name: "Flagrant Foul", penalty: "2 free throws + possession; possible ejection", limit: "Immediate review" },
  { name: "Team Fouls", penalty: "Bonus free throws after 5th team foul per quarter", limit: "Per quarter" },
];

const divisionMods = [
  { division: "U11", defense: "Person-to-person", press: "No full-court press", mods: DOCS.u11Mods },
  { division: "U13", defense: "Person-to-person", press: "Press allowed: Boys Div 1-3, Girls Div 1-2", mods: DOCS.u13Mods },
  { division: "U15", defense: "Person-to-person", press: "P2P or zone press; revert to P2P in front court", mods: DOCS.u15Mods },
  { division: "U18", defense: "Per FIBA Rules of Play", press: "Per U18 modifications", mods: DOCS.u18Mods },
];

const resources = [
  { label: "Referee Handbook", href: REF.handbook },
  { label: "RAMP Assigning (My Account)", href: REF.assigning },
  { label: "Intro to CMBA Officiating", href: REF.introCourse },
  { label: "Rule Modifications Guide", href: REF.ruleModsGuide },
  { label: "40-Point Mercy Rule", href: DOCS.mercy40 },
  { label: "Forfeit Policy", href: DOCS.forfeit },
];

export default function QuickRefPage() {
  return (
    <div>
      <PhotoHero
        image="swish"
        eyebrow="Pre-Game Reference"
        title="Quick Ref"
        accent="Card"
        subtitle="Common call situations and CMBA division rules. Designed for pre-game review."
      >
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 border border-white/30 text-white hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors backdrop-blur-sm print:hidden"
        >
          <Printer size={16} />Print Card
        </button>
      </PhotoHero>

      {/* Official references */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-8 print:hidden">
        <div className="flex flex-wrap gap-2">
          {resources.map((r, i) => (
            <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer" style={{ transitionDelay: `${i * 60}ms` }}
              className="reveal rv-scale inline-flex items-center gap-1.5 font-mono text-xs text-cmba-red hover:text-white border border-cmba-red/30 hover:border-cmba-red px-3 py-1.5 transition-colors">
              {r.label} <ExternalLink size={12} />
            </a>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-8">
        {/* Common Violations */}
        <div className="reveal relative bg-cmba-black-card/80 backdrop-blur-sm border border-white/12 overflow-hidden">
          <CourtLines className="pointer-events-none absolute -top-8 right-0 w-56 text-cmba-red/[0.06] hidden lg:block" />
          <div className="relative px-6 py-4 border-b border-cmba-red/20 bg-cmba-red/5">
            <h2 className="font-display font-bold text-lg text-cmba-red uppercase tracking-wider">Common Violations</h2>
          </div>
          <div className="relative divide-y divide-white/10">
            {violations.map((v, i) => (
              <div key={v.name} style={{ transitionDelay: `${i * 60}ms` }}
                className="reveal rv-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-6 py-3">
                <div className="sm:w-40 shrink-0">
                  <span className="font-display font-bold text-sm text-white uppercase tracking-wider">{v.name}</span>
                </div>
                <p className="flex-1 text-sm text-cmba-grey">{v.rule}</p>
                <div className="sm:w-36 shrink-0">
                  <span className="font-mono text-[10px] bg-cmba-red/15 text-cmba-red px-2 py-0.5 uppercase">{v.signal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Foul Types */}
        <div className="reveal bg-cmba-black-card/80 backdrop-blur-sm border border-white/12">
          <div className="px-6 py-4 border-b border-cmba-red/20 bg-cmba-red/5">
            <h2 className="font-display font-bold text-lg text-cmba-red uppercase tracking-wider">Foul Types & Penalties</h2>
          </div>
          <div className="divide-y divide-white/10">
            {fouls.map((f, i) => (
              <div key={f.name} style={{ transitionDelay: `${i * 60}ms` }}
                className="reveal rv-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-6 py-3">
                <div className="sm:w-40 shrink-0">
                  <span className="font-display font-bold text-sm text-white uppercase tracking-wider">{f.name}</span>
                </div>
                <p className="flex-1 text-sm text-cmba-grey">{f.penalty}</p>
                <div className="sm:w-36 shrink-0">
                  <span className="font-mono text-[10px] bg-white/10 text-cmba-grey px-2 py-0.5">{f.limit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Photo band */}
        <PhotoBand
          image="indoorGym"
          side="right"
          eyebrow="On the floor"
          title="Know the gym before tip-off"
        >
          <p>Division rules shift by age group. Walk the floor, check the press and defense modifications for the level you&apos;re calling, and confirm against the official mods before the first whistle.</p>
        </PhotoBand>

        {/* Division Modifications */}
        <div className="reveal bg-cmba-black-card/80 backdrop-blur-sm border border-white/12">
          <div className="px-6 py-4 border-b border-cmba-red/20 bg-cmba-red/5 flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-cmba-red uppercase tracking-wider">CMBA Division Modifications</h2>
            <span className="font-mono text-[10px] text-cmba-grey-mid uppercase">Always confirm with official mods</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-white/12">
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-6">Division</th>
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">Defense</th>
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">Full-Court Press</th>
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">Official Mods</th>
                </tr>
              </thead>
              <tbody>
                {divisionMods.map((d, i) => (
                  <tr key={d.division} className={`border-b border-white/10 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                    <td className="py-3 px-6 font-display font-black text-cmba-red text-lg">{d.division}</td>
                    <td className="py-3 px-4 text-sm text-cmba-grey-light">{d.defense}</td>
                    <td className="py-3 px-4 text-sm text-cmba-grey-light">{d.press}</td>
                    <td className="py-3 px-4">
                      <a href={d.mods} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-cmba-red hover:text-white transition-colors">
                        Open <ExternalLink size={11} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="reveal relative bg-cmba-black-card/80 backdrop-blur-sm border border-yellow-500/30 overflow-hidden">
          <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-16 text-white/[0.04]" />
          <div className="relative px-6 py-4 border-b border-yellow-500/20 bg-yellow-500/5">
            <h2 className="font-display font-bold text-lg text-yellow-400 uppercase tracking-wider">Emergency & Game Procedures</h2>
          </div>
          <div className="relative p-6 grid md:grid-cols-2 gap-4">
            <div className="reveal rv-left">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-2">Injury Protocol</h3>
              <ol className="space-y-1.5 text-xs text-cmba-grey list-decimal list-inside">
                <li>Stop play immediately</li>
                <li>Assess; do not move the injured player</li>
                <li>Call 911 if serious</li>
                <li>Notify site supervisor / gym monitor</li>
                <li>Complete an incident report post-game</li>
              </ol>
            </div>
            <div className="reveal rv-right" style={{ transitionDelay: "80ms" }}>
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-2">Ejection Procedure</h3>
              <ol className="space-y-1.5 text-xs text-cmba-grey list-decimal list-inside">
                <li>Issue 2nd technical foul or flagrant foul</li>
                <li>Inform coach that player/coach is ejected</li>
                <li>Ejected person must leave the gym</li>
                <li>Note details for the game report</li>
                <li>
                  Submit a{" "}
                  <Link href="/game-report" className="text-cmba-red hover:text-white transition-colors">game report</Link>{" "}
                  promptly after the game
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
