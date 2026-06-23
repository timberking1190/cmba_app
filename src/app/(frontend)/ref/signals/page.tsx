import { BookOpen, ExternalLink } from "lucide-react";
import { REF } from "@/lib/cmbaLinks";
import { PhotoHero } from "@/components/media/PhotoHero";
import { PhotoBand } from "@/components/media/PhotoBand";
import { CourtLines } from "@/components/graphics/CourtLines";

const officialRefs = [
  { label: "CMBA Referee Handbook", href: REF.handbook },
  { label: "Intro to CMBA Officiating Course", href: REF.introCourse },
  { label: "Minor Officials Roles", href: REF.minorOfficials },
  { label: "RAMP Assigning (My Account)", href: REF.assigning },
];

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
      <PhotoHero
        image="hoopNetSky"
        eyebrow="Officiating · Visual Reference"
        title="Officiating"
        accent="Signals"
        subtitle="Visual guide to FIBA officiating hand signals used in CMBA play. Game control, violations, fouls, scoring — the whole vocabulary on the floor."
      >
        <div className="flex flex-wrap gap-2">
          {officialRefs.map((r) => (
            <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-cmba-red hover:text-white border border-cmba-red/30 hover:border-cmba-red px-3 py-1.5 transition-colors backdrop-blur-sm">
              {r.label} <ExternalLink size={12} />
            </a>
          ))}
        </div>
      </PhotoHero>

      <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-8">
        <CourtLines className="pointer-events-none absolute -top-4 right-0 w-64 text-cmba-red/[0.06] hidden lg:block" />

        <div className="reveal inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1">
          <BookOpen size={14} className="text-cmba-red" />
          <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">FIBA Hand Signals</span>
        </div>

        {signalCategories.map((cat, ci) => (
          <div key={cat.category} style={{ transitionDelay: `${ci * 60}ms` }}
            className="reveal rv-left bg-cmba-black-card border border-cmba-grey-dark/20">
            <div className="px-6 py-4 border-b border-cmba-red/20 bg-cmba-red/5">
              <h2 className="font-display font-bold text-lg text-cmba-red uppercase tracking-wider">{cat.category}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-cmba-grey-dark/10">
              {cat.signals.map((signal, i) => (
                <div key={signal.name} style={{ transitionDelay: `${i * 60}ms` }}
                  className="reveal rv-scale bg-cmba-black-card p-5 hover:bg-cmba-red/5 transition-colors group">
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

        <PhotoBand
          image="indoorGym"
          side="right"
          eyebrow="On the floor"
          title="Clear signals, fair games"
        >
          <p>Consistent mechanics keep every CMBA game readable for players, coaches, and the table. Master the signals here, then put them to work — confident calls make better basketball.</p>
        </PhotoBand>
      </div>
    </div>
  );
}
