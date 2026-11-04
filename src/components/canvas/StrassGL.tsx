"use client";
/**
 * Strass v2 (2026-11-04, user request: "3D real"): the rhinestones are real
 * 3D gems — faceted brilliant-cut meshes (three.js, already a dependency of
 * the landing) with environment reflections. They turn a little with the
 * card's light (--lx / --ly on this element), so their facets flash as it
 * moves. Draws only when the light changes. If WebGL is not available,
 * `fallback` (the flat SVG stones) is shown instead.
 */
import React, { useEffect, useRef, useState } from "react";
import type { CardEffects } from "@/types";
import { STRASS_COLORS } from "@/lib/cardFoil";

type Strass = NonNullable<CardEffects["strass"]>;

export default function StrassGL({ w, h, pts, size, color, fallback }: {
  w: number; h: number; pts: { x: number; y: number }[]; size: number; color: NonNullable<Strass["color"]>; fallback: React.ReactNode;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || pts.length === 0) return;
    let alive = true, raf = 0;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const T = await import("three");
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
        if (!alive) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.85;
        renderer.outputColorSpace = T.SRGBColorSpace;
        const scene = new T.Scene();
        const pmrem = new T.PMREMGenerator(renderer);
        const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
        scene.environment = env;
        const camera = new T.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 1, 2000);
        camera.position.z = 1000;

        // Brilliant cut: pointed pavilion, girdle, crown, flat table — turned
        // so the table faces the viewer. Few segments = visible facets.
        const prof = [
          new T.Vector2(0.001, -0.62), new T.Vector2(1, 0), new T.Vector2(1, 0.06),
          new T.Vector2(0.58, 0.34), new T.Vector2(0.001, 0.34),
        ];
        const geo = new T.LatheGeometry(prof, 8);
        geo.rotateX(Math.PI / 2);
        const [hi, body] = STRASS_COLORS[color] ?? STRASS_COLORS.crystal;
        const gold = color === "gold";
        const mat = new T.MeshPhysicalMaterial({
          color: new T.Color(color === "crystal" ? "#eef3ff" : body), flatShading: true,
          metalness: gold ? 0.85 : 0.05, roughness: gold ? 0.18 : 0.02,
          clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: gold ? 1.6 : 2.4,
          iridescence: color === "rainbow" || color === "crystal" ? 1 : 0.3, iridescenceIOR: 1.6,
          sheen: 0.4, sheenColor: new T.Color(hi),
        });
        const mesh = new T.InstancedMesh(geo, mat, pts.length);
        const r = size / 2;
        const base = pts.map((p, i) => ({ x: p.x - w / 2, y: h / 2 - p.y, a: (i * 2.399) % (Math.PI * 2) }));
        const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(r, r, r), v = new T.Vector3();
        if (color === "rainbow") {
          const c = new T.Color();
          base.forEach((_, i) => { c.setHSL((i / base.length) % 1, 0.75, 0.68); mesh.setColorAt(i, c); });
        }
        scene.add(mesh);
        const key = new T.DirectionalLight("#ffffff", 2.2);
        scene.add(key, new T.AmbientLight("#ffffff", 0.35));

        let lastX = NaN, lastY = NaN;
        const draw = (lx: number, ly: number) => {
          // Each stone turns toward the light, with its own small offset, so
          // they don't all flash at once.
          base.forEach((b, i) => {
            e.set((0.5 - ly) * 0.9 + Math.sin(b.a) * 0.18, (lx - 0.5) * 0.9 + Math.cos(b.a) * 0.18, b.a);
            q.setFromEuler(e);
            m.compose(v.set(b.x, b.y, 0), q, s);
            mesh.setMatrixAt(i, m);
          });
          mesh.instanceMatrix.needsUpdate = true;
          key.position.set((lx - 0.5) * 2, (0.5 - ly) * 2, 1.2);
          renderer.render(scene, camera);
        };
        const host = canvas.parentElement!;
        const read = (n: string, d: number) => { const v = parseFloat(host.style.getPropertyValue(n)); return isFinite(v) ? v : d; };
        const tick = () => {
          raf = requestAnimationFrame(tick);
          if (document.hidden) return;
          const lx = read("--lx", 0.38), ly = read("--ly", 0.28);
          if (Math.abs(lx - lastX) < 0.002 && Math.abs(ly - lastY) < 0.002) return;
          lastX = lx; lastY = ly;
          draw(lx, ly);
        };
        tick();
        cleanup = () => {
          cancelAnimationFrame(raf);
          geo.dispose(); mat.dispose(); env.dispose(); pmrem.dispose(); renderer.dispose();
        };
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; cancelAnimationFrame(raf); cleanup?.(); };
  }, [w, h, pts, size, color]);

  if (failed) return <>{fallback}</>;
  return <canvas ref={ref} aria-hidden style={{ position: "absolute", inset: 0, width: w, height: h, pointerEvents: "none" }} />;
}
