"use client";

import { useState } from "react";
import { BookOpen, Clock, ExternalLink, Filter, CheckCircle, Zap } from "lucide-react";

export type CourseCard = {
  id: number | string;
  title: string;
  category: string;
  audience?: string | null;
  duration?: string | null;
  modules: number;
  mandatory: boolean;
  url?: string | null;
  description?: string | null;
  completed: boolean;
};

export function CourseLibrary({ courses, signedIn }: { courses: CourseCard[]; signedIn: boolean }) {
  const categories = ["All", ...Array.from(new Set(courses.map((c) => c.category)))];
  const [activeFilter, setActiveFilter] = useState("All");
  const filtered = activeFilter === "All" ? courses : courses.filter((c) => c.category === activeFilter);
  const completedCount = courses.filter((c) => c.completed).length;

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
          <p className="text-cmba-grey mt-2">Complete courses to progress your certification. All courses link directly to CMBA&apos;s official training platform.</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-cmba-red/5 border border-cmba-red/20 px-3 py-2">
            <Zap size={14} className="text-cmba-red" />
            <span className="font-mono text-xs text-cmba-red">
              {signedIn ? `${completedCount} of ${courses.length} complete` : "Sign in to track your completion"}
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        <div className="flex items-center gap-2 mb-8 overflow-x-auto hide-scrollbar pb-2">
          <Filter size={16} className="text-cmba-grey-mid shrink-0" />
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveFilter(cat)}
              className={`shrink-0 font-display font-bold text-xs uppercase tracking-wider px-3 py-1.5 transition-colors ${activeFilter === cat ? "bg-cmba-red text-white" : "bg-cmba-black-card border border-cmba-grey-dark/20 text-cmba-grey hover:text-cmba-red hover:border-cmba-red/30"}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <a key={course.id} href={course.url ?? "#"} target="_blank" rel="noopener noreferrer"
              className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 transition-all card-hover group block">
              <div className="aspect-video bg-cmba-black-surface relative flex items-center justify-center">
                {course.completed ? (
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle size={30} className="text-green-400" />
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-cmba-red/20 rounded-full flex items-center justify-center group-hover:bg-cmba-red/30 transition-colors">
                    <ExternalLink size={24} className="text-cmba-red" />
                  </div>
                )}
                {course.completed && (
                  <div className="absolute top-3 right-3 font-mono text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 border border-green-500/30">Complete</div>
                )}
                {course.mandatory && (
                  <div className="absolute top-3 left-3 font-mono text-[10px] bg-cmba-red/20 text-cmba-red px-2 py-0.5 border border-cmba-red/30">Required</div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] bg-cmba-red/15 text-cmba-red px-1.5 py-0.5 uppercase">{course.category}</span>
                  {course.audience && <span className="font-mono text-[10px] text-cmba-grey-mid">{course.audience}</span>}
                </div>
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wide leading-tight mb-2 group-hover:text-cmba-red transition-colors">{course.title}</h3>
                {course.description && <p className="text-xs text-cmba-grey leading-relaxed mb-3 line-clamp-2">{course.description}</p>}
                <div className="flex items-center justify-between text-cmba-grey-mid">
                  {course.duration ? <span className="font-mono text-[10px] flex items-center gap-1"><Clock size={10} />{course.duration}</span> : <span />}
                  {course.modules > 0 && <span className="font-mono text-[10px]">{course.modules} modules</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
