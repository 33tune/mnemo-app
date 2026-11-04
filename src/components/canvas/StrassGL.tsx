"use client";
/**
 * Strass v2 (2026-11-04, user request: "3D real"): the rhinestones are real
 * 3D gems — faceted brilliant-cut meshes (three.js, already a dependency of
 * the landing) with environment reflections, glued to the card: they lean
 * exactly as the card leans (its --tilt-x / --tilt-y), so their relief —
 * the crown and the sides — shows as it tilts, and the card's light
 * (--lx / --ly on this element) moves the highlights over the facets. Draws
 * only when the tilt or the light changes. Without WebGL, `fallback` (the
 * flat SVG stones) is shown instead.
 */
import React, { useEffect, useRef, useState } from "react";
import type { CardEffects } from "@/types";
import { STRASS_COLORS } from "@/lib/cardFoil";
import { exportActive, onExportFrame } from "@/lib/export/exportClock";

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
        // Phones: a lighter canvas (1.5×) and at most ~30 redraws a second.
        const coarse = window.matchMedia?.("(pointer: coarse)").matches;
        const dpr = Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1);
        const minGap = coarse ? 33 : 0;
        let last = 0;
        const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
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
          // Mirror-like facets: each one reflects a different part of the
          // room, so the stone reads as cut glass (dark and bright facets),
          // not as a white dot.
          color: new T.Color(color === "crystal" ? "#dfe6f5" : body), flatShading: true,
          metalness: gold ? 0.9 : 0.5, roughness: gold ? 0.16 : 0.06,
          clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: gold ? 1.5 : 1.9,
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
        // Contact shadow under each stone (drawn in the scene: a CSS
        // drop-shadow on a canvas that redraws is expensive on a phone).
        const sc = document.createElement("canvas");
        sc.width = sc.height = 64;
        const sg = sc.getContext("2d")!;
        const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(0,0,0,0.55)");
        grad.addColorStop(0.55, "rgba(0,0,0,0.25)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        sg.fillStyle = grad;
        sg.fillRect(0, 0, 64, 64);
        const shadowTex = new T.CanvasTexture(sc);
        const shadowGeo = new T.PlaneGeometry(1, 1);
        const shadowMat = new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
        const shadows = new T.InstancedMesh(shadowGeo, shadowMat, pts.length);
        base.forEach((b, i) => {
          m.compose(v.set(b.x, b.y - r * 0.18, -r * 1.2), q.identity(), new T.Vector3(r * 2.5, r * 2.5, 1));
          shadows.setMatrixAt(i, m);
        });
        shadows.renderOrder = -1;
        scene.add(shadows);
        const key = new T.DirectionalLight("#ffffff", 4);
        scene.add(key, new T.AmbientLight("#ffffff", 0.35));

        let lastX = NaN, lastY = NaN, lastTx = NaN, lastTy = NaN;
        const deg = Math.PI / 180;
        const draw = (lx: number, ly: number, tx: number, ty: number) => {
          // The canvas is inside the card's own 3D tilt: the stones get the
          // same lean again inside the scene, which is what makes their
          // crowns and sides show (a flat drawing would just tilt as a sticker).
          base.forEach((b, i) => {
            e.set(-tx * deg, ty * deg, b.a);
            q.setFromEuler(e);
            m.compose(v.set(b.x, b.y, 0), q, s);
            mesh.setMatrixAt(i, m);
          });
          mesh.instanceMatrix.needsUpdate = true;
          key.position.set((lx - 0.5) * 2.4, (0.5 - ly) * 2.4, 1);
          renderer.render(scene, camera);
        };
        const host = canvas.parentElement!;
        const card = canvas.closest<HTMLElement>("[data-profile-card]");
        const read = (el: HTMLElement | null, n: string, d: number) => { const v = parseFloat(el?.style.getPropertyValue(n) ?? ""); return isFinite(v) ? v : d; };
        const tick = (now = 0) => {
          raf = requestAnimationFrame(tick);
          if (document.hidden || exportActive() || now - last < minGap) return;
          const lx = read(host, "--lx", 0.38), ly = read(host, "--ly", 0.28);
          const tx = read(card, "--tilt-x", 0), ty = read(card, "--tilt-y", 0);
          if (Math.abs(lx - lastX) < 0.002 && Math.abs(ly - lastY) < 0.002 && Math.abs(tx - lastTx) < 0.02 && Math.abs(ty - lastTy) < 0.02) return;
          lastX = lx; lastY = ly; lastTx = tx; lastTy = ty; last = now;
          draw(lx, ly, tx, ty);
        };
        tick();
        // Story capture: drawn now, at the frame's light (exportClock.ts).
        const offExport = onExportFrame(() => {
          const lx = read(host, "--lx", 0.38), ly = read(host, "--ly", 0.28);
          const tx = read(card, "--tilt-x", 0), ty = read(card, "--tilt-y", 0);
          lastX = lx; lastY = ly; lastTx = tx; lastTy = ty;
          draw(lx, ly, tx, ty);
        });
        cleanup = () => {
          offExport();
          cancelAnimationFrame(raf);
          geo.dispose(); mat.dispose(); shadowGeo.dispose(); shadowMat.dispose(); shadowTex.dispose(); env.dispose(); pmrem.dispose(); renderer.dispose();
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
