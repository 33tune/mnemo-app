"use client";
/**
 * "Compartir tu card" (2026-11-04, user request): the card as an Instagram
 * story — a still image or a short animated video (storyRender.ts) — shared
 * from the phone's share sheet, or downloaded on a computer. Opened from the
 * editor's top bar and from the public profile's "Compartir" button.
 * Self-styled (it also lives on the public profile, outside the editor).
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { snapshotCard, loadImage, sceneFrom, type SceneInput } from "@/lib/export/cardSnapshot";
import { drawStoryFrame, STORY_W, STORY_H, STORY_SECONDS, type StoryScene } from "@/lib/export/storyRender";
import { storyImage, storyVideo, shareOrDownload } from "@/lib/export/encodeStory";

export interface ShareCardDialogProps {
  onClose: () => void;
  /** The card's DOM element ([data-profile-card]). */
  getCard: () => HTMLElement | null;
  scene: Omit<SceneInput, "bg" | "logo"> & { bg: { color: string; image?: string; brightness?: number } };
  /** Where focus returns. */
  returnFocusTo?: () => HTMLElement | null;
}

type Busy = null | { what: "image" | "video"; progress: number };

const isPhone = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export default function ShareCardDialog({ onClose, getCard, scene: input, returnFocusTo }: ShareCardDialogProps) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const firstBtn = useRef<HTMLButtonElement>(null);
  const [scene, setScene] = useState<StoryScene | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState<string | null>(null);
  const phone = isPhone();

  // Build the scene once: the card's snapshot, the room's wallpaper, the logo.
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const el = getCard();
        if (!el) throw new Error("no card");
        const [snap, bgImg, logo] = await Promise.all([snapshotCard(el), loadImage(input.bg.image ?? ""), loadImage("/logo.png")]);
        if (!alive) return;
        setScene(sceneFrom(snap, {
          ...input,
          bg: { color: input.bg.color, image: bgImg, imageW: bgImg?.naturalWidth, imageH: bgImg?.naturalHeight, brightness: input.bg.brightness },
          logo,
        }));
      } catch {
        if (alive) setError("No pudimos armar la imagen de tu card. Probá de nuevo.");
      }
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live preview, looping.
  useEffect(() => {
    if (!scene || !previewRef.current) return;
    const ctx = previewRef.current.getContext("2d")!;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      const t = reduce ? STORY_SECONDS * 0.86 : ((performance.now() - t0) / 1000) % STORY_SECONDS;
      drawStoryFrame(ctx, scene, t);
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  // Focus in, Esc out, focus back.
  useEffect(() => {
    firstBtn.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const close = () => {
    if (busy) return;
    onClose();
    requestAnimationFrame(() => returnFocusTo?.()?.focus({ preventScroll: true }));
  };

  const fileBase = `myland-${input.handle || "card"}`;
  async function doImage() {
    if (!scene || busy) return;
    setBusy({ what: "image", progress: 0 }); setNote(null);
    try {
      const blob = await storyImage(scene);
      const r = await shareOrDownload(blob, `${fileBase}.jpg`, "Mi card de myLand");
      if (r === "downloaded") setNote("Imagen guardada. Subila como historia desde tu celular.");
    } catch { setNote("No se pudo crear la imagen."); }
    setBusy(null);
  }
  async function doVideo() {
    if (!scene || busy) return;
    setBusy({ what: "video", progress: 0 }); setNote(null);
    try {
      const v = await storyVideo(scene, p => setBusy({ what: "video", progress: p }));
      const r = await shareOrDownload(v.blob, `${fileBase}.${v.ext}`, "Mi card de myLand");
      if (r === "downloaded") setNote(v.ext === "mp4" ? "Video guardado. Subilo como historia desde tu celular." : "Video guardado (WebM). Si Instagram no lo acepta, probá desde Chrome o Safari.");
    } catch { setNote("No se pudo crear el video en este navegador. Probá con la imagen."); }
    setBusy(null);
  }

  const verb = phone ? "Compartir" : "Descargar";
  const btn = (primary: boolean): React.CSSProperties => ({
    flex: 1, minHeight: 48, borderRadius: 999, border: primary ? "none" : "1px solid rgba(255,255,255,0.18)",
    background: primary ? "#ffffff" : "rgba(255,255,255,0.08)", color: primary ? "#0b0b0e" : "#ffffff",
    font: "600 15px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", cursor: scene && !busy ? "pointer" : "default",
    opacity: scene && !busy ? 1 : 0.55, padding: "0 16px",
  });

  if (typeof document === "undefined") return null;
  return createPortal(
    <div data-mnemo-ui="" data-export-skip="" onMouseDown={e => { e.stopPropagation(); if (e.target === e.currentTarget) close(); }}
      style={{ position: "fixed", inset: 0, zIndex: 2147482000, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="mnemo-share-title"
        style={{ width: "min(400px, 100%)", maxHeight: "calc(100dvh - 32px)", overflow: "auto", borderRadius: 28, padding: 20, boxSizing: "border-box",
          background: "rgba(22,22,28,0.96)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)", font: "15px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 id="mnemo-share-title" style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Compartir tu card</h2>
          <button type="button" onClick={close} aria-label="Cerrar"
            style={{ width: 40, height: 40, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 20, cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ position: "relative", alignSelf: "center", width: "min(250px, 62vw)", aspectRatio: `${STORY_W} / ${STORY_H}`, borderRadius: 18, overflow: "hidden", background: "#0b0b0e" }}>
          <canvas ref={previewRef} width={STORY_W} height={STORY_H} role="img" aria-label="Vista previa de la historia"
            style={{ width: "100%", height: "100%", display: "block" }} />
          {!scene && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.7)", fontSize: 14, textAlign: "center", padding: 16 }}>
              {error ?? "Preparando tu card…"}
            </div>
          )}
        </div>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: 14, textAlign: "center" }}>
          {phone ? "Elegí Instagram › Historia en el menú de compartir." : "Bajala y subila como historia desde tu celular."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button ref={firstBtn} type="button" style={btn(true)} aria-disabled={!scene || !!busy || undefined} onClick={doVideo}>
            {busy?.what === "video" ? `Armando… ${Math.round(busy.progress * 100)}%` : `${verb} video`}
          </button>
          <button type="button" style={btn(false)} aria-disabled={!scene || !!busy || undefined} onClick={doImage}>
            {busy?.what === "image" ? "Armando…" : "Imagen"}
          </button>
        </div>
        <div role="status" aria-live="polite" style={{ minHeight: 18, fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>{note}</div>
      </div>
    </div>,
    document.body,
  );
}
