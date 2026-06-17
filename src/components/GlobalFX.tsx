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

  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal")) as HTMLElement[];
    if (!("IntersectionObserver" in window) || els.length === 0) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }),
      { threshold: 0.12 }
    );
    els.forEach((e) => io.observe(e));
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
