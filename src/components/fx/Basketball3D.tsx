"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

/*
 * Lightweight interactive 3D basketball (orange sphere + black seam rings).
 * Auto-rotates and tilts toward the pointer. Rendered only by Basketball3DLazy
 * (which gates on WebGL support, reduced-motion, and in-view). No drei to keep
 * the bundle small.
 */
function Ball() {
  const group = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += delta * 0.35;
    const tz = -state.pointer.x * 0.35;
    const tx = state.pointer.y * 0.35;
    g.rotation.z += (tz - g.rotation.z) * 0.06;
    g.rotation.x += (tx - g.rotation.x) * 0.06;
  });

  const R = 1.34;
  const seam = "#0c0c0e";
  // equator + three vertical great circles 60° apart → basketball seam pattern
  const rings: [number, number, number][] = [
    [Math.PI / 2, 0, 0],
    [0, 0, 0],
    [0, Math.PI / 3, 0],
    [0, (2 * Math.PI) / 3, 0],
  ];

  return (
    <group ref={group} rotation={[0.2, 0, 0.12]}>
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial color="#e0561f" roughness={0.6} metalness={0.06} />
      </mesh>
      {rings.map((rot, i) => (
        <mesh key={i} rotation={rot}>
          <torusGeometry args={[R + 0.002, 0.02, 16, 120]} />
          <meshStandardMaterial color={seam} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export default function Basketball3D() {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 4.3], fov: 42 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 5]} intensity={1.15} />
      <pointLight position={[-4, -2, 2]} intensity={0.5} color="#EB1C24" />
      <Ball />
    </Canvas>
  );
}
