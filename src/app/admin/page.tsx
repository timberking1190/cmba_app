import Link from "next/link";
import {
  Users,
  Shield,
  Flag,
  FileText,
  Calendar,
  Bell,
  BarChart3,
  ClipboardList,
  ChevronRight,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

const quickStats = [
  { label: "Active Coaches", value: "182", change: "+12", icon: Shield, color: "text-cmba-red" },
  { label: "Active Referees", value: "74", change: "+5", icon: Flag, color: "text-blue-400" },
  { label: "Pending Certs", value: "8", change: "", icon: Clock, color: "text-yellow-400" },
  { label: "Open Reports", value: "3", change: "", icon: AlertCircle, color: "text-red-400" },
];

const adminLinks = [
  { label: "User Management", href: "/admin/users", icon: Users, desc: "View, edit, and manage all registered users" },
  { label: "Certification Queue", href: "/admin/certifications", icon: Shield, desc: "Approve or review pending certifications" },
  { label: "Content Manager", href: "/admin/content", icon: FileText, desc: "Edit courses, rules, and resources" },
  { label: "Clinic Management", href: "/admin/clinics", icon: Calendar, desc: "Create and manage clinics and events" },
  { label: "Announcements", href: "/admin/announcements", icon: Bell, desc: "Broadcast messages to users" },
  { label: "Game Reports", href: "/admin/game-reports", icon: ClipboardList, desc: "Review and triage game reports" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, desc: "Usage stats and AI Q&A insights" },
];

const recentReports = [
  { id: "CMBA-2025-0042", type: "concern", division: "U14 Boys", date: "Mar 28", status: "received" },
  { id: "CMBA-2025-0041", type: "compliment", division: "U12 Girls", date: "Mar 27", status: "received" },
  { id: "CMBA-2025-0040", type: "concern", division: "U16 Boys", date: "Mar 26", status: "under_review" },
];

const pendingCerts = [
  { name: "Mike Johnson", type: "NCCP Community Coach", submitted: "Mar 25" },
  { name: "Sarah Lee", type: "RAMP Basic", submitted: "Mar 24" },
  { name: "Tom Wilson", type: "NCCP Community Coach", submitted: "Mar 22" },
];

export default function AdminDashboard() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            ADMIN <span className="text-cmba-red">DASHBOARD</span>
          </h1>
          <p className="text-cmba-grey mt-2">Manage users, content, certifications, and game reports.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat) => (
            <div key={stat.label} className="bg-cmba-black-card border border-cmba-grey-dark/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <stat.icon size={20} className={stat.color} />
                {stat.change && (
                  <span className="flex items-center gap-0.5 font-mono text-[10px] text-green-400">
                    <TrendingUp size={10} />{stat.change}
                  </span>
                )}
              </div>
              <div className="font-display font-black text-3xl text-white">{stat.value}</div>
              <div className="font-display font-bold text-[10px] text-cmba-grey-mid uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Admin Navigation */}
            <div className="grid sm:grid-cols-2 gap-3">
              {adminLinks.map((link) => (
                <Link key={link.href} href={link.href} className="flex items-center gap-4 bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 p-4 transition-all card-hover group">
                  <div className="w-10 h-10 bg-cmba-red/10 flex items-center justify-center shrink-0">
                    <link.icon size={20} className="text-cmba-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">{link.label}</h3>
                    <p className="text-xs text-cmba-grey truncate">{link.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-cmba-grey-dark shrink-0" />
                </Link>
              ))}
            </div>

            {/* Recent Game Reports */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="flex items-center justify-between px-6 py-4 border-b border-cmba-grey-dark/20">
                <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">Recent Game Reports</h2>
                <Link href="/admin/game-reports" className="text-xs text-cmba-red font-display font-bold uppercase tracking-wider flex items-center gap-1">
                  View All <ChevronRight size={14} />
                </Link>
              </div>
              <div className="divide-y divide-cmba-grey-dark/10">
                {recentReports.map((report) => (
                  <div key={report.id} className="flex items-center gap-4 px-6 py-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${report.type === "concern" ? "bg-red-400" : "bg-green-400"}`} />
                    <span className="font-mono text-xs text-cmba-grey-light">{report.id}</span>
                    <span className="font-mono text-[10px] bg-cmba-red/15 text-cmba-red px-1.5 py-0.5 uppercase">{report.type}</span>
                    <span className="text-xs text-cmba-grey">{report.division}</span>
                    <span className="font-mono text-[10px] text-cmba-grey-mid ml-auto">{report.date}</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 uppercase ${report.status === "received" ? "bg-yellow-500/15 text-yellow-400" : "bg-blue-500/15 text-blue-400"}`}>
                      {report.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pending Certifications */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
              <div className="px-5 py-3 border-b border-cmba-grey-dark/20">
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} className="text-yellow-400" />Pending Certifications
                </h3>
              </div>
              <div className="divide-y divide-cmba-grey-dark/10">
                {pendingCerts.map((cert) => (
                  <div key={cert.name} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-xs text-white uppercase">{cert.name}</h4>
                      <button className="font-mono text-[10px] text-cmba-red hover:text-cmba-red-dark">Review</button>
                    </div>
                    <p className="font-mono text-[10px] text-cmba-grey-mid mt-0.5">{cert.type} · Submitted {cert.submitted}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-cmba-black-card border border-cmba-grey-dark/20 p-5 space-y-2">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-3">Quick Actions</h3>
              <button className="w-full text-left flex items-center gap-2 text-xs text-cmba-grey hover:text-cmba-red transition-colors py-1">
                <Bell size={14} className="text-cmba-red/50" />Send Announcement
              </button>
              <button className="w-full text-left flex items-center gap-2 text-xs text-cmba-grey hover:text-cmba-red transition-colors py-1">
                <Calendar size={14} className="text-cmba-red/50" />Create Clinic
              </button>
              <button className="w-full text-left flex items-center gap-2 text-xs text-cmba-grey hover:text-cmba-red transition-colors py-1">
                <FileText size={14} className="text-cmba-red/50" />Add Course Module
              </button>
              <button className="w-full text-left flex items-center gap-2 text-xs text-cmba-grey hover:text-cmba-red transition-colors py-1">
                <Users size={14} className="text-cmba-red/50" />Invite User
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
