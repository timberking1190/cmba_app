import { BookOpen } from "lucide-react";

const signalCategories = [
  {
    category: "Game Control",
    signals: [
      { name: "Start Clock", description: "Chop hand downward", visual: "⬇️" },
      { name: "Stop Clock", description: "Open palm raised above head", visual: "✋" },
      { name: "Stop Clock (Foul)", description: "Closed fist raised above head", visual: "✊" },
      { name: "Jump Ball", description: "Both thumbs up", visual: "👍" },
      { name: "Timeout", description: "Form a T with both hands", visual: "🤚" },
      { name: "Substitution", description: "Crossed forearms in front of chest", visual: "❌" },
    ],
  },
  {
    category: "Violations",
    signals: [
      { name: "Travelling", description: "Rotate fists around each other", visual: "🔄" },
      { name: "Double Dribble", description: "Patting motion with both hands", visual: "👐" },
      { name: "Carrying / Palming", description: "Half-turn of hand", visual: "🤲" },
      { name: "3-Second Violation", description: "Show three fingers, point to lane", visual: "3️⃣" },
      { name: "5-Second Violation", description: "Show five fingers", visual: "🖐️" },
      { name: "Backcourt Violation", description: "Point to backcourt side", visual: "👈" },
      { name: "Kicking", description: "Point to foot", visual: "🦶" },
    ],
  },
  {
    category: "Fouls",
    signals: [
      { name: "Blocking", description: "Both hands on hips", visual: "🙆" },
      { name: "Pushing", description: "Pushing motion with both hands", visual: "🤛" },
      { name: "Holding", description: "Grasp wrist", visual: "🤜" },
      { name: "Hand Check", description: "Strike wrist", visual: "👊" },
      { name: "Charging", description: "Closed fist behind head", visual: "💪" },
      { name: "Technical Foul", description: "Form a T with palms", visual: "🔴" },
      { name: "Intentional / Flagrant", description: "Swing fist", visual: "⚠️" },
    ],
  },
  {
    category: "Scoring & Free Throws",
    signals: [
      { name: "Goal Counts", description: "Point finger down at basket", visual: "☝️" },
      { name: "No Goal", description: "Wave arms across body", visual: "🙅" },
      { name: "1 Free Throw", description: "Show one finger", visual: "1️⃣" },
      { name: "2 Free Throws", description: "Show two fingers", visual: "2️⃣" },
      { name: "3 Free Throws", description: "Show three fingers", visual: "3️⃣" },
      { name: "3-Point Attempt", description: "Three fingers on both hands raised", visual: "🏀" },
      { name: "3-Point Made", description: "Both arms raised, three fingers shown", visual: "🎯" },
    ],
  },
];

export default function SignalsPage() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <BookOpen size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Visual Reference</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            OFFICIATING <span className="text-cmba-red">SIGNALS</span>
          </h1>
          <p className="text-cmba-grey mt-2">Complete visual guide to all basketball officiating hand signals.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-8">
        {signalCategories.map((cat) => (
          <div key={cat.category} className="bg-cmba-black-card border border-cmba-grey-dark/20">
            <div className="px-6 py-4 border-b border-cmba-red/20 bg-cmba-red/5">
              <h2 className="font-display font-bold text-lg text-cmba-red uppercase tracking-wider">{cat.category}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-cmba-grey-dark/10">
              {cat.signals.map((signal) => (
                <div key={signal.name} className="bg-cmba-black-card p-5 hover:bg-cmba-red/5 transition-colors group">
                  <div className="text-3xl mb-3">{signal.visual}</div>
                  <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-1 group-hover:text-cmba-red transition-colors">
                    {signal.name}
                  </h3>
                  <p className="text-xs text-cmba-grey leading-relaxed">{signal.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
