"use client";
/**
 * Muro v3 (2026-11-26): the Muro tab of the card inspector — five parts like
 * the other groups. Muro (show it, who can write) · Fondo (the card's or its
 * own: the same background menu as the card) · Efectos (the card's, none, or
 * its own: the same effects gallery) · Textos · Botón (icon or your image,
 * shape, size, color; dragged on the card like the other blocks).
 *
 * Every part but Botón shows the back of the card while you edit it
 * (CanvasBoard); Botón shows the front, where the button lives.
 */
import React from "react";
import type { CardEffects, CommentsBoxStyle, ProfileCardData, WallButtonIcon } from "@/types";
import { SliderRow, ColorRow, SwitchRow, MenuRow, Tabs, ChoiceTiles, UploadField, FontField, MenuNote } from "@/ui";
import { useWallSettings } from "@/hooks/useWall";
import { uploadToStorage } from "@/lib/storage";
import { CANVAS_FONTS } from "@/lib/fontList";
import { COMMENTS_RADIUS } from "@/lib/comments";
import { resolveWallLook, wallModes, wallOwnBg } from "@/lib/wall";
import { wallButtonSize } from "@/lib/profileCardLayout";
import { flipButtonOf, WALL_ICONS } from "@/components/wall/FlipControl";
import ProfileBackgroundMenu from "./ProfileBackgroundMenu";
import { CardEffectsSection } from "./ProfileEffectsMenu";

type Patch = Partial<Pick<ProfileCardData, "commentsBox" | "wallEffects">>;
interface SectionProps { card: ProfileCardData; onChange: (p: Patch) => void }

function useWallStyle({ card, onChange }: SectionProps) {
  const raw = card.commentsBox;
  const setStyle = (patch: Partial<CommentsBoxStyle>) => {
    const next: CommentsBoxStyle = { ...raw, ...patch };
    for (const k of Object.keys(next) as (keyof CommentsBoxStyle)[]) if (next[k] === undefined) delete next[k];
    onChange({ commentsBox: Object.keys(next).length ? next : undefined });
  };
  const setWallEffects = (fx: CardEffects) => onChange({ wallEffects: Object.keys(fx).length ? fx : undefined });
  return { raw, setStyle, setWallEffects };
}

const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 10 };

// ── Muro: show it · who can write ────────────────────────────────────────────
export function WallMainSection(p: SectionProps) {
  const { raw, setStyle } = useWallStyle(p);
  const w = useWallSettings();
  return (
    <div style={stack}>
      <SwitchRow label="Mostrar el muro" icon="eye" value={!raw?.hidden} onChange={v => setStyle({ hidden: v ? undefined : true })} />
      {!raw?.hidden && (
        <MenuRow label="Quién puede escribir">
          <Tabs label="Quién puede escribir" variant="pill" active={w.off ? "me" : "all"} onChange={id => w.setOff(id === "me")}
            tabs={[{ id: "all", label: "Todos" }, { id: "me", label: "Solo yo" }]} />
        </MenuRow>
      )}
    </div>
  );
}

// ── Fondo: the card's or its own ─────────────────────────────────────────────
export function WallBgSection(p: SectionProps) {
  const { raw, setStyle, setWallEffects } = useWallStyle(p);
  const { bgMode } = wallModes(p.card);
  const look = resolveWallLook(p.card);
  const own = { ...p.card.wallEffects, ...wallOwnBg(p.card) } as CardEffects;
  return (
    <div style={stack}>
      <Tabs label="Fondo del muro" variant="pill" active={bgMode} onChange={id => {
        if (id === "own" && !p.card.wallEffects?.bg && !raw?.bg) {
          // Starts from what the back shows now, so nothing jumps.
          setWallEffects({ ...p.card.wallEffects, bg: { color: look.bg } });
        }
        setStyle({ bgMode: id as "card" | "own" });
      }} tabs={[{ id: "card", label: "Como la card" }, { id: "own", label: "Propio" }]} />
      {bgMode === "own" && (
        <ProfileBackgroundMenu effective={own} raw={own} onChange={patch => {
          const next = { ...p.card.wallEffects, bg: patch.bg, gradient: patch.gradient };
          if (!next.bg) delete next.bg;
          if (!next.gradient) delete next.gradient;
          setWallEffects(next);
          if (raw?.bg || raw?.bgImage || raw?.opacity !== undefined) setStyle({ bg: undefined, bgImage: undefined, opacity: undefined });
        }} />
      )}
      <SliderRow label="Redondez" icon="corner" min={COMMENTS_RADIUS.min} max={COMMENTS_RADIUS.max} step={1} value={look.radius}
        fmt={v => `${Math.round(v)} px`} onChange={v => setStyle({ radius: v })} />
    </div>
  );
}

