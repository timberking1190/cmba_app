"use client";
import { useEffect, useRef } from "react";

/*
 * Domain-warped FBM noise in Calgary red on near-black. Sits behind all content
 * (z-index:0, veil on top). Falls back to a static gradient with no WebGL and
 * freezes a single frame for prefers-reduced-motion.
 *
 * Mobile/coarse-pointer devices get a much cheaper render: a lower internal
 * resolution, fewer FBM octaves, a 30fps cap, and a pause when the tab is hidden.
 * The noise is soft and slow, so this is visually near-identical but stops the
 * full-screen shader from competing with the scroll for the GPU (the cause of the
 * scroll jank and battery drain on phones).
 */
export function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small =
      Math.min(window.innerWidth, window.innerHeight) < 820 ||
      window.matchMedia("(pointer: coarse)").matches;
    const OCT = small ? 4 : 6; // FBM octaves

    const gl = cv.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) {
      cv.style.background = "radial-gradient(120% 95% at 50% -8%, #6a0008 0%, #2a0003 42%, #08080A 78%)";
      return;
    }

    const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fs =
      "precision highp float;uniform float t;uniform vec2 r;uniform vec2 m;" +
      "vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}" +
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);" +
      "return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)),dot(h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}" +
      "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<" + OCT + ";i++){v+=a*n(p);p*=2.;a*=.5;}return v;}" +
      "void main(){vec2 p=(gl_FragCoord.xy-.5*r)/r.y;float tm=t*.06;vec2 mm=(m-.5);" +
      "vec2 q=vec2(fbm(p*1.4+tm),fbm(p*1.4+vec2(5.2,1.3)-tm));" +
      "vec2 w=vec2(fbm(p*1.4+2.*q+vec2(1.7,9.2)+.25*mm),fbm(p*1.4+2.*q+vec2(8.3,2.8)-.25*mm));" +
      "float f=fbm(p*1.4+2.6*w+tm*1.4);f=smoothstep(-.32,.9,f);" +
      "vec3 bk=vec3(.05,.04,.05),dk=vec3(.46,.03,.04),rd=vec3(.98,.07,.10),ht=vec3(1.,.22,.27);" +
      "vec3 c=mix(bk,dk,smoothstep(.10,.46,f));c=mix(c,rd,smoothstep(.42,.74,f));c=mix(c,ht,smoothstep(.72,1.,f));" +
      "c*=1.-.38*dot(p,p);gl_FragColor=vec4(c,1.);}";

    const sh = (type: number, src: string) => {
      const o = gl.createShader(type)!;
      gl.shaderSource(o, src);
      gl.compileShader(o);
      return o;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    gl.useProgram(pr);

    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uT = gl.getUniformLocation(pr, "t");
    const uR = gl.getUniformLocation(pr, "r");
    const uM = gl.getUniformLocation(pr, "m");
    let mouse = [0.5, 0.5];

    const resize = () => {
      // Render at a LOW internal resolution on phones (the noise is soft, so the
      // upscale is invisible) to cut fragment-shader cost by several times.
      const d = small ? 0.7 : Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(1, Math.floor(window.innerWidth * d));
      cv.height = Math.max(1, Math.floor(window.innerHeight * d));
      cv.style.width = window.innerWidth + "px";
      cv.style.height = window.innerHeight + "px";
      gl.viewport(0, 0, cv.width, cv.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: PointerEvent) => {
      mouse = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
    };
    window.addEventListener("pointermove", onMove);

    let hidden = false;
    const onVis = () => { hidden = document.hidden; };
    document.addEventListener("visibilitychange", onVis);

    const t0 = performance.now();
    const frameMs = small ? 1000 / 30 : 0; // cap mobile to ~30fps; uncapped on desktop
    let last = -1e9;
    let raf = 0;
    const draw = (now: number) => {
      if (!hidden && (frameMs === 0 || now - last >= frameMs)) {
        last = now;
        const time = reduce ? 8 : (now - t0) / 1000;
        gl.uniform1f(uT, time);
        gl.uniform2f(uR, cv.width, cv.height);
        gl.uniform2f(uM, mouse[0], mouse[1]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="fx-canvas" aria-hidden="true" />
      <div className="fx-veil" aria-hidden="true" />
    </>
  );
}
