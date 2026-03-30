"use client";

import { useState } from "react";
import { BookOpen, Clock, ExternalLink, Filter, CheckCircle, Zap } from "lucide-react";

interface Course {
  id: string;
  title: string;
  category: string;
  audience: string;
  duration: string;
  modules: number;
  progress: number;
  mandatory: boolean;
  url: string;
  description: string;
  xp: number;
}

const courses: Course[] = [
  {
    id: "55ed3dd3",
    title: "CMBA Coach Training",
    category: "Mandatory",
    audience: "All Coaches",
    duration: "2-3 hrs",
    modules: 8,
    progress: 100,
    mandatory: true,
    url: "https://cmba.reach360.com/share/course/55ed3dd3-87dc-44e0-b300-2fb0e60ec743",
    description: "CMBA philosophy, LTAD model, Read & React Offense, Point Guard College concepts, practice planning, and conduct expectations.",
    xp: 150,
  },
  {
    id: "fc129e16",
    title: "Safe CMBA Interactions",
    category: "Safe Sport",
    audience: "All Participants",
    duration: "1-2 hrs",
    modules: 6,
    progress: 100,
    mandatory: true,
    url: "https://cmba.reach360.com/share/course/fc129e16-b677-4be8-b2ab-733ade3ee23a",
    description: "Rule of Two, codes of conduct, equity/diversity/inclusion policies, concussion awareness, and reporting.",
    xp: 150,
  },
  {
    id: "4f3c4927",
    title: "Managing the Moment",
    category: "Game Management",
    audience: "Coaches (U9-U18)",
    duration: "2-3 hrs",
    modules: 7,
    progress: 30,
    mandatory: false,
    url: "https://cmba.reach360.com/share/course/4f3c4927-d3cc-410f-a7ac-cf7347c410c5",
    description: "Sideline leadership during high-pressure games. Coach self-regulation, preparing athletes, managing external pressure, and the S.I.M.P.L.E. reset system.",
    xp: 150,
  },
  {
    id: "60269d65",
    title: "Spectator Training",
    category: "Parent Education",
    audience: "Parents & Spectators",
    duration: "30-45 min",
    modules: 5,
    progress: 0,
    mandatory: false,
    url: "https://cmba.reach360.com/share/course/60269d65-63f4-4edb-9a9f-8d01d170025c",
    description: "Sideline behaviour, understanding officials, conversations in the car, and handling disagreements through proper channels.",
    xp: 100,
  },
  {
    id: "2adf207a",
    title: "Intro to Officiating CMBA",
    category: "Officiating",
    audience: "New Officials",
    duration: "1-2 hrs",
    modules: 6,
    progress: 0,
    mandatory: false,
    url: "https://cmba.reach360.com/share/course/2adf207a-4b56-48dd-9154-f671aa5ddbd8",
    description: "Foundation course for new officials — basic rules, signals, 2-official mechanics, and CMBA-specific rule modifications by division.",
    xp: 150,
  },
  {
    id: "nccp-med",
    title: "NCCP Make Ethical Decisions",
    category: "Ethics",
    audience: "All Coaches",
    duration: "3-4 hrs",
    modules: 5,
    progress: 100,
    mandatory: true,
    url: "https://coach.ca/nccp-make-ethical-decisions",
    description: "Canada-wide coaching ethics requirement via the Coaching Association of Canada. Decision-making framework for ethical coaching.",
    xp: 150,
  },
];

const categories = ["All", "Mandatory", "Safe Sport", "Game Management", "Parent Education", "Officiating", "Ethics"];

export default function CoachCoursesPage() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredCourses = activeFilter === "All"
    ? courses
    : courses.filter((c) => c.category === activeFilter);

  const totalXP = courses.filter((c) => c.progress === 100).reduce((sum, c) => sum + c.xp, 0);

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
          <p className="text-cmba-grey mt-2">Complete courses to progress your certification and earn XP. All courses link directly to CMBA&apos;s official training platform.</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-cmba-red/5 border border-cmba-red/20 px-3 py-2">
            <Zap size={14} className="text-cmba-red" />
            <span className="font-mono text-xs text-cmba-red">{totalXP} XP earned from completed courses</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto hide-scrollbar pb-2">
          <Filter size={16} className="text-cmba-grey-mid shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`shrink-0 font-display font-bold text-xs uppercase tracking-wider px-3 py-1.5 transition-colors ${activeFilter === cat ? "bg-cmba-red text-white" : "bg-cmba-black-card border border-cmba-grey-dark/20 text-cmba-grey hover:text-cmba-red hover:border-cmba-red/30"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Course Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course) => (
            <a
              key={course.id}
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 transition-all card-hover group block"
            >
              <div className="aspect-video bg-cmba-black-surface relative flex items-center justify-center">
                {course.progress === 100 ? (
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle size={30} className="text-green-400" />
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-cmba-red/20 rounded-full flex items-center justify-center group-hover:bg-cmba-red/30 transition-colors">
                    <ExternalLink size={24} className="text-cmba-red" />
                  </div>
                )}
                {course.progress > 0 && course.progress < 100 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-cmba-grey-dark/30">
                    <div className="h-full bg-cmba-red" style={{ width: `${course.progress}%` }} />
                  </div>
                )}
                {course.progress === 100 && (
                  <div className="absolute top-3 right-3 font-mono text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 border border-green-500/30">
                    Complete
                  </div>
                )}
                {course.mandatory && (
                  <div className="absolute top-3 left-3 font-mono text-[10px] bg-cmba-red/20 text-cmba-red px-2 py-0.5 border border-cmba-red/30">
                    Required
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] bg-cmba-red/15 text-cmba-red px-1.5 py-0.5 uppercase">{course.category}</span>
                  <span className="font-mono text-[10px] text-cmba-grey-mid">{course.audience}</span>
                </div>
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wide leading-tight mb-2 group-hover:text-cmba-red transition-colors">
                  {course.title}
                </h3>
                <p className="text-xs text-cmba-grey leading-relaxed mb-3 line-clamp-2">{course.description}</p>
                <div className="flex items-center justify-between text-cmba-grey-mid">
                  <span className="font-mono text-[10px] flex items-center gap-1"><Clock size={10} />{course.duration}</span>
                  <span className="font-mono text-[10px]">{course.modules} modules</span>
                  <span className="font-mono text-[10px] text-cmba-red flex items-center gap-1"><Zap size={10} />+{course.xp} XP</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
