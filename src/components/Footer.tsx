import Link from "next/link";
import Image from "next/image";

const footerSections = [
  {
    title: "CMBA Connect",
    links: [
      { label: "Rules & Info", href: "/rules" },
      { label: "FAQ", href: "/faq" },
      { label: "Season Calendar", href: "/calendar" },
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
      { label: "Admin Portal", href: "/admin" },
      { label: "Sign In", href: "/login" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="hidden lg:block bg-cmba-black-light border-t-2 border-cmba-red">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-4 gap-8">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-display font-bold text-sm text-cmba-red uppercase tracking-widest mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-cmba-grey hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-cmba-grey-dark/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/cmba-logo-sm.png"
              alt="CMBA"
              width={120}
              height={48}
              className="h-10 w-auto"
            />
            <div>
              <span className="font-display font-black text-white text-lg uppercase">
                <span className="text-cmba-red">Connect</span>
              </span>
            </div>
          </div>
          <p className="text-xs text-cmba-grey-mid text-center md:text-right">
            &copy; {new Date().getFullYear()} Calgary Minor Basketball
            Association. All rights reserved.
            <br />
            <span className="text-cmba-grey-dark">
              Built by{" "}
              <a
                href="https://boostinnovation.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cmba-red transition-colors"
              >
                Boost Innovation
              </a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
