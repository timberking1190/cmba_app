import { Mail, MapPin, ExternalLink } from "lucide-react";

const boardMembers = [
  { name: "CMBA President", person: "Position TBD", email: "president@cmba.ab.ca", phone: "" },
  { name: "Vice President", person: "Position TBD", email: "vp@cmba.ab.ca", phone: "" },
  { name: "Registrar", person: "Position TBD", email: "registrar@cmba.ab.ca", phone: "" },
  { name: "Treasurer", person: "Position TBD", email: "treasurer@cmba.ab.ca", phone: "" },
  { name: "Officials Assignor", person: "Position TBD", email: "officials@cmba.ab.ca", phone: "" },
  { name: "Coach Coordinator", person: "Position TBD", email: "coaches@cmba.ab.ca", phone: "" },
  { name: "Discipline Chair", person: "Position TBD", email: "discipline@cmba.ab.ca", phone: "" },
  { name: "Communications", person: "Position TBD", email: "info@cmba.ab.ca", phone: "" },
];

const divisionReps = [
  { division: "U8", name: "Rep TBD", email: "u8@cmba.ab.ca" },
  { division: "U10", name: "Rep TBD", email: "u10@cmba.ab.ca" },
  { division: "U12", name: "Rep TBD", email: "u12@cmba.ab.ca" },
  { division: "U14", name: "Rep TBD", email: "u14@cmba.ab.ca" },
  { division: "U16", name: "Rep TBD", email: "u16@cmba.ab.ca" },
  { division: "U18", name: "Rep TBD", email: "u18@cmba.ab.ca" },
];

export default function ContactPage() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            CONTACT <span className="text-cmba-red">DIRECTORY</span>
          </h1>
          <p className="text-cmba-grey mt-2">Reach the right person at CMBA. All email addresses below are direct links.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {/* General Contact */}
        <div className="bg-cmba-black-card border border-cmba-red/30 p-6 mb-8">
          <h2 className="font-display font-bold text-lg text-cmba-red uppercase tracking-wider mb-4">General Contact</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-cmba-red" />
              <div>
                <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Email</div>
                <a href="mailto:info@cmba.ab.ca" className="text-sm text-cmba-grey-light hover:text-cmba-red transition-colors">info@cmba.ab.ca</a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-cmba-red" />
              <div>
                <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Location</div>
                <span className="text-sm text-cmba-grey-light">Calgary, Alberta</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ExternalLink size={18} className="text-cmba-red" />
              <div>
                <div className="font-mono text-[10px] text-cmba-grey-mid uppercase">Website</div>
                <a href="https://cmba.ab.ca" target="_blank" rel="noopener noreferrer" className="text-sm text-cmba-grey-light hover:text-cmba-red transition-colors">cmba.ab.ca</a>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Board Members */}
          <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
            <div className="px-6 py-4 border-b border-cmba-grey-dark/20">
              <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">Board & Staff</h2>
            </div>
            <div className="divide-y divide-cmba-grey-dark/10">
              {boardMembers.map((member) => (
                <div key={member.name} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">{member.name}</h3>
                    <p className="font-mono text-[10px] text-cmba-grey-mid">{member.person}</p>
                  </div>
                  <a href={`mailto:${member.email}`} className="flex items-center gap-1 font-mono text-xs text-cmba-red hover:text-cmba-red-dark transition-colors">
                    <Mail size={12} />{member.email}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Division Reps */}
          <div className="bg-cmba-black-card border border-cmba-grey-dark/20">
            <div className="px-6 py-4 border-b border-cmba-grey-dark/20">
              <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">Division Representatives</h2>
            </div>
            <div className="divide-y divide-cmba-grey-dark/10">
              {divisionReps.map((rep) => (
                <div key={rep.division} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-black text-lg text-cmba-red">{rep.division}</span>
                    <span className="font-mono text-[10px] text-cmba-grey-mid">{rep.name}</span>
                  </div>
                  <a href={`mailto:${rep.email}`} className="flex items-center gap-1 font-mono text-xs text-cmba-red hover:text-cmba-red-dark transition-colors">
                    <Mail size={12} />{rep.email}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
