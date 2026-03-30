import { Calendar, MapPin, Clock } from "lucide-react";

const events = [
  { date: "Apr 5", day: "SAT", title: "Referee Development Day", type: "Clinic", time: "9:00 AM - 3:00 PM", location: "Trico Centre", target: "Referees" },
  { date: "Apr 12", day: "SAT", title: "Spring Coaching Development Clinic", type: "Clinic", time: "9:00 AM - 12:00 PM", location: "Cardel Rec South", target: "Coaches" },
  { date: "Apr 15", day: "TUE", title: "Board Meeting", type: "Admin", time: "7:00 PM", location: "CMBA Office", target: "Board" },
  { date: "Apr 26", day: "SAT", title: "Offensive Sets for U14+", type: "Clinic", time: "10:00 AM - 1:00 PM", location: "Shouldice Arena", target: "Coaches" },
  { date: "Apr 30", day: "WED", title: "Early Bird Registration Deadline", type: "Deadline", time: "11:59 PM", location: "Online", target: "All" },
  { date: "May 3", day: "SAT", title: "First Aid & Injury Prevention", type: "Clinic", time: "1:00 PM - 4:00 PM", location: "CMBA Office", target: "Both" },
  { date: "May 10", day: "SAT", title: "Season Wrap-Up Tournament — U12", type: "Tournament", time: "8:00 AM - 5:00 PM", location: "Various Gyms", target: "Players" },
  { date: "May 17", day: "SAT", title: "End-of-Season Coach Forum", type: "Meeting", time: "10:00 AM - 12:00 PM", location: "Virtual (Zoom)", target: "Coaches" },
  { date: "Jun 1", day: "SUN", title: "CMBA Awards Night", type: "Event", time: "6:00 PM - 9:00 PM", location: "TBD", target: "All" },
  { date: "Aug 25", day: "MON", title: "Fall Season Registration Opens", type: "Deadline", time: "12:00 AM", location: "Online", target: "All" },
  { date: "Sep 1", day: "MON", title: "Pre-Season Rules Quiz Opens", type: "Education", time: "Online", location: "CMBA Connect", target: "Referees" },
  { date: "Sep 15", day: "MON", title: "Fall Season Begins", type: "Season", time: "All Day", location: "Various Gyms", target: "All" },
];

const typeColors: Record<string, string> = {
  Clinic: "bg-cmba-red/15 text-cmba-red",
  Admin: "bg-purple-500/15 text-purple-400",
  Deadline: "bg-yellow-500/15 text-yellow-400",
  Tournament: "bg-blue-500/15 text-blue-400",
  Meeting: "bg-green-500/15 text-green-400",
  Event: "bg-orange-500/15 text-orange-400",
  Education: "bg-cyan-500/15 text-cyan-400",
  Season: "bg-cmba-red/15 text-cmba-red",
};

export default function CalendarPage() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <Calendar size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Season Calendar</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            SEASON <span className="text-cmba-red">CALENDAR</span>
          </h1>
          <p className="text-cmba-grey mt-2">Key dates, clinics, tournaments, and registration deadlines.</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-3">
        {events.map((event, i) => (
          <div key={i} className="flex bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 transition-colors">
            <div className="w-20 lg:w-24 bg-cmba-red/10 flex flex-col items-center justify-center p-3 shrink-0 border-r border-cmba-grey-dark/10">
              <div className="font-display font-black text-lg text-cmba-red leading-none">{event.date.split(" ")[1]}</div>
              <div className="font-display font-bold text-[10px] text-cmba-grey uppercase tracking-wider">{event.date.split(" ")[0]}</div>
              <div className="font-mono text-[10px] text-cmba-grey-mid mt-0.5">{event.day}</div>
            </div>
            <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 uppercase tracking-wider ${typeColors[event.type] || "bg-white/10 text-cmba-grey"}`}>
                    {event.type}
                  </span>
                  <span className="font-mono text-[10px] bg-white/10 text-cmba-grey px-1.5 py-0.5">{event.target}</span>
                </div>
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">{event.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-cmba-grey">
                  <span className="flex items-center gap-1"><Clock size={10} />{event.time}</span>
                  <span className="flex items-center gap-1"><MapPin size={10} />{event.location}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
