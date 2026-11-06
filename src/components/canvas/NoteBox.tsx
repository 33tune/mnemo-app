"use client";
/**
 * Notas (2026-11-06): the box above the card. Always there in the editor
 * (a "Escribí una nota…" invitation when empty — a tap opens the card's Nota
 * part); on the profile only while a note is active. Fixed place: centered
 * over the card's top edge, moving with it. Not in the story capture
 * (data-export-skip).
 */
import React from "react";
import type { ProfileCardData } from "@/types";
import { useNote } from "@/hooks/useNote";
import { NOTE_BOX_W, NOTE_BOX_GAP, resolveNoteBox, noteSurface, noteText, hoursAgo, hoursLeft } from "@/lib/noteBox";
import { EyeIcon } from "./StatsRow";

export default function NoteBox({ card, ownerUserId, editor, onOpen }: {
  card: ProfileCardData;
  ownerUserId?: string;
  /** The owner's editor: always shown, a tap opens the Nota part. */
  editor: boolean;
  onOpen?: () => void;
}) {
  const n = useNote(ownerUserId, { countView: !editor });
  const st = resolveNoteBox(card.noteBox);
  if (!n.note && (!editor || !n.loaded)) return null;
  const empty = !n.note;
  const meta = n.note
    ? editor
      ? `${hoursLeft(n.note.expires_at)} · ${n.views}`
      : st.showViews ? `${hoursAgo(n.note.created_at)} · ${n.views}` : hoursAgo(n.note.created_at)
    : null;
  const showEye = !!n.note && (editor || st.showViews);
  return (
    <div data-export-skip="" data-role="note"
      onMouseDown={editor ? e => e.stopPropagation() : undefined}
      onClick={editor ? e => { e.stopPropagation(); onOpen?.(); } : undefined}
      role={editor ? "button" : undefined}
      tabIndex={editor ? 0 : undefined}
      aria-label={editor ? (empty ? "Escribir una nota" : "Editar la nota") : undefined}
      onKeyDown={editor ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOpen?.(); } } : undefined}
      style={{
        position: "absolute", left: "50%", bottom: `calc(100% + ${NOTE_BOX_GAP}px)`,
        width: NOTE_BOX_W, transform: `translateX(-50%) scale(${st.scale})`, transformOrigin: "50% 100%",
        zIndex: 60, cursor: editor ? "pointer" : "default", userSelect: "none",
        pointerEvents: editor ? "auto" : "none",
      }}>
      <div style={{
        ...noteSurface(st),
        ...(empty ? { background: "transparent", backdropFilter: "none", WebkitBackdropFilter: "none", boxShadow: "none", outline: "1.5px dashed rgba(255,255,255,0.55)", outlineOffset: -1.5 } : {}),
        padding: "10px 14px", boxSizing: "border-box", textAlign: "center",
      }}>
        <div style={{ ...noteText(st), ...(empty ? { color: "rgba(255,255,255,0.75)", fontStyle: "italic" } : {}) }}>
          {empty ? "Escribí una nota…" : n.note!.body}
        </div>
        {meta && (
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            font: "500 10.5px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", color: st.color, opacity: 0.6 }}>
            <span>{meta.split(" · ").slice(0, showEye ? -1 : undefined).join(" · ")}</span>
            {showEye && <><span>·</span><EyeIcon size={11} /><span>{n.views}</span></>}
          </div>
        )}
      </div>
    </div>
  );
}
