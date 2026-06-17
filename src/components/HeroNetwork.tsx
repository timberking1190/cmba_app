"use client";
import { useEffect, useRef } from "react";

/*
 * Animated hero centerpiece: a central basketball with an orbiting network of
 * role nodes. Pure inline SVG + CSS (no libraries). The ring (`.hn-spin`) spins
 * over 42s; each label sits in a counter-rotating group (`.hn-counter`) so it
 * stays upright. The aura pulses; the whole piece floats (`.hn-float`) and gets
 * a light scroll parallax driven by JS. All motion is disabled under
 * prefers-reduced-motion (CSS) and the parallax loop is skipped.
 */

const C = 260; // centre
const ORBIT = 200; // node ring radius
const SURF = 112; // ball-surface contact radius
const BALL = 115;

const ROLES = ["COACH", "ATHLETE", "PARENT", "OFFICIAL", "CLUB", "COMMUNITY"];

// 6 points around the centre, first one at the top (-90deg), clockwise.
const NODES = ROLES.map((label, i) => {
  const a = (-90 + i * 60) * (Math.PI / 180);
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  return {
    label,
    nx: +(C + ORBIT * ux).toFixed(1), // node centre
    ny: +(C + ORBIT * uy).toFixed(1),
    sx: +(C + SURF * ux).toFixed(1), // ball-surface contact point
    sy: +(C + SURF * uy).toFixed(1),
  };
});

const hexPoints = NODES.map((n) => `${n.nx},${n.ny}`).join(" ");

export function HeroNetwork({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  // Light scroll parallax (translateY + scale), throttled via rAF.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let pending = false;
    const apply = () => {
      pending = false;
      const y = window.scrollY;
      const ty = Math.max(-30, Math.min(90, y * 0.08));
      const s = 1 + Math.min(0.12, y * 0.00008);
      el.style.transform = `translate3d(0, ${ty}px, 0) scale(${s.toFixed(4)})`;
    };
    const onScroll = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(apply);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`hero-net ${className}`} aria-hidden="true">
      <div className="hn-float">
        <svg viewBox="0 0 520 520" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="hn-ball" cx="38%" cy="30%" r="78%">
              <stop offset="0%" stopColor="#EE2222" />
              <stop offset="55%" stopColor="#CC0000" />
              <stop offset="100%" stopColor="#7A0000" />
            </radialGradient>
            <radialGradient id="hn-shine" cx="33%" cy="26%" r="42%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hn-auraG" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EB1C24" stopOpacity="0.55" />
              <stop offset="65%" stopColor="#EB1C24" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#EB1C24" stopOpacity="0" />
            </radialGradient>
            <filter id="hn-glow" x="-45%" y="-45%" width="190%" height="190%">
              <feGaussianBlur stdDeviation="11" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="hn-dot" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="hn-clip">
              <circle cx={C} cy={C} r={BALL} />
            </clipPath>
          </defs>

          {/* ambient pulsing aura behind the ball */}
          <circle className="hn-aura" cx={C} cy={C} r={158} fill="url(#hn-auraG)" />

          {/* ── the basketball (does not rotate) ── */}
          <g filter="url(#hn-glow)">
            <circle cx={C} cy={C} r={BALL} fill="url(#hn-ball)" />
          </g>
          {/* black seams, clipped to the ball */}
          <g
            clipPath="url(#hn-clip)"
            stroke="#0A0A0A"
            strokeWidth="3.5"
            fill="none"
            opacity="0.85"
            strokeLinecap="round"
          >
            <line x1={C - BALL} y1={C} x2={C + BALL} y2={C} />
            <line x1={C} y1={C - BALL} x2={C} y2={C + BALL} />
            <path d={`M ${C - 86} ${C - 108} Q ${C} ${C} ${C - 86} ${C + 108}`} />
            <path d={`M ${C + 86} ${C - 108} Q ${C} ${C} ${C + 86} ${C + 108}`} />
          </g>
          {/* soft top-left shine */}
          <circle cx={C} cy={C} r={BALL} fill="url(#hn-shine)" />

          {/* ── rotating network (hexagon, spokes, dots, nodes) ── */}
          <g className="hn-spin">
            <polygon
              points={hexPoints}
              fill="none"
              stroke="rgba(235,28,36,0.28)"
              strokeWidth="1.5"
            />

            {/* faint red spokes from ball surface to each node */}
            {NODES.map((n) => (
              <line
                key={`spoke-${n.label}`}
                x1={n.sx}
                y1={n.sy}
                x2={n.nx}
                y2={n.ny}
                stroke="rgba(235,28,36,0.30)"
                strokeWidth="1"
              />
            ))}

            {/* glowing surface dots where spokes meet the ball */}
            {NODES.map((n) => (
              <circle
                key={`dot-${n.label}`}
                cx={n.sx}
                cy={n.sy}
                r="4"
                fill="#FF2438"
                filter="url(#hn-dot)"
              />
            ))}

            {/* role nodes; each in a counter-rotating group so the label stays upright */}
            {NODES.map((n) => (
              <g key={`node-${n.label}`} className="hn-counter">
                <circle
                  cx={n.nx}
                  cy={n.ny}
                  r="33"
                  fill="#101015"
                  stroke="#EB1C24"
                  strokeWidth="1.5"
                />
                <circle cx={n.nx} cy={n.ny} r="33" fill="#EB1C24" fillOpacity="0.06" />
                <text
                  x={n.nx}
                  y={n.ny}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#F7F6F2"
                  style={{
                    fontFamily: "var(--font-archivo), sans-serif",
                    fontWeight: 800,
                    fontSize: "9px",
                    letterSpacing: "0.06em",
                  }}
                >
                  {n.label}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
