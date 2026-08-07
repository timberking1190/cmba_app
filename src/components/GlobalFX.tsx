"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/*
 * Site-wide editorial FX: custom cursor, scroll-progress meter, % intro loader,
 * and a reveal-on-scroll observer. Mounted once in the root layout.
 */
export function GlobalFX() {
  const pathname = usePathname();
  const cursor = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const progNum = useRef<HTMLSpanElement>(null);
  const progBar = useRef<HTMLElement>(null);
  const [introDone, setIntroDone] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let seen = false;
    try { seen = !!sessionStorage.getItem("cmba_intro"); } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) { setIntroDone(true); return; }
    setIntroDone(false);
    let v = 0;
    const iv = setInterval(() => {
      v += Math.ceil(Math.random() * 9);
      if (v >= 100) {
        v = 100;
        clearInterval(iv);
        setTimeout(() => {
          setIntroDone(true);
          try { sessionStorage.setItem("cmba_intro", "1"); } catch {}
        }, 350);
      }
      setCount(v);
    }, 90);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const c = cursor.current, d = dot.current;
    if (!c || !d) return;
    let x = window.innerWidth / 2, y = window.innerHeight / 2, cx = x, cy = y;
    const onMove = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY;
      d.style.left = x + "px"; d.style.top = y + "px";
    };
    const sel = 'a,button,input,textarea,select,[role="button"],.ix-row,.chip,.card-hover';
    const onOver = (e: Event) => { if ((e.target as HTMLElement)?.closest?.(sel)) c.classList.add("big"); };
    const onOut = (e: Event) => { if ((e.target as HTMLElement)?.closest?.(sel)) c.classList.remove("big"); };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    let raf = 0;
    const loop = () => {
      cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
      c.style.left = cx + "px"; c.style.top = cy + "px";
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(100, Math.round((window.scrollY / h) * 100)) : 0;
      if (progNum.current) progNum.current.textContent = String(p).padStart(2, "0");
      if (progBar.current) progBar.current.style.height = p + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /*
   * Reveal on scroll, arranged so it cannot delay the largest paint.
   *
   * The original version relied on `.reveal { opacity: 0 }` in the stylesheet and
   * waited for this observer to add `.in`. That hides content from the moment the
   * HTML arrives until React has hydrated and this effect has run, which on a
   * throttled phone is seconds. On /login it was measured directly: the LCP
   * element is a paragraph inside a `.reveal`, and LCP landed at 5266ms against an
   * FCP of 2232ms. Over four and a half seconds of render delay, on the sign in
   * page, to animate in text that was already in the HTML.
   *
   * So the hiding is now opt in, applied HERE, and only to elements that are below
   * the fold when the page loads:
   *
   *   - An element already on screen is left alone. It paints with the document,
   *     costs nothing, and does not animate. That is the correct behaviour for a
   *     scroll reveal anyway: there was no scroll.
   *   - An element below the fold is armed (`.reveal-armed` hides it) and then
   *     revealed when it scrolls into view. Arming something off screen is
   *     invisible, so there is no flash.
   *
   * If JavaScript never runs, nothing is ever hidden, which is the safe direction
   * to fail in.
   */
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal")) as HTMLElement[];
    if (els.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }

    const viewportHeight = window.innerHeight;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );

    for (const el of els) {
      // getBoundingClientRect here is a deliberate single read per element, done
      // once on mount, not per scroll.
      const belowTheFold = el.getBoundingClientRect().top > viewportHeight;
      if (belowTheFold) {
        el.classList.add("reveal-armed");
        io.observe(el);
      } else {
        el.classList.add("in");
      }
    }

    return () => io.disconnect();
  }, [pathname]);

  return (
    <>
      {!introDone && (
        <div className="intro" aria-hidden="true">
          <div>
            <div className="count"><span className="tab">{String(count).padStart(2, "0")}</span><span className="pct">%</span></div>
            <div className="tag">Calgary Minor Basketball</div>
          </div>
        </div>
      )}
      <div ref={cursor} className="cursor" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
      <div className="scroll-progress" aria-hidden="true">
        <div className="num"><span ref={progNum} className="tab">00</span><span className="pct">%</span></div>
        <div className="bar"><i ref={progBar} /></div>
        <div className="lab">SCROLL</div>
      </div>
    </>
  );
}
