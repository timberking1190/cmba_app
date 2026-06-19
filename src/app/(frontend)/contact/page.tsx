import Link from "next/link";
import { Mail, MapPin, Phone, ExternalLink, Clock, Camera, Share2, Video, Users } from "lucide-react";
import { CMBA, DOCS } from "@/lib/cmbaLinks";

const directory = [
  { label: "General League Inquiries", desc: "Registration, schedules, and everything else", href: CMBA.emailHref, value: CMBA.email },
  { label: "Executive & Board Contacts", desc: "President, registrar, age-group directors, and committees", href: DOCS.boardContacts, value: "View directory", external: true },
  { label: "CMBA Leadership", desc: "Board, executive, and committee structure", href: DOCS.leadership, value: "View leadership", external: true },
];

const social = [
  { label: "Instagram", handle: "@cmbabasketball", href: CMBA.social.instagram, icon: Camera },
  { label: "Facebook", handle: "calgaryminorbasketball", href: CMBA.social.facebook, icon: Share2 },
  { label: "YouTube", handle: "CMBA Channel", href: CMBA.social.youtube, icon: Video },
];

export default function ContactPage() {
  return (
    <div>
      <section className="bg-hero-gradient border-b-2 border-cmba-red">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95]">
            CONTACT <span className="text-cmba-red">CMBA</span>
          </h1>
          <p className="text-cmba-grey mt-2 max-w-xl">
            Calgary Minor Basketball Association. The league office handles registration, schedules, and general inquiries.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {/* Primary contact */}
        <div className="grid md:grid-cols-3 gap-px bg-white/12 border border-white/12 mb-8">
          <a href={CMBA.emailHref} className="bg-cmba-black/80 backdrop-blur-sm p-6 group">
            <Mail size={20} className="text-cmba-red mb-3" />
            <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-widest">Email</div>
            <div className="text-sm text-white group-hover:text-cmba-red transition-colors mt-1">{CMBA.email}</div>
          </a>
          <a href={CMBA.phoneHref} className="bg-cmba-black/80 backdrop-blur-sm p-6 group">
            <Phone size={20} className="text-cmba-red mb-3" />
            <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-widest">Phone (voicemail)</div>
            <div className="text-sm text-white group-hover:text-cmba-red transition-colors mt-1">{CMBA.phone}</div>
          </a>
          <div className="bg-cmba-black/80 backdrop-blur-sm p-6">
            <MapPin size={20} className="text-cmba-red mb-3" />
            <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-widest">Mailing Address</div>
            <div className="text-sm text-cmba-grey-light mt-1">{CMBA.address}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Directory */}
          <div className="bg-cmba-black/80 backdrop-blur-sm border border-white/12">
            <div className="px-6 py-4 border-b border-white/12 flex items-center gap-2">
              <Users size={16} className="text-cmba-red" />
              <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">Who to Contact</h2>
            </div>
            <div className="divide-y divide-white/10">
              {directory.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="flex items-center justify-between gap-4 px-6 py-4 group"
                >
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider group-hover:text-cmba-red transition-colors">{item.label}</h3>
                    <p className="text-xs text-cmba-grey mt-0.5">{item.desc}</p>
                  </div>
                  <span className="flex items-center gap-1 font-mono text-xs text-cmba-red shrink-0">
                    {item.value}{item.external && <ExternalLink size={12} />}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Hours + social */}
          <div className="space-y-6">
            <div className="bg-cmba-black/80 backdrop-blur-sm border border-white/12">
              <div className="px-6 py-4 border-b border-white/12 flex items-center gap-2">
                <Clock size={16} className="text-cmba-red" />
                <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">Office Hours</h2>
              </div>
              <div className="divide-y divide-white/10">
                {CMBA.officeHours.map((row) => (
                  <div key={row.day} className="flex items-center justify-between gap-3 px-6 py-2.5">
                    <span className="text-sm text-cmba-grey-light">{row.day}</span>
                    <span className="font-mono text-xs text-cmba-grey text-right shrink-0">{row.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-cmba-black/80 backdrop-blur-sm border border-white/12 p-6">
              <h2 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">Follow CMBA</h2>
              <div className="flex flex-wrap gap-3">
                {social.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 border border-white/12 hover:border-cmba-red/60 px-4 py-2.5 transition-colors group"
                  >
                    <s.icon size={16} className="text-cmba-red" />
                    <span className="text-xs text-cmba-grey-light group-hover:text-white transition-colors">{s.handle}</span>
                  </a>
                ))}
              </div>
              <Link href="/resources" className="inline-flex items-center gap-1.5 mt-5 font-mono text-xs text-cmba-red hover:text-white transition-colors">
                <ExternalLink size={12} /> League resources
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
