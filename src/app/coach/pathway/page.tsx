import { Trophy, CheckCircle, Lock, Circle } from "lucide-react";

const pathways = [
  {
    level: "Community Coach",
    description: "Foundation-level certification for new coaches entering the CMBA system.",
    status: "in_progress",
    progress: 65,
    requirements: [
      { name: "Online NCCP Make Ethical Decisions", done: true },
      { name: "Coaching Children Workshop", done: true },
      { name: "CMBA Fundamentals Module", done: true },
      { name: "Defence Principles (U8-U12)", done: true },
      { name: "Offence Principles (U8-U12)", done: true },
      { name: "Player Communication Essentials", done: false },
      { name: "Practice Planning Basics", done: false },
      { name: "Season-End Evaluation", done: false },
    ],
  },
  {
    level: "Trained Coach",
    description: "Intermediate certification building on community-level foundations.",
    status: "locked",
    progress: 0,
    requirements: [
      { name: "Community Coach Certification", done: false },
      { name: "Advanced Defensive Systems", done: false },
      { name: "Motion Offence Workshop", done: false },
      { name: "Game Management & Substitutions", done: false },
      { name: "Player Development Plans", done: false },
      { name: "In-Person Clinic Attendance (2)", done: false },
      { name: "Mentorship Session (1)", done: false },
    ],
  },
  {
    level: "Developed Coach",
    description: "Advanced certification for experienced coaches working with competitive divisions.",
    status: "locked",
    progress: 0,
    requirements: [
      { name: "Trained Coach Certification", done: false },
      { name: "Advanced Game Strategy", done: false },
      { name: "Scouting & Film Analysis", done: false },
      { name: "Advanced Player Development", done: false },
      { name: "Tournament Preparation", done: false },
      { name: "In-Person Clinic Attendance (3)", done: false },
      { name: "Mentorship Sessions (3)", done: false },
      { name: "Head Coaching Experience (2 seasons)", done: false },
    ],
  },
];

export default function CoachPathwayPage() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <Trophy size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">NCCP Pathway</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            CERTIFICATION <span className="text-cmba-red">PATHWAY</span>
          </h1>
          <p className="text-cmba-grey mt-2 max-w-lg">
            Progress through Community, Trained, and Developed Coach levels. Each level unlocks new resources and responsibilities.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-6">
        {pathways.map((pathway, idx) => (
          <div key={pathway.level} className={`bg-cmba-black-card border ${pathway.status === "in_progress" ? "border-cmba-red/40" : "border-cmba-grey-dark/20"}`}>
            <div className={`flex items-center gap-4 px-6 py-5 border-b ${pathway.status === "in_progress" ? "border-cmba-red/20 bg-cmba-red/5" : "border-cmba-grey-dark/10"}`}>
              <div className="font-display font-black text-5xl text-cmba-red/20">{String(idx + 1).padStart(2, "0")}</div>
              <div className="flex-1">
                <h2 className="font-display font-black text-xl text-white uppercase tracking-wider">{pathway.level}</h2>
                <p className="text-xs text-cmba-grey mt-0.5">{pathway.description}</p>
              </div>
              {pathway.status === "in_progress" && (
                <div className="text-right">
                  <div className="font-display font-black text-2xl text-cmba-red">{pathway.progress}%</div>
                  <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Complete</div>
                </div>
              )}
              {pathway.status === "locked" && (
                <Lock size={24} className="text-cmba-grey-dark" />
              )}
            </div>
            <div className="p-6">
              {pathway.status === "in_progress" && (
                <div className="h-2 bg-cmba-grey-dark/30 rounded-full overflow-hidden mb-6">
                  <div className="h-full bg-cmba-red rounded-full" style={{ width: `${pathway.progress}%` }} />
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-2">
                {pathway.requirements.map((req) => (
                  <div key={req.name} className={`flex items-center gap-3 px-3 py-2.5 ${req.done ? "bg-green-500/5 border border-green-500/20" : "bg-cmba-black-surface/50 border border-cmba-grey-dark/10"}`}>
                    {req.done ? (
                      <CheckCircle size={16} className="text-green-400 shrink-0" />
                    ) : pathway.status === "locked" ? (
                      <Lock size={14} className="text-cmba-grey-dark shrink-0" />
                    ) : (
                      <Circle size={16} className="text-cmba-grey-mid shrink-0" />
                    )}
                    <span className={`text-sm ${req.done ? "text-green-300" : "text-cmba-grey"}`}>{req.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
