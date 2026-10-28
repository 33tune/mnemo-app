"use client";
/**
 * Card stickers (2026-10-27): images / GIFs stuck to the ProfileCard, frames
 * above all.
 *
 * - StickerLayer draws them, inside the card's tilt / hover-scale / floating
 *   wrappers (CardLayers' back / front slots), so they move with the card.
 *   They are GHOSTS: pointer-events none, always — they never cover a button,
 *   a link or the card itself, in the editor or on the public page.
 * - StickerEditor is the edit mode (Tarjeta › Stickers › Editar): a dashed
 *   area (the card plus STICKER_REACH per side — stickers can't leave it)
 *   over the card, where stickers are picked (Shift adds), moved (together),
 *   scaled from a corner and rotated; Supr deletes, arrows nudge, Enter /
 *   Esc apply. The card under it doesn't respond meanwhile. Every gesture is
 *   one write (one undo step). Geometry: stickerGeometry.ts.
 */
import React, { useEffect, useRef, useState } from "react";
import type { CardSticker } from "@/types";
import {
  stickerRect, rectToSticker, stickerArea, clampIntoArea, clampSize, type Rect,
} from "@/lib/stickerGeometry";
import { stickerEditing, useStickerEditing } from "@/lib/stickerEditing";

const pos = (r: Rect, rotation = 0): React.CSSProperties => ({
  position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h,
  transform: rotation ? `rotate(${rotation}deg)` : undefined,
});

/** Which of the card's three sticker levels a sticker paints on. */
export type StickerLevel = "back" | "front" | "over";
export const stickerLevel = (s: CardSticker): StickerLevel => !s.front ? "back" : s.over ? "over" : "front";

/** The stickers on one level of the card (paint order), never interactive:
 * behind the card · in front of its background (under its blocks) · above all. */
export function StickerLayer({ stickers, cardW, cardH, level }: {
  stickers: readonly CardSticker[]; cardW: number; cardH: number; level: StickerLevel;
}) {
  const list = stickers.filter(s => !s.hidden && stickerLevel(s) === level && s.src);
  if (!list.length) return null;
  return (
    <>
      {list.map(st => (
        <img key={st.id} src={st.src} alt="" aria-hidden draggable={false} data-mnemo-sticker=""
          style={{ ...pos(stickerRect(st, cardW, cardH), st.rotation), opacity: st.opacity ?? 1,
            pointerEvents: "none", userSelect: "none", objectFit: "fill", display: "block" }} />
      ))}
    </>
  );
}

type Gesture =
  | { kind: "move"; ids: string[]; start: { x: number; y: number }; from: Map<string, Rect> }
  | { kind: "scale"; id: string; center: { x: number; y: number }; startDist: number; from: Rect; aspect: number }
  | { kind: "rotate"; id: string; center: { x: number; y: number }; startAngle: number; from: number };

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

/** The edit mode over the card (only while this card's stickers are being edited). */
export type StickerPreview = Map<string, { r: Rect; rotation: number }>;

/** The stickers with a gesture's live preview applied (the card draws these). */
export function withPreview(stickers: readonly CardSticker[], preview: StickerPreview | null, cardW: number, cardH: number): readonly CardSticker[] {
  if (!preview || !preview.size) return stickers;
  return stickers.map(st => {
    const p = preview.get(st.id);
    return p ? { ...st, ...rectToSticker(p.r, cardW, cardH), rotation: p.rotation } : st;
  });
}

