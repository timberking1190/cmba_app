"use client";
import { useEffect, useRef, useState } from "react";

/*
 * Counts a numeric stat up from 0 to its value when it scrolls into view.
 * Preserves any prefix/suffix (e.g. the "+" in "2,400+") and re-inserts
 * thousands separators while animating. Honours prefers-reduced-motion by
 * showing the final value immediately. SSR renders the final value so there is
 * no hydration mismatch.
 */
export function CountUp({
  value,
  className,
  duration = 1500,
}: {
  value: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const m = value.match(/^(\D*)([\d,]+)(\D*)$/);
    const target = m ? parseInt(m[2].replace(/,/g, ""), 10) : NaN;
    if (!m || Number.isNaN(target)) {
      setDisplay(value);
      return;
    }
    const [, prefix, , suffix] = m;
    const render = (n: number) => `${prefix}${Math.round(n).toLocaleString("en-US")}${suffix}`;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(render(target));
      return;
    }

    setDisplay(render(0));

    let raf = 0;
    let start = 0;
    let done = false;
    const run = () => {
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = Math.min(1, (ts - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        setDisplay(render(target * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      run();
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !done) {
            done = true;
            io.disconnect();
            run();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
