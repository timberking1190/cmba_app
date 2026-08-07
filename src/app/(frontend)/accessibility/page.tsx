import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accessibility | CMBA+",
  description:
    "How CMBA+ works for people using screen readers, keyboards, large text and other assistive technology, what we have tested, what we know is not fixed yet, and how to tell us about a problem.",
};

/*
 * Accessibility statement.
 *
 * Written to be useful rather than to look compliant. The "what is not fixed
 * yet" section is the part that matters: a statement that claims everything works
 * is a statement nobody trusts, and it gives a person no way to judge whether the
 * site will work for them before they try it.
 *
 * Keep the known-issues list in step with docs/audit/axe-baseline.json. When an
 * entry is cleared there, clear it here.
 */

const CONFORMS = [
  "Every page can be used with a keyboard alone, and the focus outline is always visible.",
  "Text can be resized to 200 percent without anything being cut off or overlapping.",
  "Pinch zoom is never blocked, on any page.",
  "Buttons, links and form fields are at least 44 pixels, so they can be hit one handed.",
  "Form fields are at least 16 pixels, so an iPhone does not zoom the page when you tap one.",
  "Every form field tells your phone which keyboard to show, and works with a password manager.",
  "Animation, including the moving background and the arcade game, stops if your device asks for reduced motion.",
  "Pages that fail say what went wrong in plain language and offer a way to try again.",
  "The site works in both dark and light mode, following whichever your device is set to.",
];

const KNOWN_ISSUES = [
  {
    what: "Some coloured text on the coach and referee pages does not have enough contrast in light mode.",
    who: "Affects people reading in bright light or with low vision.",
    plan: "Being fixed. Switching your device to dark mode avoids it in the meantime.",
  },
  {
    what: "On a few pages the headings skip a level, so a screen reader's heading list has gaps.",
    who: "Affects people who navigate by heading.",
    plan: "Being fixed. All the content is reachable, it is the outline that is uneven.",
  },
  {
    what: "The scanner page needs a camera and is not usable without one.",
    who: "Affects anyone on a device with no camera.",
    plan: "By design. A coach can be verified manually by an official instead. Ask at the scorer's table.",
  },
  {
    what: "Game schedules and standings come from TeamLinkt and are shown inside our pages.",
    who: "Affects anyone relying on TeamLinkt's own accessibility.",
    plan: "We do not control that content. Tell us if you hit a problem and we will raise it with them.",
  },
];

export default function AccessibilityPage() {
  return (
    <div>
      <section className="px-4 md:px-10 lg:px-14 pt-12 lg:pt-20 pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="label-xs text-cmba-grey mb-4">Accessibility</div>
          <h1 className="font-display font-black uppercase leading-[0.9] tracking-tighter2 text-[clamp(36px,10vw,84px)]">
            Using this site
          </h1>
          <p className="mt-5 text-base leading-relaxed text-cmba-grey">
            CMBA+ is for every family in Calgary minor basketball, which means it has to work for
            people using a screen reader, a keyboard, large text, or a phone in one hand in a loud
            gym. This page says what we have tested, what we know is not right yet, and how to tell
            us when something does not work.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 md:px-10 lg:px-14 pb-20 space-y-12">
        <section>
          <h2 className="font-display font-black uppercase tracking-tight text-2xl text-cmba-grey-light">
            What we aim for
          </h2>
          <p className="mt-3 text-base leading-relaxed text-cmba-grey">
            We build to <span className="text-white">WCAG 2.2 level AA</span>, the international
            standard for accessible websites. We are not claiming full conformance, because parts of
            the site are not there yet and saying otherwise would be misleading. The list below is
            what is actually true today.
          </p>
        </section>

        <section>
          <h2 className="font-display font-black uppercase tracking-tight text-2xl text-cmba-grey-light">
            What works today
          </h2>
          <ul className="mt-4 space-y-3">
            {CONFORMS.map((item) => (
              <li key={item} className="flex gap-3 text-base leading-relaxed text-cmba-grey">
                <span aria-hidden="true" className="text-cmba-red shrink-0">
                  &mdash;
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-cmba-grey-mid leading-relaxed">
            These are checked automatically every time we change the site, so they cannot quietly
            stop being true. Automated checks catch roughly a third of accessibility problems, so we
            also test by keyboard and with a screen reader by hand.
          </p>
        </section>

        <section>
          <h2 className="font-display font-black uppercase tracking-tight text-2xl text-cmba-grey-light">
            What is not fixed yet
          </h2>
          <p className="mt-3 text-base leading-relaxed text-cmba-grey">
            We would rather tell you than have you find out.
          </p>
          <div className="mt-5 space-y-5">
            {KNOWN_ISSUES.map((issue) => (
              <div
                key={issue.what}
                className="border border-white/10 bg-cmba-black-card/60 backdrop-blur-sm p-5"
              >
                <p className="text-base leading-relaxed text-cmba-grey-light">{issue.what}</p>
                <p className="mt-2 text-sm leading-relaxed text-cmba-grey">{issue.who}</p>
                <p className="mt-2 text-sm leading-relaxed text-cmba-grey-mid">{issue.plan}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display font-black uppercase tracking-tight text-2xl text-cmba-grey-light">
            Telling us about a problem
          </h2>
          <p className="mt-3 text-base leading-relaxed text-cmba-grey">
            If something on this site does not work for you, please tell us. It helps to know what
            you were trying to do, which page you were on, and what device or assistive technology
            you were using, but tell us even if you cannot say all of that.
          </p>
          <p className="mt-4 text-base leading-relaxed text-cmba-grey">
            Email{" "}
            <a
              href="mailto:league@cmba.ab.ca?subject=Accessibility"
              className="text-cmba-red hover:text-white transition-colors"
            >
              league@cmba.ab.ca
            </a>{" "}
            or use the{" "}
            <Link href="/contact" className="text-cmba-red hover:text-white transition-colors">
              contact page
            </Link>
            . We aim to reply within five business days.
          </p>
          <p className="mt-4 text-base leading-relaxed text-cmba-grey">
            If you need information from this site in another format, ask and we will provide it.
          </p>
        </section>

        <section>
          <h2 className="font-display font-black uppercase tracking-tight text-2xl text-cmba-grey-light">
            If you cannot use the site at all
          </h2>
          <p className="mt-3 text-base leading-relaxed text-cmba-grey">
            Nothing here should be the only way to do something that matters. Schedules and
            standings are also available directly in TeamLinkt, a coach or official can be verified
            in person at the scorer&apos;s table without the scanner, and the league office can take a
            game report over the phone.
          </p>
        </section>

        <p className="text-sm text-cmba-grey-mid">Last reviewed 7 August 2026.</p>
      </div>
    </div>
  );
}
