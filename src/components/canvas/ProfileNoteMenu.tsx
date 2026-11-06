"use client";
/**
 * Notas (2026-11-06): the card's "Nota" part — write / delete the note (one,
 * 24 h, published at once; your favorites get a notice) and the box's look:
 * size (only a little), color, roundness, opacity (glass below 100 %), the
 * text's font / size / color and whether visitors see the views.
 * The note publishes on its own; the look goes out with "Publicar" like the
 * rest of the card.
 */
import React, { useState } from "react";
import type { NoteBoxStyle, ProfileCardData } from "@/types";
import { MenuSection, SliderRow, ColorRow, FontField, SwitchRow, TextArea, ActionButton, MenuNote } from "@/ui";
import { CANVAS_FONTS } from "@/lib/fontList";
import { useNote } from "@/hooks/useNote";
import { useViewerId } from "@/lib/viewer";
import { NOTE_MAX, NOTE_SCALE, NOTE_OPACITY, NOTE_RADIUS, NOTE_FONT_SIZE, NOTE_DEFAULTS, resolveNoteBox, noteLength, hoursAgo, hoursLeft } from "@/lib/noteBox";

type NotePatch = Partial<Pick<ProfileCardData, "noteBox">>;

export default function ProfileNoteMenu({ card, onChange }: { card: ProfileCardData; onChange: (p: NotePatch) => void }) {
  const me = useViewerId();
  const n = useNote(me ?? undefined);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const raw = card.noteBox;
  const st = resolveNoteBox(raw);
  const setStyle = (patch: Partial<NoteBoxStyle>) => {
    const next = { ...raw, ...patch };
    for (const k of Object.keys(next) as (keyof NoteBoxStyle)[]) if (next[k] === undefined) delete next[k];
    onChange({ noteBox: Object.keys(next).length ? next : undefined });
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const px = (v: number) => `${Math.round(v)} px`;
  const len = noteLength(draft);

  async function publish() {
    if (!draft.trim() || len > NOTE_MAX || busy) return;
    setBusy(true); setMsg(null);
    const err = await n.post(draft.trim());
    setBusy(false);
    if (err) setMsg(err); else { setDraft(""); setMsg("Publicada. Dura 24 horas."); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <MenuSection label="Nota" pinned>
        {n.note ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 14, lineHeight: 1.35, overflowWrap: "anywhere" }}>{n.note.body}</div>
            <MenuNote icon="eye">
              {`${hoursAgo(n.note.created_at)} · ${hoursLeft(n.note.expires_at)} · vista por ${n.views} ${n.views === 1 ? "persona" : "personas"}`}
            </MenuNote>
            <ActionButton variant="danger" onClick={e => { e.stopPropagation(); n.remove(); setMsg(null); }}>Borrar nota</ActionButton>
          </div>
        ) : null}
        <TextArea value={draft} onChange={setDraft} placeholder={n.note ? "Escribí otra nota (reemplaza la actual)" : "¿Qué estás pensando?"}
          maxLength={NOTE_MAX} rows={2} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
          <ActionButton variant="primary" disabled={!draft.trim() || len > NOTE_MAX || busy}
            onClick={e => { e.stopPropagation(); publish(); }}>{busy ? "Publicando…" : "Publicar nota"}</ActionButton>
        </div>
        <MenuNote>{msg ?? "Dura 24 horas. Les avisa a quienes te dieron favorito. Nadie puede responderla."}</MenuNote>
      </MenuSection>

      <MenuSection label="Cuadro" icon="frame" summary={`${pct(st.scale)} · ${pct(st.opacity)}`}>
        <SliderRow label="Tamaño" icon="maximize" min={NOTE_SCALE.min} max={NOTE_SCALE.max} step={0.01} value={st.scale} fmt={pct}
          defaultValue={NOTE_DEFAULTS.scale} onChange={v => setStyle({ scale: v })} />
        <ColorRow label="Color" value={st.bg} onChange={v => setStyle({ bg: v })}
          state={raw?.bg ? "modified" : "inherited"} onReset={() => setStyle({ bg: undefined })} />
        <SliderRow label="Redondez" icon="corner" min={NOTE_RADIUS.min} max={NOTE_RADIUS.max} step={1} value={st.radius} fmt={px}
          defaultValue={NOTE_DEFAULTS.radius} onChange={v => setStyle({ radius: v })} />
        <SliderRow label="Opacidad" icon="eye" min={NOTE_OPACITY.min} max={NOTE_OPACITY.max} step={0.01} value={st.opacity} fmt={pct}
          defaultValue={NOTE_DEFAULTS.opacity} onChange={v => setStyle({ opacity: v })} />
        <MenuNote>Por debajo de 100 % el cuadro se vuelve vidrio esmerilado. El texto nunca pierde opacidad.</MenuNote>
      </MenuSection>

      <MenuSection label="Texto" icon="case" summary={`${CANVAS_FONTS.find(f => f.key === st.font)?.label ?? st.font} · ${st.fontSize} px`}>
        <FontField value={st.font} onChange={v => setStyle({ font: v })} fonts={CANVAS_FONTS} label="Fuente de la nota"
          modified={!!raw?.font} onReset={() => setStyle({ font: undefined })} sample="Aa" />
        <SliderRow label="Tamaño" icon="text" min={NOTE_FONT_SIZE.min} max={NOTE_FONT_SIZE.max} step={1} value={st.fontSize} fmt={px}
          defaultValue={NOTE_DEFAULTS.fontSize} onChange={v => setStyle({ fontSize: v })} />
        <ColorRow label="Color" value={st.color} onChange={v => setStyle({ color: v })}
          state={raw?.color ? "modified" : "inherited"} onReset={() => setStyle({ color: undefined })} />
      </MenuSection>

      <MenuSection label="Vistas" icon="eye" summary={st.showViews ? "Visibles" : "Solo vos"}>
        <SwitchRow label="Mostrar vistas a los visitantes" icon="eye" value={st.showViews} onChange={v => setStyle({ showViews: v || undefined })} />
        <MenuNote>Vos siempre ves cuánta gente la vio. Nunca quiénes.</MenuNote>
      </MenuSection>
    </div>
  );
}
