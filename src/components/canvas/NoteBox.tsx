"use client";
/**
 * Notas (2026-11-06, v2 — feedback del usuario): the note box is a WIDGET of
 * its own, always above the card (not a part of it: the card's motion —
 * floating, hover scale, entrance — never moves it under the card's texts).
 *
 * - One fixed size for a given style (with or without a note), so a
 *   decoration placed around it always fits.
 * - Editor: always there, drawn with the owner's style even when empty (no
 *   placeholder text). A tap writes right there (a blinking caret); Enter or
 *   the arrow publishes, Esc / clicking away cancels. The gear stuck to the
 *   box opens its own panel (NoteInspector).
 * - Profile: with an active note, or empty when the owner styled it.
 * - Not in the story capture (data-export-skip).
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ProfileCardData } from "@/types";
import { useNote } from "@/hooks/useNote";
import {
  NOTE_MAX, noteGap, noteBoxWidth, NOTE_PAD_Y, NOTE_META_H, resolveNoteBox, noteSurface, noteText, noteBoxHeight,
  noteBoxVisible, hoursAgo, hoursLeft, noteLength, clipNote,
} from "@/lib/noteBox";
import { EDITOR_UI_ATTR } from "@/lib/editorGuards";
import { Icon } from "@/ui";
import { EyeIcon } from "./StatsRow";
import { CanvasChromeButton } from "./CanvasChromeButton";

export const NOTE_PANEL_ID = "mnemo-note-panel";
export const NOTE_GEAR_ID = "mnemo-note-gear";

const META_FONT = "500 10.5px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export default function NoteBox({ card, ownerUserId, editor, panelOpen, onSelect, onSettings, parallaxTransform, entryDelayMs }: {
  card: ProfileCardData;
  ownerUserId?: string;
  /** The owner's editor (write in place, the gear). */
  editor: boolean;
  /** The gear's panel is open. */
  panelOpen?: boolean;
  /** A tap on the box (the canvas selection clears). */
  onSelect?: () => void;
  onSettings?: () => void;
  /** The card's parallax, so the box stays put above it. */
  parallaxTransform?: string;
  /** Profile: appear a little after the card. */
  entryDelayMs?: number;
}) {
  const n = useNote(ownerUserId, { countView: !editor });
  const st = resolveNoteBox(card.noteBox);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hover, setHoverNow] = useState(false);
  // Leaving the box for the gear crosses a small gap: hide a moment later.
  const hoverT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setHover = (v: boolean) => {
    if (hoverT.current) clearTimeout(hoverT.current);
    if (v) setHoverNow(true); else hoverT.current = setTimeout(() => setHoverNow(false), 400);
  };
  useEffect(() => () => { if (hoverT.current) clearTimeout(hoverT.current); }, []);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const boxH = noteBoxHeight(st);

  // The textarea grows with its lines (the box itself never does).
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [draft, editing, st.fontSize, st.font]);
  useEffect(() => { if (!err) return; const t = setTimeout(() => setErr(null), 3500); return () => clearTimeout(t); }, [err]);

  if (!editor && !noteBoxVisible(!!n.note, card.noteBox)) return null;
  if (editor && !n.loaded) return null;

  const body = n.note?.body ?? "";
  function startEditing() {
    if (!editor || editing) return;
    setDraft(body);
    setEditing(true);
    setErr(null);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });
  }
  const clean = draft.trim();
  const canSend = !!clean && clean !== body && noteLength(clean) <= NOTE_MAX && !busy;
  async function send() {
    if (!clean || clean === body) { setEditing(false); return; }
    if (!canSend) return;
    setBusy(true);
    const e = await n.post(clean);
    setBusy(false);
    if (e) { setErr(e); return; }
    setEditing(false);
  }

  const meta = editing
    ? (err ?? (busy ? "Publicando…" : `${noteLength(draft)}/${NOTE_MAX}`))
    : n.note
      ? editor ? hoursLeft(n.note.expires_at) : hoursAgo(n.note.created_at)
      : null;
  const showEye = !editing && !!n.note && (editor || st.showViews);
  const gearShown = editor && (hover || editing || !!panelOpen);
  const text = noteText(st);
  const boxW = noteBoxWidth(st);
  // Anchor: a zero-size point at the middle of the card's top edge (above
  // it by the gap). Two of them: the box's SURFACE at the bottom of the room
  // (images, the card and its stickers go over it — a frame / bubble can
  // dress it) and its TEXT + tap area on top of everything.
  const anchor = (z: number): React.CSSProperties => ({
    position: "absolute", left: card.x + card.w / 2, top: card.y - noteGap(card), width: 0, height: 0,
    transform: parallaxTransform || undefined, zIndex: z, pointerEvents: "none",
    ...(entryDelayMs != null ? { animation: `mnemo-note-in 0.5s cubic-bezier(0.16,1,0.3,1) ${entryDelayMs}ms backwards` } : {}),
  });
  const place: React.CSSProperties = { position: "absolute", left: 0, bottom: 0, width: boxW, transform: "translateX(-50%)" };

  return (<>
    <div data-export-skip="" data-note-bg="" aria-hidden style={anchor(0)}>
      {entryDelayMs != null && <style>{"@keyframes mnemo-note-in{from{opacity:0;translate:0 8px}to{opacity:1;translate:0 0}}"}</style>}
      <div style={{ ...place, ...noteSurface(st), height: boxH }} />
    </div>
    <div data-export-skip="" data-note-box="" aria-hidden={!editor && !n.note ? true : undefined} style={anchor(4000)}>
      <div
        {...(editor ? { [EDITOR_UI_ATTR]: "" } : {})}
        onMouseEnter={editor ? () => setHover(true) : undefined}
        onMouseLeave={editor ? () => setHover(false) : undefined}
        style={{ ...place, pointerEvents: editor ? "auto" : "none" }}>
        <div
          onMouseDown={editor ? e => { e.stopPropagation(); } : undefined}
          onClick={editor ? e => { e.stopPropagation(); onSelect?.(); startEditing(); } : undefined}
          role={editor && !editing ? "button" : undefined}
          tabIndex={editor && !editing ? 0 : undefined}
          aria-label={editor && !editing ? (n.note ? `Nota: ${body}. Escribir otra` : "Escribir una nota") : undefined}
          onKeyDown={editor && !editing ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onSelect?.(); startEditing(); } } : undefined}
          style={{
            borderRadius: st.radius,
            position: "relative", height: boxH, boxSizing: "border-box", padding: `${NOTE_PAD_Y}px 14px`,
            display: "flex", flexDirection: "column", textAlign: "center",
            cursor: editor ? "text" : "default", userSelect: editing ? "text" : "none",
            ...(editing ? { outline: "2px solid rgba(120,160,255,0.9)", outlineOffset: 3 } : {}),
          }}>
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {editing ? (
              <textarea ref={taRef} value={draft} rows={1} aria-label="Tu nota" spellCheck={false}
                onChange={e => setDraft(clipNote(e.target.value))}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === "Enter") { e.preventDefault(); send(); }
                  else if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
                }}
                onBlur={e => {
                  // Moving to the arrow keeps the draft (it publishes it).
                  if (e.relatedTarget instanceof HTMLElement && e.relatedTarget.dataset.noteSend != null) return;
                  if (!busy) setEditing(false);
                }}
                style={{
                  ...text, width: "100%", display: "block", resize: "none", border: 0, outline: 0, padding: 0, margin: 0,
                  background: "transparent", textAlign: "center", overflow: "hidden", caretColor: st.color,
                }} />
            ) : (
              <div style={{ ...text, width: "100%" }}>{body}</div>
            )}
          </div>
          <div style={{ height: NOTE_META_H, flex: "none", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4,
            font: META_FONT, color: st.color, opacity: err ? 0.9 : 0.6, whiteSpace: "nowrap", overflow: "hidden" }}>
            {meta && <span>{meta}</span>}
            {showEye && <><span>·</span><EyeIcon size={11} /><span>{n.views}</span></>}
          </div>
          {editing && (
            <button type="button" data-note-send="" aria-label="Publicar nota" title="Publicar (Enter)" disabled={!canSend}
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
              onClick={e => { e.stopPropagation(); send(); }}
              style={{
                position: "absolute", right: 6, bottom: 6, width: 24, height: 24, borderRadius: 12, border: 0, padding: 0,
                display: "grid", placeItems: "center", cursor: canSend ? "pointer" : "default",
                background: st.color, color: st.bg, opacity: canSend ? 1 : 0.3,
              }}>
              <Icon name="arrow-up" size={14} />
            </button>
          )}
        </div>
        {gearShown && (
          <CanvasChromeButton id={NOTE_GEAR_ID} icon="gear" label="Configurar la nota" expanded={!!panelOpen} controls={NOTE_PANEL_ID}
            style={{ top: 0, left: `calc(100% + 8px)` }}
            onActivate={() => { setEditing(false); onSettings?.(); }} />
        )}
      </div>
    </div>
  </>);
}
