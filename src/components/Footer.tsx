import Link from "next/link";
import Image from "next/image";
import { Wordmark } from "@/components/Wordmark";

const footerSections = [
  {
    title: "CMBA+",
    links: [
      { label: "Rules & Info", href: "/rules" },
      { label: "Schedule", href: "/calendar" },
      { label: "Standings", href: "/standings" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact Directory", href: "/contact" },
    ],
  },
  {
    title: "Coaches",
    links: [
      { label: "Coach Hub", href: "/coach" },
      { label: "Certification Pathway", href: "/coach/pathway" },
      { label: "Education Courses", href: "/coach/courses" },
      { label: "Clinics & Workshops", href: "/coach/clinics" },
    ],
  },
  {
    title: "Referees",
    links: [
      { label: "Referee Hub", href: "/ref" },
      { label: "Quick Reference", href: "/ref/quick-ref" },
      { label: "Signals Guide", href: "/ref/signals" },
    ],
  },
  {
    title: "Organization",
    links: [
      { label: "Game Reports", href: "/game-report" },
      { label: "League Operations", href: "/resources" },
      { label: "Sign In", href: "/login" },
    ],
  },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Guardian Consent", href: "/guardian-consent" },
];

export function Footer() {
  return (
    <footer className="hidden lg:block relative z-10 bg-cmba-black/85 backdrop-blur-xl border-t border-cmba-red/60">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-4 gap-8">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-mono font-medium text-[11px] text-cmba-red uppercase tracking-[0.18em] mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}
                      className="text-sm text-cmba-grey hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/cmba-logo-sm.png" alt="CMBA" width={120} height={48} className="h-10 w-auto" />
            <Wordmark className="font-display font-black text-white text-2xl uppercase leading-none tracking-tight" />
          </div>
          <div className="text-xs text-cmba-grey-mid text-center md:text-right">
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center md:justify-end mb-2">
              {legalLinks.map((l) => (
                <Link key={l.href} href={l.href} className="text-cmba-grey hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
            &copy; {new Date().getFullYear()} Calgary Minor Basketball Association. All rights reserved.
            <br />
            <span className="text-cmba-grey-dark">
              Built by{" "}
              <a href="https://boostinnovation.ca" target="_blank" rel="noopener noreferrer"
                className="hover:text-cmba-red transition-colors">
                Boost Innovation
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
