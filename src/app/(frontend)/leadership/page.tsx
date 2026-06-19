import type { Metadata } from 'next'
import Link from 'next/link'
import { Gavel, Users, Mail, Phone, MapPin, ShieldCheck, ArrowRight } from 'lucide-react'

import { CMBA } from '@/lib/cmbaLinks'

export const metadata: Metadata = {
  title: 'Leadership, Board & Committees | CMBA Connect',
  description: 'The Calgary Minor Basketball Association executive, board of directors, and committee chairs.',
}

/*
 * Native Leadership page (recreated from CMBA's published board info, replacing
 * the cmba.ab.ca link). Roster is current as of the last update; move to a CMS
 * collection if frequent edits are needed.
 */
const executive = [
  { name: 'Ken King', role: 'Executive Director' },
  { name: 'Carey Blaskin', role: 'President · Rules Committee Chair' },
  { name: 'Andrew Gustafson', role: '1st Vice President · SCC Oversight Chair' },
  { name: 'Clark Schow', role: '2nd Vice President · Coach Development Chair' },
  { name: 'Mike Myers', role: '3rd Vice President' },
  { name: 'Steve Winkleman', role: 'Treasurer · Finance & Audit Committee Chair' },
  { name: 'Reid Morteson', role: 'Referee Committee Chair' },
]

const board = [
  { club: 'Calgary Northwest Basketball', president: 'Kevin Johnson' },
  { club: 'NCBC Thunder Basketball', president: 'Stephen Kerr' },
  { club: 'East Pro Basketball', president: 'Nardine Cain' },
  { club: 'Calwest Basketball', president: 'Mark Rideout' },
  { club: 'South Calgary Basketball', president: 'Tyler Davidson' },
  { club: 'Bow River Basketball', president: 'Sherry Cramer' },
  { club: 'Cochrane Basketball', president: 'Colin Gustafson' },
  { club: 'Airdrie Basketball', president: 'Scott Mitchell' },
  { club: 'CLS (Chestermere, Langdon, Strathmore)', president: 'Jeff Harris' },
  { club: 'Okotoks Basketball', president: 'Blake Husky' },
  { club: 'South Stoney Basketball Association', president: 'Todd Mohorich' },
]

const committees = [
  { name: 'Rules Committee', lead: 'Carey Blaskin' },
  { name: 'Sportsmanship & Conduct (SCC) Oversight', lead: 'Andrew Gustafson' },
  { name: 'Coach Development', lead: 'Clark Schow' },
  { name: 'Finance & Audit', lead: 'Steve Winkleman' },
  { name: 'Referee Committee', lead: 'Reid Morteson' },
]

const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('')

export default function LeadershipPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient border-b-2 border-cmba-red">
        <div className="absolute -left-16 -top-10 w-72 h-72 rounded-full bg-cmba-red/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-12 lg:py-16">
          <div className="inline-flex items-center gap-2 bg-cmba-red/10 border border-cmba-red/30 px-3 py-1 mb-4 animate-slide-up">
            <Gavel size={14} className="text-cmba-red" />
            <span className="font-display font-bold text-xs text-cmba-red uppercase tracking-widest">Governance</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[0.95] animate-slide-up">
            Leadership &amp; <span className="text-cmba-red">Board</span>
          </h1>
          <p className="text-cmba-grey mt-3 max-w-2xl animate-slide-up">
            The people who run Calgary Minor Basketball — the executive, member-club board of directors, and committee chairs.
          </p>
        </div>
      </section>

      {/* Executive */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck size={18} className="text-cmba-red" />
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">Executive</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {executive.map((e, i) => (
            <div key={e.name} className="bg-cmba-black-card border border-white/12 p-4 flex items-center gap-4 card-hover animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="w-12 h-12 shrink-0 rounded-full bg-cmba-red/15 border border-cmba-red/30 flex items-center justify-center font-display font-black text-cmba-red">
                {initials(e.name)}
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-white text-sm truncate">{e.name}</div>
                <div className="text-xs text-cmba-grey leading-snug">{e.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Board of Directors */}
      <section className="bg-cmba-black-light border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="flex items-center gap-2 mb-6">
            <Users size={18} className="text-cmba-red" />
            <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">Board of Directors</h2>
            <span className="font-mono text-[10px] text-cmba-grey-mid uppercase tracking-wider ml-2">Member-club presidents</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {board.map((b, i) => (
              <div key={b.club} className="bg-cmba-black-card border border-white/12 p-4 card-hover animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="font-display font-bold text-white uppercase tracking-wide text-sm leading-tight">{b.club}</div>
                <div className="text-xs text-cmba-grey mt-1">{b.president} · President</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Committees */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-6">Committees</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {committees.map((c) => (
            <div key={c.name} className="bg-cmba-black-card border border-white/12 p-4 card-hover">
              <div className="font-display font-bold text-white text-sm">{c.name}</div>
              <div className="text-xs text-cmba-grey mt-1">Chair: {c.lead}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="bg-cmba-black-light border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 grid md:grid-cols-3 gap-4">
          <a href={CMBA.emailHref} className="bg-cmba-black-card border border-white/12 p-5 card-hover group">
            <Mail size={18} className="text-cmba-red mb-2" />
            <div className="font-display font-bold text-white text-sm uppercase tracking-wide group-hover:text-cmba-red transition-colors">Email</div>
            <div className="text-xs text-cmba-grey mt-1">{CMBA.email}</div>
          </a>
          <a href={CMBA.phoneHref} className="bg-cmba-black-card border border-white/12 p-5 card-hover group">
            <Phone size={18} className="text-cmba-red mb-2" />
            <div className="font-display font-bold text-white text-sm uppercase tracking-wide group-hover:text-cmba-red transition-colors">Phone</div>
            <div className="text-xs text-cmba-grey mt-1">{CMBA.phone}</div>
          </a>
          <div className="bg-cmba-black-card border border-white/12 p-5">
            <MapPin size={18} className="text-cmba-red mb-2" />
            <div className="font-display font-bold text-white text-sm uppercase tracking-wide">Mailing address</div>
            <div className="text-xs text-cmba-grey mt-1">{CMBA.address}</div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-10">
          <Link href="/contact" className="inline-flex items-center gap-2 font-mono text-xs text-cmba-red hover:text-white uppercase tracking-wider transition-colors">
            Full contact directory <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  )
}