export function StickerEditor({ stickers, cardW, cardH, onCommit, onPreview }: {
  stickers: readonly CardSticker[]; cardW: number; cardH: number;
  onCommit: (next: CardSticker[]) => void;
  /** The gesture's live preview (null when it ends) — the card draws it. */
  onPreview: (preview: StickerPreview | null) => void;
}) {
  const { selected } = useStickerEditing();
  const area = stickerArea(cardW, cardH);
  const [draft, setDraftState] = useState<StickerPreview | null>(null);
  const draftRef = useRef<StickerPreview | null>(null);
  const setDraft = (d: StickerPreview | null) => { draftRef.current = d; setDraftState(d); onPreview(d); };
  const gestureRef = useRef<Gesture | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Latest values for the window listeners.
  const live = useRef({ stickers, cardW, cardH, selected, onCommit, setDraft });
  live.current = { stickers, cardW, cardH, selected, onCommit, setDraft };

  const visible = stickers.filter(s => !s.hidden);
  const geom = (st: CardSticker) => draft?.get(st.id) ?? { r: stickerRect(st, cardW, cardH), rotation: st.rotation ?? 0 };

  /** Write the draft (or a computed change) as ONE patch. */
  function commit(changes: Map<string, { r: Rect; rotation: number }>) {
    const { stickers: list, cardW: w, cardH: h, onCommit: write } = live.current;
    write(list.map(st => {
      const c = changes.get(st.id);
      return c ? { ...st, ...rectToSticker(c.r, w, h), rotation: Math.round(c.rotation * 10) / 10 || undefined } : st;
    }));
  }

  // Pointer gestures (window listeners while a gesture runs).
  useEffect(() => {
    function move(e: MouseEvent) {
      const g = gestureRef.current;
      if (!g) return;
      const { stickers: list, cardW: w, cardH: h, setDraft } = live.current;
      const ar = stickerArea(w, h);
      const byId = new Map(list.map(s => [s.id, s]));
      if (g.kind === "move") {
        let dx = e.clientX - g.start.x, dy = e.clientY - g.start.y;
        // The whole group stays inside the area.
        for (const r of g.from.values()) {
          dx = Math.min(Math.max(dx, ar.x - r.x), ar.x + ar.w - r.x - r.w);
          dy = Math.min(Math.max(dy, ar.y - r.y), ar.y + ar.h - r.y - r.h);
        }
        const next = new Map<string, { r: Rect; rotation: number }>();
        for (const [id, r] of g.from) next.set(id, { r: { ...r, x: r.x + dx, y: r.y + dy }, rotation: byId.get(id)?.rotation ?? 0 });
        setDraft(next);
      } else if (g.kind === "scale") {
        const d = Math.hypot(e.clientX - g.center.x, e.clientY - g.center.y);
        const size = clampSize(g.from.w * (d / Math.max(1, g.startDist)), g.aspect, ar);
        const cx = g.from.x + g.from.w / 2, cy = g.from.y + g.from.h / 2;
        const r = clampIntoArea({ x: cx - size.w / 2, y: cy - size.h / 2, w: size.w, h: size.h }, ar);
        setDraft(new Map([[g.id, { r, rotation: byId.get(g.id)?.rotation ?? 0 }]]));
      } else {
        let deg = g.from + (Math.atan2(e.clientY - g.center.y, e.clientX - g.center.x) * 180) / Math.PI - g.startAngle;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        deg = ((deg + 540) % 360) - 180;
        const st = byId.get(g.id);
        if (st) setDraft(new Map([[g.id, { r: stickerRect(st, w, h), rotation: deg }]]));
      }
    }
    function up() {
      if (!gestureRef.current) return;
      gestureRef.current = null;
      const d = draftRef.current;
      if (d && d.size) commit(d);
      live.current.setDraft(null);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard while editing: Supr deletes, arrows nudge (Shift ×10), Enter / Esc apply.
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (isTyping(e.target)) return;
      const { stickers: list, cardW: w, cardH: h, selected: sel, onCommit: write } = live.current;
      // Enter on a focused button / link activates it (not "apply").
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "Enter" && (tag === "BUTTON" || tag === "A")) return;
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault(); e.stopImmediatePropagation();
        stickerEditing.apply();
        return;
      }
      if (!sel.size) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault(); e.stopImmediatePropagation();
        write(list.filter(s => !sel.has(s.id)));
        stickerEditing.select([]);
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const ar = stickerArea(w, h);
      const changes = new Map<string, { r: Rect; rotation: number }>();
      for (const st of list) {
        if (!sel.has(st.id)) continue;
        const r = stickerRect(st, w, h);
        changes.set(st.id, { r: clampIntoArea({ ...r, x: r.x + d[0], y: r.y + d[1] }, ar), rotation: st.rotation ?? 0 });
      }
      commit(changes);
    }
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Screen point of a card-relative point. */
  function screen(x: number, y: number) {
    const b = boxRef.current?.getBoundingClientRect();
    return { x: (b?.left ?? 0) + (x - area.x), y: (b?.top ?? 0) + (y - area.y) };
  }

  function startMove(e: React.MouseEvent, st: CardSticker) {
    e.preventDefault(); e.stopPropagation();
    let ids: string[];
    if (e.shiftKey) {
      const next = new Set(selected);
      if (next.has(st.id)) next.delete(st.id); else next.add(st.id);
      ids = [...next];
      stickerEditing.select(ids);
      if (!next.has(st.id)) return;
    } else {
      ids = selected.has(st.id) ? [...selected] : [st.id];
      if (!selected.has(st.id)) stickerEditing.select(ids);
    }
    const from = new Map<string, Rect>();
    for (const s of stickers) if (ids.includes(s.id)) from.set(s.id, stickerRect(s, cardW, cardH));
    gestureRef.current = { kind: "move", ids, start: { x: e.clientX, y: e.clientY }, from };
  }
  function startScale(e: React.MouseEvent, st: CardSticker) {
    e.preventDefault(); e.stopPropagation();
    const r = stickerRect(st, cardW, cardH);
    const center = screen(r.x + r.w / 2, r.y + r.h / 2);
    gestureRef.current = { kind: "scale", id: st.id, center, startDist: Math.hypot(e.clientX - center.x, e.clientY - center.y), from: r, aspect: st.aspect };
  }
  function startRotate(e: React.MouseEvent, st: CardSticker) {
    e.preventDefault(); e.stopPropagation();
    const r = stickerRect(st, cardW, cardH);
    const center = screen(r.x + r.w / 2, r.y + r.h / 2);
    gestureRef.current = {
      kind: "rotate", id: st.id, center,
      startAngle: (Math.atan2(e.clientY - center.y, e.clientX - center.x) * 180) / Math.PI, from: st.rotation ?? 0,
    };
  }

  const single = selected.size === 1 ? visible.find(s => selected.has(s.id)) : undefined;
  const RING = "0 0 0 1px rgba(0,0,0,.55), 0 0 0 2.5px #fff";

  return (
    <div ref={boxRef} data-mnemo-ui="" data-mnemo-sticker-editor=""
      role="group" aria-label="Editando stickers (Enter o Esc para aplicar)"
      onMouseDown={e => { e.stopPropagation(); if (e.target === e.currentTarget) stickerEditing.select([]); }}
      onClick={e => e.stopPropagation()}
      style={{
        position: "absolute", left: area.x, top: area.y, width: area.w, height: area.h, zIndex: 60,
        outline: "1.5px dashed rgba(255,255,255,.7)", outlineOffset: 0, borderRadius: 14,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.35)", cursor: "default",
      }}>
      <div aria-hidden style={{
        position: "absolute", left: "50%", top: -30, transform: "translateX(-50%)", whiteSpace: "nowrap",
        padding: "4px 10px", borderRadius: 999, background: "rgba(14,12,18,.86)", color: "#fff",
        font: "600 11.5px/1.2 system-ui, sans-serif", pointerEvents: "none",
      }}>Editando stickers · Aplicar en el menú</div>
      {visible.map(st => {
        const g = geom(st);
        const r = { ...g.r, x: g.r.x - area.x, y: g.r.y - area.y };
        const isSel = selected.has(st.id);
        return (
          <div key={st.id} data-sticker-id={st.id} onMouseDown={e => startMove(e, st)}
            style={{ ...pos(r, g.rotation), cursor: "move", boxShadow: isSel ? RING : "0 0 0 1px rgba(255,255,255,.45)", borderRadius: 2 }}>
            {single?.id === st.id && (
              <>
                {(["nw", "ne", "sw", "se"] as const).map(c => (
                  <span key={c} onMouseDown={e => startScale(e, st)} aria-hidden
                    style={{
                      position: "absolute", width: 12, height: 12, borderRadius: 3, background: "#fff",
                      boxShadow: "0 0 0 1px rgba(0,0,0,.5)", cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize",
                      left: c.includes("w") ? -6 : undefined, right: c.includes("e") ? -6 : undefined,
                      top: c.includes("n") ? -6 : undefined, bottom: c.includes("s") ? -6 : undefined,
                    }} />
                ))}
                <span onMouseDown={e => startRotate(e, st)} aria-hidden title="Rotar (Mayús: de a 15°)"
                  style={{
                    position: "absolute", left: "50%", top: -28, width: 14, height: 14, marginLeft: -7, borderRadius: 999,
                    background: "#fff", boxShadow: "0 0 0 1px rgba(0,0,0,.5)", cursor: "grab",
                  }} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

