import Link from "next/link";
import Image from "next/image";
import {
  Trophy,
  BookOpen,
  Calendar,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle,
  Lock,
  Play,
  Star,
} from "lucide-react";

const certPathway = [
  {
    level: "Community Coach",
    status: "in_progress",
    progress: 65,
    modules: 8,
    completed: 5,
  },
  {
    level: "Trained Coach",
    status: "locked",
    progress: 0,
    modules: 12,
    completed: 0,
  },
  {
    level: "Developed Coach",
    status: "locked",
    progress: 0,
    modules: 15,
    completed: 0,
  },
];

const recentCourses = [
  {
    id: 1,
    title: "Defensive Fundamentals for Youth",
    category: "Defence",
    division: "U10-U12",
    progress: 80,
    duration: "45 min",
  },
  {
    id: 2,
    title: "Running a Fast Break Offence",
    category: "Offence",
    division: "U12-U14",
    progress: 30,
    duration: "35 min",
  },
  {
    id: 3,
    title: "Effective Communication with Players",
    category: "Communication",
    division: "All",
    progress: 0,
    duration: "25 min",
  },
];

const upcomingClinics = [
  {
    id: 1,
    title: "Spring Coaching Development Clinic",
    date: "Apr 12, 2025",
    time: "9:00 AM - 12:00 PM",
    location: "Cardel Rec South",
    spots: 8,
    registered: true,
  },
  {
    id: 2,
    title: "Offensive Sets for U14+",
    date: "Apr 26, 2025",
    time: "10:00 AM - 1:00 PM",
    location: "Shouldice Arena",
    spots: 15,
    registered: false,
  },
];

export default function CoachDashboard() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
                <Trophy size={14} className="text-cmba-red" />
                <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">
                  Coach Education Hub
                </span>
              </div>
              <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
                COACH <span className="text-cmba-red">DASHBOARD</span>
              </h1>
              <p className="text-cmba-grey mt-2">
                Track your certifications, continue courses, and register for clinics.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/coach/pathway"
                className="bg-cmba-red hover:bg-cmba-red-dark text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors"
              >
                View Pathway
              </Link>
              <Link
                href="/coach/courses"
                className="border border-cmba-grey-dark text-cmba-grey-light hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors"
              >
                All Courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Certification Progress */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="flex items-center justify-between px-6 py-4 border-b border-cmba-grey-dark/20">
                <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                  Certification Pathway
                </h2>
                <Link
                  href="/coach/pathway"
                  className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider flex items-center gap-1"
                >
                  Details <ChevronRight size={14} />
                </Link>
              </div>
              <div className="p-6 space-y-4">
                {certPathway.map((cert) => (
                  <div
                    key={cert.level}
                    className={`flex items-center gap-4 p-4 border ${
                      cert.status === "in_progress"
                        ? "border-cmba-red/30 bg-cmba-red/5"
                        : "border-cmba-grey-dark/10 opacity-50"
                    }`}
                  >
                    <div className="shrink-0">
                      {cert.status === "in_progress" ? (
                        <div className="w-10 h-10 bg-cmba-red/20 flex items-center justify-center">
                          <Play size={18} className="text-cmba-red" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-cmba-grey-dark/20 flex items-center justify-center">
                          <Lock size={18} className="text-cmba-grey-mid" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                        {cert.level}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-cmba-grey-dark/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cmba-red rounded-full transition-all"
                            style={{ width: `${cert.progress}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-cmba-grey-mid">
                          {cert.completed}/{cert.modules}
                        </span>
                      </div>
                    </div>
                    {cert.status === "in_progress" && (
                      <span className="font-display font-bold text-xs text-cmba-red bg-cmba-red/10 px-2 py-1 uppercase tracking-wider">
                        {cert.progress}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Courses */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="flex items-center justify-between px-6 py-4 border-b border-cmba-grey-dark/20">
                <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                  Continue Learning
                </h2>
                <Link
                  href="/coach/courses"
                  className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider flex items-center gap-1"
                >
                  All Courses <ChevronRight size={14} />
                </Link>
              </div>
              <div className="divide-y divide-cmba-grey-dark/10">
                {recentCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/coach/courses/${course.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-cmba-red/5 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-cmba-red/10 flex items-center justify-center shrink-0">
                      {course.progress > 0 ? (
                        <Play size={20} className="text-cmba-red" />
                      ) : (
                        <BookOpen size={20} className="text-cmba-grey" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-sm text-white uppercase tracking-wide truncate group-hover:text-cmba-red transition-colors">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-cmba-grey-mid bg-cmba-black-surface px-1.5 py-0.5">
                          {course.category}
                        </span>
                        <span className="font-mono text-[10px] text-cmba-grey-mid">
                          {course.division}
                        </span>
                        <span className="font-mono text-[10px] text-cmba-grey-mid flex items-center gap-1">
                          <Clock size={10} />
                          {course.duration}
                        </span>
                      </div>
                    </div>
                    {course.progress > 0 && (
                      <div className="text-right shrink-0">
                        <span className="font-display font-bold text-sm text-cmba-red">
                          {course.progress}%
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-6 text-center">
              <div className="w-16 h-16 bg-cmba-black-surface rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-cmba-red/30 overflow-hidden">
                <Image src="/cmba-logo.png" alt="CMBA" width={40} height={40} className="w-10 h-10" />
              </div>
              <h3 className="font-display font-bold text-lg text-white uppercase">
                John Doe
              </h3>
              <p className="text-xs text-cmba-grey-mid mt-1">
                Coach · U12 Division
              </p>
              <div className="flex justify-center gap-2 mt-3">
                <span className="font-mono text-[10px] bg-cmba-red/15 text-cmba-red px-2 py-1">
                  NCCP Community
                </span>
                <span className="font-mono text-[10px] bg-green-500/15 text-green-400 px-2 py-1">
                  Active
                </span>
              </div>
            </div>

            {/* Upcoming Clinics */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="px-5 py-3 border-b border-cmba-grey-dark/20">
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={16} className="text-cmba-red" />
                  Upcoming Clinics
                </h3>
              </div>
              <div className="divide-y divide-cmba-grey-dark/10">
                {upcomingClinics.map((clinic) => (
                  <div key={clinic.id} className="px-5 py-3">
                    <h4 className="font-display font-bold text-xs text-white uppercase tracking-wide">
                      {clinic.title}
                    </h4>
                    <div className="mt-1.5 space-y-0.5">
                      <p className="font-mono text-[10px] text-cmba-grey-mid">
                        {clinic.date} · {clinic.time}
                      </p>
                      <p className="font-mono text-[10px] text-cmba-grey-mid">
                        {clinic.location}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-cmba-grey-mid">
                        {clinic.spots} spots left
                      </span>
                      {clinic.registered ? (
                        <span className="flex items-center gap-1 font-mono text-[10px] text-green-400">
                          <CheckCircle size={10} /> Registered
                        </span>
                      ) : (
                        <button className="font-display font-bold text-[10px] text-cmba-red uppercase tracking-wider hover:text-cmba-red-dark">
                          Register
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-5 space-y-2">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-3">
                Quick Links
              </h3>
              {[
                { label: "Age Division Resources", href: "/coach", icon: FileText },
                { label: "Practice Plan Templates", href: "/coach", icon: FileText },
                { label: "Video Library", href: "/coach/courses", icon: Play },
                { label: "Coach Directory", href: "/contact", icon: Star },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-2 text-xs text-cmba-grey hover:text-cmba-red transition-colors"
                >
                  <link.icon size={14} className="text-cmba-red/50" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
