"use client";
/**
 * "Compartir tu card" (2026-11-04, user request; redone the same day): the
 * public profile as a phone shows it, as an Instagram story — a PNG still (a
 * screenshot) or a 5 s video (a screen recording, frame by frame) — shared
 * from the phone's share sheet, or downloaded on a computer (storyRender.ts,
 * cardSnapshot.ts). Opened from the editor's top bar and from the public
 * profile's "Compartir" button. Self-styled (it also lives on the public
 * profile, outside the editor).
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { startCapture, loadImage, cardRoomRect } from "@/lib/export/cardSnapshot";
import { storyView, storyBackground, drawStoryFrame, STORY_W, STORY_H, STORY_FPS, type StoryView } from "@/lib/export/storyRender";
import { storyVideo, shareOrDownload, canvasToBlob } from "@/lib/export/encodeStory";
import { cardViewRect } from "@/lib/mobileFit";
import type { ProfileCardData } from "@/types";

export interface ShareCardDialogProps {
  onClose: () => void;
  /** The card's DOM element ([data-profile-card]). */
  getCard: () => HTMLElement | null;
  /** The card's data (its place in the room and its stickers). */
  card: Pick<ProfileCardData, "x" | "y" | "w" | "h" | "stickers">;
  handle: string;
  /** The room's background, as Tu sala › Fondo sets it. */
  bg: { color: string; image?: string; blur?: number; brightness?: number; vignette?: number };
  /** Where focus returns. */
  returnFocusTo?: () => HTMLElement | null;
}

type Busy = null | { what: "image" | "video"; progress: number };
type Ready = { el: HTMLElement; view: StoryView; background: HTMLCanvasElement; still: HTMLCanvasElement };

const isPhone = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export default function ShareCardDialog({ onClose, getCard, card, handle, bg, returnFocusTo }: ShareCardDialogProps) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const firstBtn = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState<string | null>(null);
  const phone = isPhone();

  // The story's phone view of the card, its background and the still (a
  // screenshot of that view), once.
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const el = getCard();
        if (!el) throw new Error("no card");
        // The card where it is really drawn (with its stickers), not its stored x / y.
        const at = cardRoomRect(el);
        const view = storyView(cardViewRect({ ...card, x: at.x, y: at.y, w: at.w }, at.h));
        const img = await loadImage(bg.image ?? "");
        const background = storyBackground({ color: bg.color, image: img, imageW: img?.naturalWidth, imageH: img?.naturalHeight, blur: bg.blur, brightness: bg.brightness, vignette: bg.vignette }, view);
        const cap = await startCapture(el, view.region, view.ratio);
        let first: Awaited<ReturnType<typeof cap.frame>>;
        try { first = await cap.frame(0); } finally { cap.done(); }
        const still = document.createElement("canvas");
        still.width = STORY_W; still.height = STORY_H;
        drawStoryFrame(still.getContext("2d")!, background, first.shot, first.glass);
        if (alive) setReady({ el, view, background, still });
      } catch {
        if (alive) setError("No pudimos armar la imagen de tu card. Probá de nuevo.");
      }
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preview = the still.
  useEffect(() => {
    if (!ready || !previewRef.current) return;
    previewRef.current.getContext("2d")!.drawImage(ready.still, 0, 0);
  }, [ready]);

  // Focus in, Esc out, focus back.
  useEffect(() => {
    firstBtn.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const busyRef = useRef(false);
  busyRef.current = !!busy;
  const close = () => {
    if (busyRef.current) return;
    onClose();
    requestAnimationFrame(() => returnFocusTo?.()?.focus({ preventScroll: true }));
  };

  const fileBase = `myland-${handle || "card"}`;
  async function doImage() {
    if (!ready || busy) return;
    setBusy({ what: "image", progress: 0 }); setNote(null);
    try {
      const blob = await canvasToBlob(ready.still, "image/png");
      const r = await shareOrDownload(blob, `${fileBase}.png`, "Mi card de myLand");
      if (r === "downloaded") setNote("Imagen guardada. Subila como historia desde tu celular.");
    } catch { setNote("No se pudo crear la imagen."); }
    setBusy(null);
  }
  async function doVideo() {
    if (!ready || busy) return;
    setBusy({ what: "video", progress: 0 }); setNote("Grabando tu card cuadro por cuadro. Puede tardar un minuto: no cierres esta ventana.");
    let cap: Awaited<ReturnType<typeof startCapture>> | null = null;
    try {
      cap = await startCapture(ready.el, ready.view.region, ready.view.ratio);
      const c = cap;
      const preview = previewRef.current?.getContext("2d");
      const v = await storyVideo(async (ctx, i) => {
        const f = await c.frame(i / STORY_FPS);
        drawStoryFrame(ctx, ready.background, f.shot, f.glass);
        // The preview shows what is being recorded.
        if (preview && i % 3 === 0) preview.drawImage(ctx.canvas, 0, 0);
      }, p => setBusy({ what: "video", progress: p }));
      c.done(); cap = null;
      setNote(null);
      previewRef.current?.getContext("2d")!.drawImage(ready.still, 0, 0);
      const r = await shareOrDownload(v.blob, `${fileBase}.${v.ext}`, "Mi card de myLand");
      if (r === "downloaded") setNote(v.ext === "mp4" ? "Video guardado. Subilo como historia desde tu celular." : "Video guardado (WebM). Si Instagram no lo acepta, probá desde Chrome o Safari.");
    } catch { setNote("No se pudo crear el video en este navegador. Probá con la imagen."); }
    cap?.done();
    setBusy(null);
  }

  const verb = phone ? "Compartir" : "Descargar";
  const btn = (primary: boolean): React.CSSProperties => ({
    flex: 1, minHeight: 48, borderRadius: 999, border: primary ? "none" : "1px solid rgba(255,255,255,0.18)",
    background: primary ? "#ffffff" : "rgba(255,255,255,0.08)", color: primary ? "#0b0b0e" : "#ffffff",
    font: "600 15px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", cursor: ready && !busy ? "pointer" : "default",
    opacity: ready && !busy ? 1 : 0.55, padding: "0 16px",
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
          {!ready && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.7)", fontSize: 14, textAlign: "center", padding: 16 }}>
              {error ?? "Preparando tu card…"}
            </div>
          )}
        </div>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: 14, textAlign: "center" }}>
          {phone ? "Elegí Instagram › Historia en el menú de compartir." : "Bajala y subila como historia desde tu celular."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button ref={firstBtn} type="button" style={btn(true)} aria-disabled={!ready || !!busy || undefined} onClick={doVideo}>
            {busy?.what === "video" ? `Grabando… ${Math.round(busy.progress * 100)}%` : `${verb} video`}
          </button>
          <button type="button" style={btn(false)} aria-disabled={!ready || !!busy || undefined} onClick={doImage}>
            {busy?.what === "image" ? "Armando…" : "Imagen"}
          </button>
        </div>
        <div role="status" aria-live="polite" style={{ minHeight: 18, fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>{note}</div>
      </div>
    </div>,
    document.body,
  );
}
