"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Dynamic storytelling: a tall section with a sticky stage. As the user scrolls,
 * scroll PROGRESS (not scroll-jacking) drives which narrative step is active and
 * a vertical progress rail. All steps are in the DOM for screen readers; native
 * scrolling is untouched.
 */
const steps = [
  { n: "01", k: "Play", t: "It starts on the court", d: "Thousands of kids across Calgary picking up a ball for the first time — from Tykes to U18, in gyms in every quadrant." },
  { n: "02", k: "Develop", t: "Skills, stage by stage", d: "A development pathway that meets every athlete where they are, with guides and report cards for each age group." },
  { n: "03", k: "Lead", t: "Coaches & officials who give back", d: "NCCP and RAMP pathways turn today's players into tomorrow's coaches and referees — tracked and celebrated." },
  { n: "04", k: "Belong", t: "One community, one platform", d: "Rules, training, certifications, and resources in one place — built for everyone who makes CMBA run." },
];

export function StoryScroll() {
  const wrap = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [prog, setProg] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrap.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
        const p = total > 0 ? scrolled / total : 0;
        setProg(p);
        setActive(Math.min(steps.length - 1, Math.floor(p * steps.length + 0.0001)));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={wrap} aria-label="The CMBA journey" style={{ height: `${steps.length * 100}vh` }}>
      <div className="story-stage px-5 md:px-10 lg:px-14">
        {/* progress rail */}
        <div className="absolute left-5 md:left-10 lg:left-14 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center gap-3" aria-hidden="true">
          <div className="story-rail"><i style={{ width: 3, height: 160, "--p": prog } as React.CSSProperties} /></div>
        </div>

        <div className="max-w-4xl mx-auto w-full relative">
          <div className="label-sm text-cmba-grey mb-6 reveal in">The CMBA Journey</div>
          <div className="relative min-h-[340px] md:min-h-[300px]">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className={`story-step absolute inset-0 ${i === active ? "active opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"}`}
              >
                <div className="story-num font-display font-black leading-none text-[clamp(72px,16vw,180px)] tracking-tighter2">{s.n}</div>
                <h3 className="font-display font-black uppercase tracking-tighter2 text-[clamp(28px,5.5vw,64px)] leading-[0.95] mt-2">
                  {s.t}
                </h3>
                <p className="text-cmba-grey-light/90 text-base md:text-lg max-w-[48ch] mt-4 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>

          {/* step dots */}
          <div className="flex gap-2 mt-8" aria-hidden="true">
            {steps.map((s, i) => (
              <div key={s.n} className={`h-1 flex-1 max-w-[60px] transition-colors ${i <= active ? "bg-cmba-red" : "bg-white/12"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
