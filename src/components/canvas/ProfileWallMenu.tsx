"use client";
/**
 * Muro v2 (2026-11-26): Tarjeta › Muro — the wall's own settings. Opening this
 * part turns the card around in the editor, so every change shows live on the
 * back. Unset values follow the card (background, corners, text color,
 * effects); each can be made the wall's own. "Quién escribe" applies at once
 * (profiles.comments_off); the rest goes out with the card.
 */
import React from "react";
import type { CommentsBoxStyle, ProfileCardData } from "@/types";
import { SliderRow, ColorRow, SwitchRow, MenuSection, ChoiceTiles, UploadField, FontField, MenuNote } from "@/ui";
import { useWallSettings } from "@/hooks/useWall";
import { uploadToStorage } from "@/lib/storage";
import { CANVAS_FONTS } from "@/lib/fontList";
import { COMMENTS_OPACITY, COMMENTS_RADIUS } from "@/lib/comments";
import { resolveWallLook } from "@/lib/wall";
import { flipButtonOf, FLIP_BTN_DEFAULT } from "@/components/wall/FlipControl";

type Patch = Partial<Pick<ProfileCardData, "commentsBox">>;

export default function ProfileWallMenu({ card, onChange }: { card: ProfileCardData; onChange: (p: Patch) => void }) {
  const w = useWallSettings();
  const raw = card.commentsBox;
  const look = resolveWallLook(card);
  const btn = flipButtonOf(raw);
  const setStyle = (patch: Partial<CommentsBoxStyle>) => {
    const next: CommentsBoxStyle = { ...raw, ...patch };
    for (const k of Object.keys(next) as (keyof CommentsBoxStyle)[]) if (next[k] === undefined) delete next[k];
    onChange({ commentsBox: Object.keys(next).length ? next : undefined });
  };
  const setButton = (patch: Partial<NonNullable<CommentsBoxStyle["button"]>>) => {
    const next = { ...raw?.button, ...patch };
    for (const k of Object.keys(next) as (keyof typeof next)[]) if (next[k] === undefined) delete next[k];
    setStyle({ button: Object.keys(next).length ? next : undefined });
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const px = (v: number) => `${Math.round(v)} px`;
  const shown = !raw?.hidden;
  const onBgFile = async (f: File) => {
    const { publicUrl } = await uploadToStorage(f);
    setStyle({ bgImage: publicUrl });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <SwitchRow label="Mostrar el muro" icon="eye" value={shown} onChange={v => setStyle({ hidden: v ? undefined : true })} />
      {shown && (
        <>
          <MenuSection label="Quién escribe" icon="quote" pinned>
            <ChoiceTiles label="Quién escribe" columns={2} value={w.off ? "me" : "all"} onChange={id => w.setOff(id === "me")}
              options={[{ id: "all", label: "Todos", draw: PEOPLE }, { id: "me", label: "Solo yo", draw: PERSON }]} />
          </MenuSection>

          <MenuSection label="Fondo" icon="frame" pinned>
            <ChoiceTiles label="Fondo del muro" columns={2} value={look.ownBg ? "own" : "card"}
              onChange={id => setStyle(id === "card" ? { bg: undefined, bgImage: undefined } : { bg: look.bg })}
              options={[{ id: "card", label: "Como la card", draw: SAME }, { id: "own", label: "Propio", draw: OWN }]} />
            {look.ownBg && (
              <>
                <ColorRow label="Color" value={look.bg} onChange={v => setStyle({ bg: v })} />
                <UploadField kind="cover" value={raw?.bgImage || null} label="Subir imagen o GIF" accept="image/*,image/gif"
                  onFile={onBgFile} onRemove={() => setStyle({ bgImage: undefined })} />
              </>
            )}
            <SliderRow label="Opacidad" icon="eye" min={COMMENTS_OPACITY.min} max={COMMENTS_OPACITY.max} step={0.01}
              value={typeof raw?.opacity === "number" ? raw.opacity : 1} fmt={pct} defaultValue={1}
              onChange={v => setStyle({ opacity: v >= 0.999 ? undefined : v })} />
            <SliderRow label="Redondez" icon="corner" min={COMMENTS_RADIUS.min} max={COMMENTS_RADIUS.max} step={1} value={look.radius} fmt={px}
              onChange={v => setStyle({ radius: v })} />
            <SwitchRow label="Efectos de la card" icon="sparkles" value={look.fx} onChange={v => setStyle({ fx: v ? undefined : false })} />
          </MenuSection>

          <MenuSection label="Textos" icon="text" pinned>
            <FontField label="Fuente del muro" value={look.font} fonts={CANVAS_FONTS} sample={`@${card.handle || "vos"}`}
              modified={!!raw?.font} onReset={() => setStyle({ font: undefined })} onChange={v => setStyle({ font: v })} />
            <ColorRow label="Texto" value={look.color} onChange={v => setStyle({ color: v })}
              state={raw?.color ? "modified" : undefined} onReset={() => setStyle({ color: undefined })} />
            <ColorRow label="Acento" value={look.accent} onChange={v => setStyle({ accent: v })}
              state={raw?.accent ? "modified" : undefined} onReset={() => setStyle({ accent: undefined })} />
          </MenuSection>

          <MenuSection label="Botón" icon="move" pinned>
            <MenuNote>Arrastralo sobre la card para cambiarlo de lugar.</MenuNote>
            <SliderRow label="Tamaño" icon="maximize" min={22} max={56} step={1} value={btn.size} fmt={px} defaultValue={FLIP_BTN_DEFAULT.size}
              onChange={v => setButton({ size: v === FLIP_BTN_DEFAULT.size ? undefined : v })} />
            <ColorRow label="Color" value={btn.color ?? "#16141c"} onChange={v => setButton({ color: v })}
              state={btn.color ? "modified" : undefined} onReset={() => setButton({ color: undefined })} />
          </MenuSection>
        </>
      )}
    </div>
  );
}

// 48×32 drawings (currentColor).
const head = (cx: number, o = 1) => (
  <g fill="currentColor" opacity={o}><circle cx={cx} cy="12" r="4.2" /><path d={`M${cx - 7} 27a7 7 0 0 1 14 0z`} /></g>
);
const PEOPLE = <g>{head(14, 0.5)}{head(34, 0.5)}{head(24)}</g>;
const PERSON = <g>{head(24)}</g>;
const SAME = <g><rect x="6" y="5" width="16" height="22" rx="3" fill="currentColor" opacity={0.55} /><rect x="26" y="5" width="16" height="22" rx="3" fill="currentColor" opacity={0.55} /></g>;
const OWN = <g><rect x="6" y="5" width="16" height="22" rx="3" fill="currentColor" opacity={0.25} /><rect x="26" y="5" width="16" height="22" rx="3" fill="currentColor" /></g>;
