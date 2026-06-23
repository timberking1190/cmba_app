import { ExternalLink, ShieldCheck, BookOpen, PlayCircle, ArrowRight, Calendar } from "lucide-react";
import { COURSES, COACH, DEV_GUIDES, DOCS } from "@/lib/cmbaLinks";
import { PhotoHero } from "@/components/media/PhotoHero";
import { PhotoBand } from "@/components/media/PhotoBand";
import { CourtLines } from "@/components/graphics/CourtLines";

const required = [
  { title: "CMBA Coach Training (Mandatory)", desc: "Required online training for all CMBA coaches. Register and complete before the season.", href: COURSES.coachTrainingRegister },
  { title: "Safe CMBA Interactions", desc: "Safe-sport expectations for working with minors and families.", href: COURSES.safeInteractions },
  { title: "Rule of Two", desc: "The Coaching Association of Canada's core safe-sport supervision standard.", href: DOCS.ruleOfTwo },
];

const courses = [
  { title: "CMBA Coach Training Course", href: COURSES.coachTraining },
  { title: "Spectator Training", href: COURSES.spectator },
  { title: "Intro to Officiating CMBA", href: COURSES.introOfficiating },
  { title: "Managing the Moment", href: COURSES.managingTheMoment },
];

const guides = [
  { age: "Tykes", href: DEV_GUIDES.tykes },
  { age: "U11", href: DEV_GUIDES.u11 },
  { age: "U13", href: DEV_GUIDES.u13 },
  { age: "U15", href: DEV_GUIDES.u15 },
  { age: "U18", href: DEV_GUIDES.u18 },
];

const resources = [
  { title: "Essentials Coaching Workbook", href: COACH.essentialsWorkbook },
  { title: "CMBA Drills Library (YouTube)", href: COACH.drillsYouTube },
  { title: "Explode / Explore / Execute Drills", href: COACH.cspDrills },
  { title: "Score Sheet", href: COACH.gameSheet },
  { title: "Score Reporting Guide", href: COACH.scoreReporting },
  { title: "Emergency Action Plan", href: COACH.emergencyActionPlan },
  { title: "Facility AED Locations", href: COACH.aedLocations },
  { title: "Women in Coaching", href: COACH.womenInCoaching },
];

export default function ClinicsPage() {
  return (
    <div>
      {/* Hero */}
      <PhotoHero
        image="skylineNight"
        eyebrow="Coach Development"
        title="Training &"
        accent="Clinics"
        subtitle="CMBA's coach training runs online through reach360. Complete your required training, then keep building with the course library and athlete-development guides."
      >
        <div className="flex flex-wrap gap-3">
          <a href={COURSES.coachTrainingRegister} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
            <ExternalLink size={16} /> Start Mandatory Training
          </a>
          <a href={DOCS.officialCalendar} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-white/30 text-white hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors backdrop-blur-sm">
            <Calendar size={16} /> In-Person Clinic Dates
          </a>
        </div>
      </PhotoHero>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-12">
        {/* Required */}
        <div className="relative">
          <CourtLines className="pointer-events-none absolute -top-6 right-0 w-64 text-cmba-red/[0.06] hidden lg:block" />
          <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight mb-2 flex items-center gap-2">
            <ShieldCheck size={22} className="text-cmba-red" /> Required Training
          </h2>
          <p className="reveal text-cmba-grey text-sm mb-6">Complete these before stepping on the floor.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {required.map((r, i) => (
              <a key={r.title} href={r.href} target="_blank" rel="noopener noreferrer" style={{ transitionDelay: `${i * 70}ms` }}
                className="reveal rv-scale bg-cmba-black/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-5 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">{r.title}</h3>
                  <ExternalLink size={14} className="text-cmba-grey-dark shrink-0" />
                </div>
                <p className="text-xs text-cmba-grey mt-2 leading-relaxed">{r.desc}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Course library */}
        <div>
          <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight mb-2 flex items-center gap-2">
            <PlayCircle size={22} className="text-cmba-red" /> Online Course Library
          </h2>
          <p className="reveal text-cmba-grey text-sm mb-6">Free CMBA courses hosted on reach360.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {courses.map((c, i) => (
              <a key={c.title} href={c.href} target="_blank" rel="noopener noreferrer" style={{ transitionDelay: `${i * 60}ms` }}
                className="reveal rv-left flex items-center gap-3 bg-cmba-black/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-4 transition-colors group">
                <PlayCircle size={18} className="text-cmba-red shrink-0" />
                <span className="flex-1 font-display font-bold text-sm text-cmba-grey-light uppercase tracking-wider group-hover:text-cmba-red transition-colors">{c.title}</span>
                <ExternalLink size={14} className="text-cmba-grey-dark shrink-0" />
              </a>
            ))}
          </div>
        </div>

        {/* Photo band */}
        <PhotoBand
          image="indoorGym"
          side="right"
          eyebrow="On the floor"
          title="Coach with confidence"
        >
          <p>Online modules build the foundation, but the game is taught on the hardwood. Pair your reach360 training with CMBA&apos;s in-person clinics, drill library, and stage-by-stage development guides — so every practice plan is one you can run.</p>
        </PhotoBand>

        {/* Athlete development guides */}
        <div>
          <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight mb-2 flex items-center gap-2">
            <BookOpen size={22} className="text-cmba-red" /> Athlete Development Guides
          </h2>
          <p className="reveal text-cmba-grey text-sm mb-6">
            Stage-by-stage skill outcomes for each age group.{" "}
            <a href={DEV_GUIDES.intro} target="_blank" rel="noopener noreferrer" className="text-cmba-red hover:text-white transition-colors">Watch the intro</a>{" "}or open the{" "}
            <a href={DEV_GUIDES.master} target="_blank" rel="noopener noreferrer" className="text-cmba-red hover:text-white transition-colors">master guide</a>.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {guides.map((g, i) => (
              <a key={g.age} href={g.href} target="_blank" rel="noopener noreferrer" style={{ transitionDelay: `${i * 60}ms` }}
                className="reveal rv-scale bg-cmba-black/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/60 p-5 text-center transition-colors group">
                <div className="font-display font-black text-3xl text-cmba-red/30 group-hover:text-cmba-red/70 transition-colors mb-1">{g.age}</div>
                <div className="font-mono text-[10px] text-cmba-grey uppercase tracking-widest">Guide</div>
              </a>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <h2 className="reveal font-display font-black text-2xl text-white uppercase tracking-tight mb-6">Coaching Resources</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {resources.map((r, i) => (
              <a key={r.title} href={r.href} target="_blank" rel="noopener noreferrer" style={{ transitionDelay: `${i * 50}ms` }}
                className="reveal rv-right flex items-center gap-2 bg-cmba-black/80 backdrop-blur-sm border border-white/12 hover:border-cmba-red/40 p-3 transition-colors group">
                <ArrowRight size={14} className="text-cmba-red shrink-0" />
                <span className="flex-1 text-xs text-cmba-grey-light group-hover:text-white transition-colors">{r.title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
