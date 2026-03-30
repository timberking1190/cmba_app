import { Calendar, MapPin, Users, Clock, CheckCircle, DollarSign } from "lucide-react";

const clinics = [
  { id: 1, title: "Spring Coaching Development Clinic", date: "Apr 12, 2025", time: "9:00 AM - 12:00 PM", location: "Cardel Rec South", capacity: 30, registered: 22, cost: 0, certCredit: "Community Coach", target: "Coaches", registered_user: true },
  { id: 2, title: "Offensive Sets for U14+", date: "Apr 26, 2025", time: "10:00 AM - 1:00 PM", location: "Shouldice Arena", capacity: 25, registered: 10, cost: 0, certCredit: "Trained Coach", target: "Coaches", registered_user: false },
  { id: 3, title: "Referee Development Day", date: "Apr 5, 2025", time: "9:00 AM - 3:00 PM", location: "Trico Centre", capacity: 40, registered: 28, cost: 0, certCredit: "RAMP Intermediate", target: "Referees", registered_user: false },
  { id: 4, title: "First Aid & Injury Prevention", date: "May 3, 2025", time: "1:00 PM - 4:00 PM", location: "CMBA Office", capacity: 20, registered: 5, cost: 25, certCredit: "All Levels", target: "Both", registered_user: false },
  { id: 5, title: "End-of-Season Coach Forum", date: "May 17, 2025", time: "10:00 AM - 12:00 PM", location: "Virtual (Zoom)", capacity: 100, registered: 12, cost: 0, certCredit: "All Levels", target: "Coaches", registered_user: false },
];

export default function ClinicsPage() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4">
            <Calendar size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Events</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            CLINICS & <span className="text-cmba-red">WORKSHOPS</span>
          </h1>
          <p className="text-cmba-grey mt-2">Register for upcoming development sessions. Many count toward certification requirements.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-4">
        {clinics.map((clinic) => (
          <div key={clinic.id} className="bg-cmba-black-card border border-cmba-grey-dark/20 hover:border-cmba-red/30 transition-colors">
            <div className="flex flex-col lg:flex-row">
              <div className="lg:w-32 bg-cmba-red/10 flex flex-col items-center justify-center p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-cmba-grey-dark/10">
                <div className="font-display font-black text-2xl text-cmba-red leading-none">{clinic.date.split(" ")[1].replace(",", "")}</div>
                <div className="font-display font-bold text-xs text-cmba-grey uppercase tracking-wider">{clinic.date.split(" ")[0]}</div>
              </div>
              <div className="flex-1 p-5 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-[10px] bg-cmba-red/15 text-cmba-red px-1.5 py-0.5 uppercase">{clinic.target}</span>
                      <span className="font-mono text-[10px] bg-white/10 text-cmba-grey px-1.5 py-0.5">{clinic.certCredit}</span>
                      {clinic.cost > 0 && <span className="font-mono text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 flex items-center gap-1"><DollarSign size={8} />${clinic.cost}</span>}
                    </div>
                    <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">{clinic.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-cmba-grey">
                      <span className="flex items-center gap-1"><Clock size={12} />{clinic.time}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} />{clinic.location}</span>
                      <span className="flex items-center gap-1"><Users size={12} />{clinic.registered}/{clinic.capacity} registered</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {clinic.registered_user ? (
                      <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 font-display font-bold text-xs uppercase tracking-wider px-4 py-2">
                        <CheckCircle size={14} />Registered
                      </span>
                    ) : (
                      <button className="bg-cmba-red hover:bg-cmba-red-dark text-white font-display font-bold text-xs uppercase tracking-wider px-5 py-2.5 transition-colors">
                        Register
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
