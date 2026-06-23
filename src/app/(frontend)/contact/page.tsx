import Link from "next/link";
import { Mail, MapPin, Phone, ExternalLink, Clock, Camera, Share2, Video, Users } from "lucide-react";
import { CMBA, DOCS } from "@/lib/cmbaLinks";
import { PhotoHero } from "@/components/media/PhotoHero";
import { PhotoBand } from "@/components/media/PhotoBand";
import { CourtLines } from "@/components/graphics/CourtLines";
import { CalgarySkyline } from "@/components/graphics/CalgarySkyline";

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
      <PhotoHero
        image="skylineSunset"
        eyebrow="Calgary Minor Basketball"
        title="Contact"
        accent="CMBA"
        subtitle="Calgary Minor Basketball Association. The league office handles registration, schedules, and general inquiries."
      >
        <div className="flex flex-wrap gap-3">
          <a href={CMBA.emailHref}
            className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors">
            <Mail size={16} /> Email the Office
          </a>
          <a href={CMBA.phoneHref}
            className="inline-flex items-center gap-2 border border-white/30 text-white hover:border-cmba-red hover:text-cmba-red font-display font-bold text-sm uppercase tracking-wider px-5 py-3 transition-colors backdrop-blur-sm">
            <Phone size={16} /> Call Voicemail
          </a>
        </div>
      </PhotoHero>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        {/* Primary contact */}
        <div className="relative mb-8">
          <CourtLines className="pointer-events-none absolute -top-8 right-0 w-64 text-cmba-red/[0.06] hidden lg:block" />
          <div className="grid md:grid-cols-3 gap-px bg-white/12 border border-white/12">
            <a href={CMBA.emailHref} style={{ transitionDelay: "0ms" }} className="reveal rv-scale bg-cmba-black/80 backdrop-blur-sm p-6 group">
              <Mail size={20} className="text-cmba-red mb-3" />
              <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-widest">Email</div>
              <div className="text-sm text-white group-hover:text-cmba-red transition-colors mt-1">{CMBA.email}</div>
            </a>
            <a href={CMBA.phoneHref} style={{ transitionDelay: "60ms" }} className="reveal rv-scale bg-cmba-black/80 backdrop-blur-sm p-6 group">
              <Phone size={20} className="text-cmba-red mb-3" />
              <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-widest">Phone (voicemail)</div>
              <div className="text-sm text-white group-hover:text-cmba-red transition-colors mt-1">{CMBA.phone}</div>
            </a>
            <div style={{ transitionDelay: "120ms" }} className="reveal rv-scale bg-cmba-black/80 backdrop-blur-sm p-6">
              <MapPin size={20} className="text-cmba-red mb-3" />
              <div className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-widest">Mailing Address</div>
              <div className="text-sm text-cmba-grey-light mt-1">{CMBA.address}</div>
            </div>
          </div>
        </div>

        {/* Photo band */}
        <PhotoBand
          image="indoorGym"
          side="left"
          eyebrow="The league office"
          title="We're here to help"
          className="mb-8"
        >
          <p>From your first registration question to age-group placement and schedules, the CMBA office is the front door to Calgary minor basketball. Reach out by email or voicemail and we&apos;ll point you to the right person.</p>
        </PhotoBand>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Directory */}
          <div className="reveal rv-left bg-cmba-black/80 backdrop-blur-sm border border-white/12">
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
            <div className="reveal rv-right bg-cmba-black/80 backdrop-blur-sm border border-white/12">
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

            <div className="reveal rv-right bg-cmba-black/80 backdrop-blur-sm border border-white/12 p-6">
              <h2 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">Follow CMBA</h2>
              <div className="flex flex-wrap gap-3">
                {social.map((s, i) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ transitionDelay: `${i * 60}ms` }}
                    className="reveal rv-scale flex items-center gap-2 border border-white/12 hover:border-cmba-red/60 px-4 py-2.5 transition-colors group"
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

      {/* Faint skyline footer accent */}
      <div className="relative h-24 overflow-hidden" aria-hidden="true">
        <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-24 text-white/5" />
      </div>
    </div>
  );
}
