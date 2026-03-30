import Link from "next/link";
import { BookOpen, Clock, Play, Filter } from "lucide-react";

const courses = [
  { id: "1", title: "Defensive Fundamentals for Youth", category: "Defence", division: "U10-U12", duration: "45 min", modules: 6, progress: 80 },
  { id: "2", title: "Running a Fast Break Offence", category: "Offence", division: "U12-U14", duration: "35 min", modules: 5, progress: 30 },
  { id: "3", title: "Effective Communication with Players", category: "Communication", division: "All", duration: "25 min", modules: 4, progress: 0 },
  { id: "4", title: "Zone Defence Concepts", category: "Defence", division: "U14+", duration: "40 min", modules: 5, progress: 0 },
  { id: "5", title: "Inbound Plays & Special Situations", category: "Offence", division: "U12+", duration: "30 min", modules: 4, progress: 0 },
  { id: "6", title: "Player Development & Feedback", category: "Development", division: "All", duration: "35 min", modules: 6, progress: 0 },
  { id: "7", title: "Drill Library: Warm-Up & Fundamentals", category: "Drills", division: "All", duration: "20 min", modules: 8, progress: 0 },
  { id: "8", title: "Managing Parents & Expectations", category: "Communication", division: "All", duration: "20 min", modules: 3, progress: 0 },
  { id: "9", title: "Press Break Strategies", category: "Offence", division: "U12+", duration: "25 min", modules: 4, progress: 0 },
];

const categories = ["All", "Defence", "Offence", "Communication", "Development", "Drills"];

export default function CoachCoursesPage() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <BookOpen size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Education</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            COURSE <span className="text-cmba-red">LIBRARY</span>
          </h1>
          <p className="text-cmba-grey mt-2">Browse and complete education modules to progress your coaching certification.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto hide-scrollbar pb-2">
          <Filter size={16} className="text-cmba-grey-mid shrink-0" />
          {categories.map((cat) => (
            <button key={cat} className={`shrink-0 font-display font-bold text-xs uppercase tracking-wider px-3 py-1.5 transition-colors ${cat === "All" ? "bg-cmba-red text-white" : "bg-cmba-black-card border border-cmba-grey-dark/20 text-cmba-grey hover:text-cmba-red hover:border-cmba-red/30"}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Course Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Link key={course.id} href={`/coach/courses/${course.id}`} className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 transition-all card-hover group">
              <div className="aspect-video bg-cmba-black-surface relative flex items-center justify-center">
                <div className="w-12 h-12 bg-cmba-red/20 rounded-full flex items-center justify-center group-hover:bg-cmba-red/30 transition-colors">
                  <Play size={24} className="text-cmba-red ml-1" />
                </div>
                {course.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-cmba-grey-dark/30">
                    <div className="h-full bg-cmba-red" style={{ width: `${course.progress}%` }} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] bg-cmba-red/15 text-cmba-red px-1.5 py-0.5 uppercase">{course.category}</span>
                  <span className="font-mono text-[10px] text-cmba-grey-mid">{course.division}</span>
                </div>
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wide leading-tight mb-2 group-hover:text-cmba-red transition-colors">
                  {course.title}
                </h3>
                <div className="flex items-center justify-between text-cmba-grey-mid">
                  <span className="font-mono text-[10px] flex items-center gap-1"><Clock size={10} />{course.duration}</span>
                  <span className="font-mono text-[10px]">{course.modules} modules</span>
                  {course.progress > 0 && <span className="font-display font-bold text-[10px] text-cmba-red">{course.progress}%</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
