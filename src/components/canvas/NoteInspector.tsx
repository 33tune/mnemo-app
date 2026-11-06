"use client";
/**
 * Notas (2026-11-06, v2): the note box's own panel — opened from its gear,
 * not from the card's menu. The note itself is written on the box (a tap,
 * Enter publishes); here: its state (time left, views, delete) and the box's
 * look — size (only a little), color, roundness, opacity (glass below
 * 100 %), the text's font / size / color and whether visitors see the views.
 * The look goes out with "Publicar" like the rest of the card; the note
 * publishes on its own.
 */
import React from "react";
import type { NoteBoxStyle, ProfileCardData } from "@/types";
import { InspectorShell, MenuSection, SliderRow, ColorRow, FontField, SwitchRow, ActionButton, MenuNote } from "@/ui";
import { CANVAS_FONTS } from "@/lib/fontList";
import { useNote } from "@/hooks/useNote";
import { useViewerId } from "@/lib/viewer";
import { NOTE_SIZE, NOTE_OPACITY, NOTE_RADIUS, NOTE_FONT_SIZE, NOTE_DEFAULTS, resolveNoteBox, noteBoxWidth, noteBoxHeight, hoursAgo, hoursLeft } from "@/lib/noteBox";

export interface NoteInspectorProps {
  card: ProfileCardData;
  onChange: (p: Partial<Pick<ProfileCardData, "noteBox">>) => void;
  id?: string;
  onClose: () => void;
  returnFocusTo: () => HTMLElement | null;
  top: number;
  width: number;
  mode: "dock" | "sheet";
  height?: number;
  collapsed: boolean;
  onExpand: () => void;
}

export default function NoteInspector(p: NoteInspectorProps) {
  const { card, onChange } = p;
  const me = useViewerId();
  const n = useNote(me ?? undefined);
  const raw = card.noteBox;
  const st = resolveNoteBox(raw);
  const setStyle = (patch: Partial<NoteBoxStyle>) => {
    const next = { ...raw, ...patch };
    for (const k of Object.keys(next) as (keyof NoteBoxStyle)[]) if (next[k] === undefined) delete next[k];
    onChange({ noteBox: Object.keys(next).length ? next : undefined });
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const px = (v: number) => `${Math.round(v)} px`;

  return (
    <InspectorShell id={p.id} title="Nota" icon="quote" path="cuadro sobre la card"
      onClose={p.onClose} returnFocusTo={p.returnFocusTo} top={p.top} width={p.width} mode={p.mode}
      height={p.height} collapsed={p.collapsed} onExpand={p.onExpand}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <MenuSection label="Nota" pinned>
          {n.note ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 14, lineHeight: 1.35, overflowWrap: "anywhere" }}>{n.note.body}</div>
              <MenuNote icon="eye">
                {`${hoursAgo(n.note.created_at)} · ${hoursLeft(n.note.expires_at)} · vista por ${n.views} ${n.views === 1 ? "persona" : "personas"}`}
              </MenuNote>
              <ActionButton variant="danger" onClick={e => { e.stopPropagation(); n.remove(); }}>Borrar nota</ActionButton>
            </div>
          ) : null}
          <MenuNote>Tocá el cuadro para escribir. Dura 24 horas y les avisa a quienes te dieron favorito. Nadie puede responderla.</MenuNote>
        </MenuSection>

        <MenuSection label="Cuadro" icon="frame" summary={`${noteBoxWidth(st)} × ${noteBoxHeight(st)} px · ${pct(st.opacity)}`}>
          <SliderRow label="Ancho" icon="maximize" min={NOTE_SIZE.min} max={NOTE_SIZE.max} step={0.01} value={st.w} fmt={pct}
            defaultValue={NOTE_DEFAULTS.w} onChange={v => setStyle({ w: v })} />
          <SliderRow label="Alto" icon="height" min={NOTE_SIZE.min} max={NOTE_SIZE.max} step={0.01} value={st.h} fmt={pct}
            defaultValue={NOTE_DEFAULTS.h} onChange={v => setStyle({ h: v })} />
          <ColorRow label="Color" value={st.bg} onChange={v => setStyle({ bg: v })}
            state={raw?.bg ? "modified" : undefined} onReset={() => setStyle({ bg: undefined })} />
          <SliderRow label="Redondez" icon="corner" min={NOTE_RADIUS.min} max={NOTE_RADIUS.max} step={1} value={st.radius} fmt={px}
            defaultValue={NOTE_DEFAULTS.radius} onChange={v => setStyle({ radius: v })} />
          <SliderRow label="Opacidad" icon="eye" min={NOTE_OPACITY.min} max={NOTE_OPACITY.max} step={0.01} value={st.opacity} fmt={pct}
            defaultValue={NOTE_DEFAULTS.opacity} onChange={v => setStyle({ opacity: v })} />
          <MenuNote>Por debajo de 100 % el cuadro se vuelve vidrio esmerilado. El texto nunca pierde opacidad. Si lo cambiás, en tu perfil se ve aunque no tengas nota.</MenuNote>
        </MenuSection>

        <MenuSection label="Texto" icon="case" summary={`${CANVAS_FONTS.find(f => f.key === st.font)?.label ?? st.font} · ${st.fontSize} px`}>
          <FontField value={st.font} onChange={v => setStyle({ font: v })} fonts={CANVAS_FONTS} label="Fuente de la nota"
            modified={!!raw?.font} onReset={() => setStyle({ font: undefined })} sample="Aa" />
          <SliderRow label="Tamaño" icon="text" min={NOTE_FONT_SIZE.min} max={NOTE_FONT_SIZE.max} step={1} value={st.fontSize} fmt={px}
            defaultValue={NOTE_DEFAULTS.fontSize} onChange={v => setStyle({ fontSize: v })} />
          <ColorRow label="Color" value={st.color} onChange={v => setStyle({ color: v })}
            state={raw?.color ? "modified" : undefined} onReset={() => setStyle({ color: undefined })} />
        </MenuSection>

        <MenuSection label="Vistas" icon="eye" summary={st.showViews ? "Visibles" : "Solo vos"}>
          <SwitchRow label="Mostrar vistas a los visitantes" icon="eye" value={st.showViews} onChange={v => setStyle({ showViews: v || undefined })} />
          <MenuNote>Vos siempre ves cuánta gente la vio. Nunca quiénes.</MenuNote>
        </MenuSection>
      </div>
    </InspectorShell>
  );
}