// ── Efectos: the card's, none, or its own ────────────────────────────────────
export function WallFxSection(p: SectionProps) {
  const { setStyle, setWallEffects } = useWallStyle(p);
  const { fxMode } = wallModes(p.card);
  const own = p.card.wallEffects ?? {};
  return (
    <div style={stack}>
      <Tabs label="Efectos del muro" variant="pill" active={fxMode} onChange={id => setStyle({ fxMode: id as "card" | "none" | "own", fx: undefined })}
        tabs={[{ id: "card", label: "Como la card" }, { id: "none", label: "Ninguno" }, { id: "own", label: "Propios" }]} />
      {fxMode === "own" && (
        <CardEffectsSection effective={own} raw={own} onChange={patch => {
          // The effects menu writes the whole effects object; the wall's own background stays.
          setWallEffects({ ...patch, bg: own.bg, gradient: own.gradient });
        }} />
      )}
    </div>
  );
}

// ── Textos ───────────────────────────────────────────────────────────────────
export function WallTextSection(p: SectionProps) {
  const { raw, setStyle } = useWallStyle(p);
  const look = resolveWallLook(p.card);
  return (
    <div style={stack}>
      <FontField label="Fuente del muro" value={look.font} fonts={CANVAS_FONTS} sample={`@${p.card.handle || "vos"}`}
        modified={!!raw?.font} onReset={() => setStyle({ font: undefined })} onChange={v => setStyle({ font: v })} />
      <ColorRow label="Texto" value={look.color} onChange={v => setStyle({ color: v })}
        state={raw?.color ? "modified" : undefined} onReset={() => setStyle({ color: undefined })} />
      <ColorRow label="Acento" value={look.accent} onChange={v => setStyle({ accent: v })}
        state={raw?.accent ? "modified" : undefined} onReset={() => setStyle({ accent: undefined })} />
    </div>
  );
}

// ── Botón ────────────────────────────────────────────────────────────────────
const ICON_DRAW: Record<WallButtonIcon, React.ReactNode> = {
  feed: <g transform="translate(14 2) scale(1.15)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4.5" y="3.5" width="15" height="17" rx="2.6" /><path d="M8 8h8M8 11.5h8M8 15h5" /></g>,
  stack: <g transform="translate(14 2) scale(1.15)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="9" width="16" height="11" rx="2.5" /><path d="M6.5 6h11M9 3h6" /><path d="M8 13.5h8M8 16.5h5" /></g>,
  bubble: <g transform="translate(14 2) scale(1.15)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5c0 4-3.6 7-8 7-1.2 0-2.3-.2-3.3-.6L4 19.5l1.3-3.6C4.5 14.7 4 13.2 4 11.5c0-4 3.6-7 8-7s8 3 8 7Z" /><path d="M8.5 10h7M8.5 13h4.5" /></g>,
  pencil: <g transform="translate(14 2) scale(1.15)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h9l5 5v12H5z" /><path d="M14 3.5v5h5" /><path d="M8.5 13h7M8.5 16.5h4" /></g>,
};
const ICON_LABEL: Record<WallButtonIcon, string> = { feed: "Feed", stack: "Posts", bubble: "Globo", pencil: "Nota" };

export function WallButtonSection(p: SectionProps) {
  const { raw, setStyle } = useWallStyle(p);
  const b = flipButtonOf(raw);
  const setButton = (patch: Partial<NonNullable<CommentsBoxStyle["button"]>>) => {
    const next = { ...raw?.button, ...patch };
    for (const k of Object.keys(next) as (keyof typeof next)[]) if (next[k] === undefined) delete next[k];
    setStyle({ button: Object.keys(next).length ? next : undefined });
  };
  const onImage = async (f: File) => {
    const { publicUrl } = await uploadToStorage(f);
    setButton({ image: publicUrl });
  };
  return (
    <div style={stack}>
      <MenuNote>Arrastralo sobre la card para cambiarlo de lugar; se acomoda solo para no tapar nada.</MenuNote>
      {!b.image && (
        <ChoiceTiles label="Ícono" columns={4} value={b.icon} onChange={id => setButton({ icon: id === "feed" ? undefined : id as WallButtonIcon })}
          options={WALL_ICONS.map(id => ({ id, label: ICON_LABEL[id], draw: ICON_DRAW[id] }))} />
      )}
      <UploadField kind="avatar" value={b.image} label="Tu imagen" caption="Imagen" accept="image/*,image/gif" compact
        onFile={onImage} onRemove={() => setButton({ image: undefined })} />
      <MenuRow label="Forma">
        <Tabs label="Forma del botón" variant="pill" active={b.shape} onChange={id => setButton({ shape: id === "circle" ? undefined : "none" })}
          tabs={[{ id: "circle", label: "Círculo" }, { id: "none", label: "Suelto" }]} />
      </MenuRow>
      <SliderRow label="Tamaño" icon="maximize" min={24} max={64} step={1} value={wallButtonSize(p.card)} fmt={v => `${Math.round(v)} px`}
        defaultValue={34} onChange={v => setButton({ size: v === 34 ? undefined : v })} />
      <ColorRow label="Color" value={b.color ?? "#16141c"} onChange={v => setButton({ color: v })}
        state={b.color ? "modified" : undefined} onReset={() => setButton({ color: undefined })} />
    </div>
  );
}
