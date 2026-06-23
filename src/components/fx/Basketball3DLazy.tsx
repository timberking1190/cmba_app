"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// Code-split the three.js scene; never SSR'd.
const Basketball3D = dynamic(() => import("./Basketball3D"), { ssr: false });

function webglSupported(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

/* SVG basketball — shown for reduced-motion / no-WebGL, and before first in-view. */
function BallFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <svg viewBox="0 0 200 200" className="w-3/4 max-w-[260px] drop-shadow-[0_12px_30px_rgba(235,28,36,0.25)]" aria-hidden="true">
        <circle cx="100" cy="100" r="92" fill="#e0561f" />
        <g stroke="#0c0c0e" strokeWidth="3.5" fill="none">
          <circle cx="100" cy="100" r="92" />
          <path d="M100 8 V192" />
          <path d="M8 100 H192" />
          <path d="M28 36 C 80 90, 80 110, 28 164" />
          <path d="M172 36 C 120 90, 120 110, 172 164" />
        </g>
      </svg>
    </div>
  );
}

export function Basketball3DLazy() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(!reduce && webglSupported());
  }, []);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [enabled]);

  return (
    <div ref={ref} className="absolute inset-0">
      {enabled && show ? <Basketball3D /> : <BallFallback />}
    </div>
  );
}
