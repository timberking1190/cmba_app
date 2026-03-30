import { FileText, Printer } from "lucide-react";

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
  { division: "U8", pressing: "No pressing", shotClock: "None", lane: "Not enforced", notes: "Focus on learning, minimal stoppages" },
  { division: "U10", pressing: "Half court only", shotClock: "None", lane: "Warning first", notes: "Encourage ball movement" },
  { division: "U12", pressing: "Full court Q3-Q4 only", shotClock: "30 sec", lane: "Enforced", notes: "Transitional rules apply" },
  { division: "U14+", pressing: "Full court", shotClock: "24 sec", lane: "Enforced", notes: "Standard rules" },
];

export default function QuickRefPage() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
                <FileText size={14} className="text-cmba-red" />
                <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Pre-Game Reference</span>
              </div>
              <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
                QUICK <span className="text-cmba-red">REF</span> CARD
              </h1>
              <p className="text-cmba-grey mt-2">The 20 most common call situations — one-sentence rulings. Designed for pre-game review.</p>
            </div>
            <button className="flex items-center gap-2 border border-cmba-grey-dark text-cmba-grey-light hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors print:hidden">
              <Printer size={16} />Print Card
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-8">
        {/* Common Violations */}
        <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
          <div className="px-6 py-4 border-b border-cmba-red/20 bg-cmba-red/5">
            <h2 className="font-display font-bold text-lg text-cmba-red uppercase tracking-wider">Common Violations</h2>
          </div>
          <div className="divide-y divide-cmba-grey-dark/10">
            {violations.map((v) => (
              <div key={v.name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-6 py-3">
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
        <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
          <div className="px-6 py-4 border-b border-cmba-red/20 bg-cmba-red/5">
            <h2 className="font-display font-bold text-lg text-cmba-red uppercase tracking-wider">Foul Types & Penalties</h2>
          </div>
          <div className="divide-y divide-cmba-grey-dark/10">
            {fouls.map((f) => (
              <div key={f.name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-6 py-3">
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

        {/* Division Modifications */}
        <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
          <div className="px-6 py-4 border-b border-cmba-red/20 bg-cmba-red/5">
            <h2 className="font-display font-bold text-lg text-cmba-red uppercase tracking-wider">Division Rule Modifications</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-cmba-grey-dark/20">
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-6">Division</th>
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">Pressing</th>
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">Shot Clock</th>
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">Lane</th>
                  <th className="text-left font-display font-bold text-xs text-cmba-grey-mid uppercase tracking-widest py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {divisionMods.map((d, i) => (
                  <tr key={d.division} className={`border-b border-cmba-grey-dark/10 ${i % 2 === 0 ? "bg-cmba-black-card/50" : ""}`}>
                    <td className="py-3 px-6 font-display font-black text-cmba-red text-lg">{d.division}</td>
                    <td className="py-3 px-4 text-sm text-cmba-grey-light">{d.pressing}</td>
                    <td className="py-3 px-4 text-sm text-cmba-grey-light">{d.shotClock}</td>
                    <td className="py-3 px-4 text-sm text-cmba-grey-light">{d.lane}</td>
                    <td className="py-3 px-4 text-xs text-cmba-grey-mid italic">{d.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-cmba-black-card border border-yellow-500/30">
          <div className="px-6 py-4 border-b border-yellow-500/20 bg-yellow-500/5">
            <h2 className="font-display font-bold text-lg text-yellow-400 uppercase tracking-wider">Emergency Contacts & Procedures</h2>
          </div>
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-2">Injury Protocol</h3>
              <ol className="space-y-1.5 text-xs text-cmba-grey list-decimal list-inside">
                <li>Stop play immediately</li>
                <li>Assess — do not move injured player</li>
                <li>Call 911 if serious</li>
                <li>Notify site supervisor / gym monitor</li>
                <li>Complete incident report post-game</li>
              </ol>
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-2">Ejection Procedure</h3>
              <ol className="space-y-1.5 text-xs text-cmba-grey list-decimal list-inside">
                <li>Issue 2nd technical foul or flagrant foul</li>
                <li>Inform coach that player/coach is ejected</li>
                <li>Ejected person must leave the gym</li>
                <li>Note details for post-game report</li>
                <li>File report within 24 hours via CMBA Connect</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
