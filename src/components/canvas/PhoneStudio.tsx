"use client";
/**
 * Editor de celular — "Estudio" v2 (2026-11-27, aprobado por el usuario:
 * "me gusta el estilo PicsArt… más opciones desde ahí sin tener que desplegar
 * el Más"). The card stays big; at the bottom a sliding strip of tools
 * (Efectos · Fondo · Texto · Foto · Acomodar · Tamaño · Stickers · Redes ·
 * Botones · Borde · Animar · Todo) and, above it, the panel of the tool in use.
 * Tapping an effect that is on opens ITS settings in place, with ✕ (undo what
 * was changed there) and ✓. The big sheet stays only as "Todo" (every setting).
 *
 * Every write goes through the inspector's onChange and the same writers the
 * menus use (useCardEffectActions, patchEffectGroup, the card's own fields,
 * clampProfileCardSize, the sticker store), so undo, the hover preview and
 * auto-publish behave exactly the same.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CardEffects, CardSticker, ProfileCardData, TextFont } from "@/types";
import type { ObjectId } from "@/lib/inspectorObjects";
import { useCardEffectActions } from "./ProfileEffectsMenu";
import { visibleBgColor } from "./ProfileBackgroundMenu";
import { SAMPLE_STICKERS } from "./ProfileStickersMenu";
import { patchEffectGroup } from "@/lib/effectBinding";
import { GRADIENT_DEFAULT, NAME_FONT_DEFAULT, MONO_ROLE_FONT_DEFAULT, ROLE_TYPOGRAPHY_RANGES, nameFontSizeDefault } from "@/lib/effectEditorDefaults";
import {
  HOLO_DEFAULT_INTENSITY, GLARE_DEFAULT_INTENSITY, GLITTER_DEFAULT_AMOUNT, GLARE_DEFAULT_SIZE, GLITTER_DEFAULT_SIZE, HOLO_STYLES,
  holoOn, glareOn, holoStyleOf,
} from "@/lib/cardFoil";
import { MOTION_DEFAULTS } from "@/lib/cardFx";
import { CANVAS_FONTS } from "@/lib/fontList";
import { getCardPadding, getFreeformCardBounds, getPfpSizeBounds, resolvePfpSize } from "@/lib/cardGeometry";
import { clampProfileCardSize, profileCardMinSize } from "@/lib/profileCardLayout";
import { getTextMeasurer } from "@/lib/textMeasure";
import { resolveCardTypography } from "@/lib/cardTypography";
import { resolveCardColors } from "@/lib/cardColors";
import { CONTACT_LINK_ICON_SIZE } from "@/lib/contactLinksBlock";
import { STICKER_MAX, newSticker } from "@/lib/stickerGeometry";
import { stickerEditing, useStickerEditing } from "@/lib/stickerEditing";
import { uploadToStorage } from "@/lib/storage";
import { detectPlatform, PlatformIcon } from "./SocialIcons";

export const PHONE_STUDIO_H = 252;

type Tool = "fx" | "bg" | "text" | "photo" | "move" | "size" | "stickers" | "links" | "buttons" | "border" | "anim";
const TOOL_OF: Partial<Record<ObjectId, Tool>> = {
  cardFx: "fx", cardBg: "bg", name: "text", handle: "text", descriptor: "text", location: "text", bio: "text", about: "text",
  photo: "photo", links: "links", buttons: "buttons", stickers: "stickers",
};
const OBJ_OF: Record<Tool, ObjectId> = {
  fx: "cardFx", bg: "cardBg", text: "name", photo: "photo", move: "cardFx", size: "cardFx", stickers: "stickers",
  links: "links", buttons: "buttons", border: "cardFx", anim: "cardFx",
};
/** The parts the Estudio edits itself; any other part opens the full sheet. */
export function studioCovers(id: ObjectId): boolean { return id in TOOL_OF; }

const P = (d: React.ReactNode) => d;
const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
  { id: "fx", label: "Efectos", icon: P(<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />) },
  { id: "bg", label: "Fondo", icon: P(<><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M4 15l5-5 4 4 3-3 4 4" /></>) },
  { id: "text", label: "Texto", icon: P(<path d="M5 6h14M12 6v13M9 19h6" />) },
  { id: "photo", label: "Foto", icon: P(<><circle cx="12" cy="10" r="4" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></>) },
  { id: "move", label: "Acomodar", icon: P(<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />) },
  { id: "size", label: "Tamaño", icon: P(<path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" />) },
  { id: "stickers", label: "Stickers", icon: P(<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />) },
  { id: "links", label: "Redes", icon: P(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>) },
  { id: "buttons", label: "Botones", icon: P(<><rect x="4" y="5" width="16" height="6" rx="3" /><rect x="4" y="13" width="16" height="6" rx="3" /></>) },
  { id: "border", label: "Borde", icon: P(<rect x="4" y="4" width="16" height="16" rx="5" strokeWidth="2.6" />) },
  { id: "anim", label: "Animar", icon: P(<path d="M3 15c3-8 5-8 8 0s5 8 8 0" />) },
];

const SWATCHES = ["#0E0C12", "#1d1b26", "#ffffff", "#f5e6d3", "#ffd1e8", "#ff4f94", "#b48cff", "#7fd8ff", "#4be39a", "#ffd34f", "#ff6b3d", "#e8173c"];

type Role = "name" | "handle" | "descriptor" | "location" | "bio" | "about";
const ROLES: { id: Role; label: string }[] = [
  { id: "name", label: "Nombre" }, { id: "handle", label: "@usuario" }, { id: "descriptor", label: "Frase" },
  { id: "location", label: "Ubicación" }, { id: "bio", label: "Bio" }, { id: "about", label: "Sobre mí" },
];
const ROLE_KEYS: Record<Role, { font: keyof ProfileCardData; size: keyof ProfileCardData; color: keyof ProfileCardData }> = {
  name: { font: "nameFont", size: "nameFontSize", color: "nameColor" },
  handle: { font: "handleFont", size: "handleFontSize", color: "handleColor" },
  descriptor: { font: "statusFont", size: "statusFontSize", color: "descriptorColor" },
  location: { font: "locationFont", size: "locationFontSize", color: "locationColor" },
  bio: { font: "bioFont", size: "bioFontSize", color: "bioColor" },
  about: { font: "aboutFont", size: "aboutFontSize", color: "aboutColor" },
};

type FxId = "holo" | "glare" | "glitter" | "strass" | "aura" | "dust" | "edge";
type AnimId = "float" | "breathe" | "sway" | "heartbeat" | "sweep" | "borderRun";

interface Props {
  card: ProfileCardData;
  effective: CardEffects;
  baseColor: string;
  object: ObjectId;
  onSelectObject: (id: ObjectId) => void;
  onChange: (patch: Partial<ProfileCardData>) => void;
  /** "Todo": the full sheet at this part. */
  onMore: (id: ObjectId) => void;
  onPickPhoto?: () => void;
}

export default function PhoneStudio({ card, effective, baseColor, object, onSelectObject, onChange, onMore, onPickPhoto }: Props) {
  const [tool, setTool] = useState<Tool>(TOOL_OF[object] ?? "fx");
  const [detail, setDetail] = useState<FxId | null>(null);
  const [role, setRole] = useState<Role>(object in ROLE_KEYS ? (object as Role) : "name");
  const [pop, setPop] = useState<"font" | "role" | null>(null);
  const raw = card.effects;
  const fxa = useCardEffectActions({ effective, raw, onChange: effects => onChange({ effects }) });

  // A tap on a part of the card moves to its tool (not while arranging).
  useEffect(() => {
    const t = TOOL_OF[object];
    if (!t || tool === "move" || tool === "stickers") return;
    setTool(t); setDetail(null); setPop(null);
    if (object in ROLE_KEYS) setRole(object as Role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object]);

  // ✕ in a detail panel: back to how the card was when it opened.
  const snap = useRef<ProfileCardData | null>(null);
  const openDetail = (id: FxId) => { snap.current = card; setDetail(id); };
  const cancelDetail = () => {
    const s = snap.current;
    if (s && JSON.stringify(s.effects ?? null) !== JSON.stringify(card.effects ?? null)) onChange({ effects: s.effects });
    snap.current = null; setDetail(null);
  };

  // Acomodar: the card shows every part as something to grab.
  useEffect(() => {
    const root = document.documentElement;
    if (tool === "move") root.setAttribute("data-arrange", ""); else root.removeAttribute("data-arrange");
    return () => root.removeAttribute("data-arrange");
  }, [tool]);
  // Stickers: editable on the card while the tool is open; ghosts again after.
  useEffect(() => {
    if (tool !== "stickers") return;
    if (stickerEditing.get().cardId !== card.id) stickerEditing.start(card.id);
    return () => { if (stickerEditing.get().cardId === card.id) stickerEditing.apply(); };
  }, [tool, card.id]);

  // Tools that are a part of the card (Fondo, Texto, Foto…) select it; the
  // others (Acomodar, Tamaño, Borde, Animar) keep the selection as it is —
  // selecting "Efectos" for them would send the strip back to Efectos.
  const OWN: Tool[] = ["fx", "bg", "text", "photo", "stickers", "links", "buttons"];
  const pickTool = (t: Tool) => {
    setTool(t); setDetail(null); setPop(null);
    if (!OWN.includes(t)) return;
    const o = t === "text" ? role : OBJ_OF[t];
    if (o !== object) onSelectObject(o);
  };

  let body: React.ReactNode = null;
  let slider: Slider | null = null;

  // ── Efectos ─────────────────────────────────────────────────────────────
  const fxOn: Record<FxId, boolean> = {
    holo: holoOn(effective), glare: glareOn(effective), glitter: !!effective.glitter?.enabled, strass: !!effective.strass?.enabled,
    aura: !!effective.aura?.enabled, dust: !!effective.dust?.enabled, edge: !!effective.edge?.enabled,
  };
  const setFx = (id: FxId, on: boolean) => {
    if (id === "holo") fxa.patchHolo({ enabled: on, intensity: on && !(effective.holo?.intensity) ? HOLO_DEFAULT_INTENSITY : effective.holo?.intensity });
    else if (id === "glare") fxa.patchGlare({ enabled: on, intensity: on && !(effective.glare?.intensity) ? GLARE_DEFAULT_INTENSITY : effective.glare?.intensity });
    else fxa.patchFx(id, { enabled: on });
  };
  if (tool === "fx" && detail) {
    const quit = () => { setFx(detail, false); snap.current = null; setDetail(null); };
    let chips: React.ReactNode = null; const sliders: Slider[] = [];
    if (detail === "holo") {
      const st = holoStyleOf(effective);
      chips = HOLO_STYLES.map(h => <Chip key={h.id} on={st === h.id} onClick={() => fxa.patchHolo({ enabled: true, style: h.id })}>{h.label}</Chip>);
      sliders.push({ label: "Intensidad", min: 0.05, max: 1, step: 0.01, value: effective.holo?.intensity ?? HOLO_DEFAULT_INTENSITY, set: v => fxa.patchHolo({ intensity: v }) },
        { label: "Tamaño", min: 0.5, max: 2, step: 0.05, value: effective.holo?.scale ?? 1, set: v => fxa.patchHolo({ scale: v }) },
        { label: "Ángulo", min: -90, max: 90, step: 5, value: effective.holo?.angle ?? 0, set: v => fxa.patchHolo({ angle: v }) });
    } else if (detail === "glare") {
      const sh = effective.glare?.shape ?? "both";
      chips = ([["both", "Punto y franja"], ["spot", "Punto"], ["streak", "Franja"]] as const).map(([id, l]) =>
        <Chip key={id} on={sh === id} onClick={() => fxa.patchGlare({ shape: id === "both" ? undefined : id })}>{l}</Chip>);
      sliders.push({ label: "Intensidad", min: 0.05, max: 1, step: 0.01, value: effective.glare?.intensity ?? GLARE_DEFAULT_INTENSITY, set: v => fxa.patchGlare({ intensity: v }) },
        { label: "Tamaño", min: 0, max: 1, step: 0.01, value: effective.glare?.size ?? GLARE_DEFAULT_SIZE, set: v => fxa.patchGlare({ size: v }) });
    } else if (detail === "glitter") {
      const sc = effective.glitter?.scope ?? "text";
      chips = ([["text", "Sobre los textos"], ["card", "Toda la card"], ["border", "En el borde"]] as const).map(([id, l]) =>
        <Chip key={id} on={sc === id} onClick={() => fxa.patchFx("glitter", { scope: id })}>{l}</Chip>);
      sliders.push({ label: "Cantidad", min: 0, max: 1, step: 0.01, value: effective.glitter?.amount ?? GLITTER_DEFAULT_AMOUNT, set: v => fxa.patchFx("glitter", { amount: v }) },
        { label: "Tamaño", min: 0, max: 1, step: 0.01, value: effective.glitter?.size ?? GLITTER_DEFAULT_SIZE, set: v => fxa.patchFx("glitter", { size: v }) });
    } else if (detail === "strass") {
      const sh = effective.strass?.shape ?? "round";
      chips = ([["round", "Redonda"], ["heart", "Corazón"], ["star", "Estrella"]] as const).map(([id, l]) =>
        <Chip key={id} on={sh === id} onClick={() => fxa.patchFx("strass", { shape: id })}>{l}</Chip>);
    } else if (detail === "dust") {
      const ly = effective.dust?.layer ?? "front";
      chips = ([["front", "Delante"], ["back", "Detrás"]] as const).map(([id, l]) =>
        <Chip key={id} on={ly === id} onClick={() => fxa.patchFx("dust", { layer: id })}>{l}</Chip>);
    }
    body = (
      <Detail title={FX_LABEL[detail]} onCancel={cancelDetail} onOk={() => { snap.current = null; setDetail(null); }}>
        <div className="mn-studio__chips">{chips}<Chip onClick={quit}>Quitar</Chip><Chip onClick={() => onMore("cardFx")}>Todos los ajustes</Chip></div>
        {sliders.map(s => <SliderRow key={s.label} s={s} />)}
      </Detail>
    );
  } else if (tool === "fx") {
    const tap = (id: FxId) => { if (!fxOn[id]) setFx(id, true); else openDetail(id); };
    body = (
      <>
        <Hint>Tocá para sumar · tocá de nuevo para ajustar</Hint>
        <Row>
          <Opt label="Holo" on={fxOn.holo} onClick={() => tap("holo")}><Swatch bg="linear-gradient(135deg,#ff4fd8,#62d4ff 50%,#fff36b)" /></Opt>
          <Opt label="Reflejo" on={fxOn.glare} onClick={() => tap("glare")}><Swatch bg="linear-gradient(135deg,#777,#fff 45%,#888)" /></Opt>
          <Opt label="Glitter" on={fxOn.glitter} onClick={() => tap("glitter")}><Glyph fill d={<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />} /></Opt>
          <Opt label="Strass" on={fxOn.strass} onClick={() => tap("strass")}><Glyph d={<path d="M7 4h10l4 6-9 10L3 10zM3 10h18M9 4l3 16 3-16" />} /></Opt>
          <Opt label="Aura" on={fxOn.aura} onClick={() => tap("aura")}><Swatch bg="radial-gradient(circle,#ff4f94 0 30%,#b48cff66 55%,transparent 72%)" /></Opt>
          <Opt label="Polvo" on={fxOn.dust} onClick={() => tap("dust")}><Swatch bg="radial-gradient(#fff 1.2px,transparent 1.8px) 0 0/8px 8px, #2a2433" /></Opt>
          <Opt label="Canto" on={fxOn.edge} onClick={() => tap("edge")}><Swatch bg="linear-gradient(135deg,#f6d77a,#8a6a1e,#ffe9a8)" /></Opt>
          <Opt label="Todos" onClick={() => onMore("cardFx")}><Glyph d={<><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></>} /></Opt>
        </Row>
      </>
    );
  }

  // ── Fondo ───────────────────────────────────────────────────────────────
  if (tool === "bg") {
    const bgColor = (effective.bg?.color ?? "").toLowerCase();
    const hasGrad = !!effective.gradient;
    const pickBg = (c: string) => {
      const next = patchEffectGroup(raw, "bg", { color: visibleBgColor(c, raw?.bg?.color) }) as CardEffects;
      onChange({ effects: { ...next, gradient: undefined } });
    };
    slider = { label: "Opacidad", min: 0.05, max: 1, step: 0.01, value: effective.bg?.opacity ?? 1, set: v => onChange({ effects: patchEffectGroup(raw, "bg", { opacity: v }) as CardEffects }) };
    body = (
      <Row>
        <Opt label="Degradé" on={hasGrad} onClick={() => onChange({ effects: { ...raw, gradient: { ...(raw?.gradient ?? GRADIENT_DEFAULT) } } })}><Swatch bg={`linear-gradient(135deg, ${GRADIENT_DEFAULT.from}, ${GRADIENT_DEFAULT.to})`} /></Opt>
        {SWATCHES.map(c => <Opt key={c} label="" aria={`Color ${c}`} small on={!hasGrad && bgColor.startsWith(c.toLowerCase())} onClick={() => pickBg(c)}><Swatch bg={c} round /></Opt>)}
        <Opt label="Imagen" onClick={() => onMore("cardBg")}><Glyph d={<><rect x="4" y="5" width="16" height="14" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M5 17l5-4 4 3 5-4" /></>} /></Opt>
        <Opt label="Vidrio" on={!!effective.bg?.glass} onClick={() => onChange({ effects: patchEffectGroup(raw, "bg", { glass: !effective.bg?.glass }) as CardEffects })}><Swatch bg="linear-gradient(135deg,#ffffff55,#ffffff11)" /></Opt>
      </Row>
    );
  }

  // ── Texto ───────────────────────────────────────────────────────────────
  const nameSize = card.nameFontSize ?? nameFontSizeDefault(card.variant);
  const typo = useMemo(() => resolveCardTypography(card, nameSize), [card, nameSize]);
  const colors = useMemo(() => resolveCardColors(baseColor, {
    name: card.nameColor, handle: card.handleColor, descriptor: card.descriptorColor, location: card.locationColor,
    bio: card.bioColor, views: card.viewsColor, about: card.aboutColor,
  }), [baseColor, card]);
  const rk = ROLE_KEYS[role];
  const roleFont = (card[rk.font] as string | undefined) ?? (role === "name" ? card.font ?? NAME_FONT_DEFAULT : MONO_ROLE_FONT_DEFAULT);
  const roleSize = role === "name" ? nameSize : typo[role].fontSize;
  const roleColor = (colors as unknown as Record<Role, string>)[role];
  const roleText = ({ name: card.name, handle: `@${card.handle}`, descriptor: card.status, location: card.location, bio: card.bio, about: card.aboutText } as Record<Role, string | undefined>)[role]?.trim() || "Aa";
  if (tool === "text") {
    const [rMin, rMax] = ROLE_TYPOGRAPHY_RANGES[role].fontSize;
    slider = { label: "Tamaño", min: rMin, max: rMax, step: 1, value: roleSize, set: v => onChange({ [rk.size]: v } as Partial<ProfileCardData>) };
    body = (
      <>
        <div className="mn-studio__chips">
          <Chip on drop onClick={() => setPop(p => (p === "role" ? null : "role"))}>{ROLES.find(r => r.id === role)!.label}</Chip>
          <Chip drop onClick={() => setPop(p => (p === "font" ? null : "font"))}><span style={{ fontFamily: CANVAS_FONTS.find(f => f.key === roleFont)?.style }}>Aa</span> {CANVAS_FONTS.find(f => f.key === roleFont)?.label ?? roleFont}</Chip>
          <Chip onClick={() => onMore(role)}>Efectos del texto</Chip>
        </div>
        <Row>
          {SWATCHES.map(c => <Opt key={c} label="" aria={`Color ${c}`} small on={roleColor?.toLowerCase() === c.toLowerCase()} onClick={() => onChange({ [rk.color]: c } as Partial<ProfileCardData>)}><Swatch bg={c} round /></Opt>)}
        </Row>
      </>
    );
  }

  // ── Foto ────────────────────────────────────────────────────────────────
  if (tool === "photo") {
    const pad = getCardPadding(card.variant);
    const b = getPfpSizeBounds(card.w, card.h, pad);
    const radius = card.pfpRadius ?? 100;
    if (card.photo) slider = { label: "Tamaño", min: b.min, max: b.max, step: 1, value: resolvePfpSize(card.photoSize, card.pfpSizePx, card.w, card.h, pad), set: v => onChange({ pfpSizePx: v }) };
    body = (
      <Row>
        <Opt label={card.photo ? "Cambiar" : "Subir"} accent={!card.photo} onClick={() => (onPickPhoto ? onPickPhoto() : onMore("photo"))}><Glyph d={<><path d="M12 16V5M7 10l5-5 5 5" /><path d="M5 19h14" /></>} /></Opt>
        {([["Círculo", 100, 9], ["Redondeada", 45, 4], ["Cuadrada", 0, 0]] as const).map(([l, r, rx]) => (
          <Opt key={l} label={l} on={Math.round(radius) === r} onClick={() => onChange({ pfpRadius: r })}>
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden><rect x="3" y="3" width="18" height="18" rx={rx} fill="currentColor" opacity=".85" /></svg>
          </Opt>
        ))}
        <Opt label="Borde y efectos" onClick={() => onMore("photo")}><Glyph d={<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /></>} /></Opt>
      </Row>
    );
  }

  // ── Acomodar ────────────────────────────────────────────────────────────
  if (tool === "move") {
    body = (
      <div className="mn-studio__info">
        <Glyph d={<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />} />
        <div><b>Arrastrá cada parte con el dedo</b><span>Foto, nombre, redes y botones se acomodan solos para no taparse. Deshacer vuelve atrás.</span></div>
      </div>
    );
  }

  // ── Tamaño ──────────────────────────────────────────────────────────────
  if (tool === "size") {
    const measure = getTextMeasurer();
    const fb = getFreeformCardBounds();
    const setSize = (w: number, h: number) => {
      const c = clampProfileCardSize(card, w, h, { measure, startW: card.w });
      // Grows / shrinks around its own center (the room around it stays put).
      onChange({ w: c.w, h: c.h, x: Math.round(card.x + (card.w - c.w) / 2), y: Math.round(card.y + (card.h - c.h) / 2) });
    };
    const minW = Math.min(profileCardMinSize(card, fb.maxW, { measure }).w, Math.round(card.w));
    const minH = Math.min(profileCardMinSize(card, card.w, { measure }).h, Math.round(card.h));
    const presets: [string, number, number, number, number][] = [["Vertical", 300, 430, 22, 30], ["Cuadrada", 340, 340, 28, 28], ["Horizontal", 440, 280, 32, 22], ["Alta", 280, 500, 18, 32]];
    body = (
      <>
        <Row>
          {presets.map(([l, w, h, iw, ih]) => (
            <Opt key={l} label={l} onClick={() => setSize(w, h)}><span aria-hidden style={{ width: iw, height: ih, borderRadius: 5, border: "2px solid currentColor" }} /></Opt>
          ))}
        </Row>
        <SliderRow s={{ label: "Ancho", min: minW, max: fb.maxW, step: 2, value: Math.round(card.w), set: v => setSize(v, card.h) }} />
        <SliderRow s={{ label: "Alto", min: minH, max: fb.maxH, step: 2, value: Math.round(card.h), set: v => setSize(card.w, v) }} />
      </>
    );
  }

  // ── Stickers ────────────────────────────────────────────────────────────
  const edit = useStickerEditing();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (tool === "stickers") {
    const list = card.stickers ?? [];
    const full = list.length >= STICKER_MAX;
    const sel = list.filter(s => edit.selected.has(s.id));
    const setStickers = (next: CardSticker[]) => onChange({ stickers: next });
    const addSample = (id: string) => {
      const x = SAMPLE_STICKERS.find(s => s.id === id);
      if (!x || full) return;
      const st = newSticker(crypto.randomUUID(), `/editor/stickers/${x.id}.webp`, x.w, x.h, card.w, card.h);
      setStickers([...list, st]); stickerEditing.start(card.id, [st.id]);
    };
    const patchSel = (p: Partial<CardSticker>) => setStickers(list.map(s => (edit.selected.has(s.id) ? { ...s, ...p } : s)));
    body = (
      <>
        <Row>
          <Opt label={busy ? "Subiendo…" : "Subir"} accent onClick={() => !full && !busy && fileRef.current?.click()}><Glyph d={<path d="M12 5v14M5 12h14" />} /></Opt>
          {SAMPLE_STICKERS.map(s => (
            <Opt key={s.id} label="" aria={s.label} onClick={() => addSample(s.id)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/editor/stickers/${s.id}.webp`} alt="" draggable={false} style={{ width: 40, height: 40, objectFit: "contain" }} />
            </Opt>
          ))}
        </Row>
        <div className="mn-studio__chips">
          {sel.length ? <>
            <Chip on={sel.every(s => s.front && !s.over)} onClick={() => patchSel({ front: true, over: false })}>Delante</Chip>
            <Chip on={sel.every(s => !s.front)} onClick={() => patchSel({ front: false, over: false })}>Detrás</Chip>
            <Chip on={sel.every(s => s.front && s.over)} onClick={() => patchSel({ front: true, over: true })}>Encima de todo</Chip>
            <Chip onClick={() => { setStickers(list.filter(s => !edit.selected.has(s.id))); stickerEditing.select([]); }}>Borrar</Chip>
          </> : <span className="mn-studio__hint">{list.length ? "Tocá un sticker en la card para moverlo, agrandarlo o girarlo" : "Elegí uno o subí el tuyo"}</span>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async e => {
          const f = e.target.files?.[0]; e.target.value = "";
          if (!f || full) return;
          setBusy(true);
          try {
            const url = URL.createObjectURL(f);
            const size = await new Promise<{ w: number; h: number }>(res => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth || 1, h: im.naturalHeight || 1 }); im.onerror = () => res({ w: 1, h: 1 }); im.src = url; });
            URL.revokeObjectURL(url);
            const { publicUrl } = await uploadToStorage(f);
            const st = newSticker(crypto.randomUUID(), publicUrl, size.w, size.h, card.w, card.h);
            setStickers([...(card.stickers ?? []), st]); stickerEditing.start(card.id, [st.id]);
          } catch { /* uploadToStorage already told the user */ } finally { setBusy(false); }
        }} />
      </>
    );
  }

  // ── Redes / Botones ─────────────────────────────────────────────────────
  if (tool === "links") {
    const links = card.contactLinks ?? [];
    if (links.length) slider = { label: "Íconos", min: 14, max: 48, step: 1, value: card.linksIconSize ?? CONTACT_LINK_ICON_SIZE, set: v => onChange({ linksIconSize: v }) };
    body = (
      <Row>
        <Opt label="Agregar" accent={!links.length} onClick={() => onMore("links")}><Glyph d={<path d="M12 5v14M5 12h14" />} /></Opt>
        {links.map(l => <Opt key={l.id} label="" aria={l.url} small onClick={() => onMore("links")}><PlatformIcon platform={detectPlatform(l.url)} size={22} color="#fff" /></Opt>)}
      </Row>
    );
  }
  if (tool === "buttons") {
    const btns = card.linkButtons ?? [];
    body = (
      <Row>
        <Opt label="Agregar" accent={!btns.length} onClick={() => onMore("buttons")}><Glyph d={<path d="M12 5v14M5 12h14" />} /></Opt>
        {btns.map(b => <Opt key={b.id} label="" aria={b.label || b.url} onClick={() => onMore("buttons")}><span style={{ fontSize: 11, fontWeight: 700, padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 54 }} data-no-i18n="">{b.label || "Link"}</span></Opt>)}
        <Opt label="Estilo" onClick={() => onMore("buttons")}><Glyph d={<><rect x="4" y="5" width="16" height="6" rx="3" /><rect x="4" y="13" width="16" height="6" rx="3" /></>} /></Opt>
      </Row>
    );
  }

  // ── Borde ───────────────────────────────────────────────────────────────
  if (tool === "border") {
    const bw = effective.border?.width ?? 0;
    body = (
      <>
        <Row>
          {SWATCHES.map(c => <Opt key={c} label="" aria={`Color ${c}`} small on={(effective.border?.color ?? "").toLowerCase() === c.toLowerCase()}
            onClick={() => fxa.patchBorder({ color: c, width: bw > 0 ? bw : 2 })}><Swatch bg={c} round /></Opt>)}
        </Row>
        <SliderRow s={{ label: "Grosor", min: 0, max: 6, step: 0.5, value: bw, set: v => fxa.patchBorder({ width: v }) }} />
        <SliderRow s={{ label: "Esquinas", min: 0, max: 60, step: 1, value: effective.border?.radius ?? card.borderRadius ?? 16, set: v => fxa.patchBorder({ radius: v }) }} />
      </>
    );
  }

  // ── Animar ──────────────────────────────────────────────────────────────
  if (tool === "anim") {
    const mo = effective.motion;
    const on: Record<AnimId, boolean> = {
      float: !!effective.animations?.floating, breathe: !!mo?.breathe?.enabled, sway: !!mo?.sway?.enabled,
      heartbeat: !!mo?.heartbeat?.enabled, sweep: !!mo?.sweep?.enabled, borderRun: !!mo?.borderRun?.enabled,
    };
    const toggle = (id: AnimId) => {
      if (id === "float") fxa.patchAnimations({ floating: !on.float });
      else fxa.patchMotion(id, { enabled: !on[id] });
    };
    const amt = on.breathe ? { k: "breathe" as const, l: "Respirar" } : on.sway ? { k: "sway" as const, l: "Balanceo" } : on.heartbeat ? { k: "heartbeat" as const, l: "Latido" } : null;
    if (amt) slider = { label: amt.l, min: 0, max: 1, step: 0.01, value: mo?.[amt.k]?.amount ?? MOTION_DEFAULTS[amt.k].amount, set: v => fxa.patchMotion(amt.k, { amount: v }) };
    body = (
      <Row>
        {([["float", "Flotar", <path key="f" d="M7 15V8a5 5 0 0 1 10 0v7M5 20h14" />], ["breathe", "Respirar", <circle key="b" cx="12" cy="12" r="7" />],
          ["sway", "Balanceo", <path key="s" d="M12 3v4M6 21l6-14 6 14" />], ["heartbeat", "Latido", <path key="h" d="M3 12h4l2-5 3 10 2-5h7" />],
          ["sweep", "Destello", <path key="w" d="M4 20L20 4M9 20L20 9" />], ["borderRun", "Luz en el borde", <rect key="r" x="4" y="4" width="16" height="16" rx="5" strokeDasharray="6 4" />]] as [AnimId, string, React.ReactNode][]).map(([id, l, d]) => (
          <Opt key={id} label={l} on={on[id]} onClick={() => toggle(id)}><Glyph d={d} /></Opt>
        ))}
        <Opt label="Todos" onClick={() => onMore("cardFx")}><Glyph d={<><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></>} /></Opt>
      </Row>
    );
  }

  return (
    <div data-mnemo-editor="" className="mn-studio" role="region" aria-label="Editar la card" data-tool={tool}
      onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
      {pop === "font" && tool === "text" && (
        <FontList value={roleFont} sample={roleText} label={`Fuente: ${ROLES.find(r => r.id === role)!.label}`}
          onPick={k => { onChange({ [rk.font]: k as TextFont } as Partial<ProfileCardData>); }} onClose={() => setPop(null)} />
      )}
      {pop === "role" && tool === "text" && (
        <div className="mn-studio__pop" role="listbox" aria-label="Qué texto">
          {ROLES.map(r => (
            <button key={r.id} type="button" role="option" aria-selected={role === r.id} className="mn-studio__popitem"
              onClick={() => { setRole(r.id); setPop(null); if (object !== r.id) onSelectObject(r.id); }}>{r.label}</button>
          ))}
        </div>
      )}
      <div className="mn-studio__body">
        {slider && !(tool === "fx" && detail) && <SliderRow s={slider} />}
        {body}
      </div>
      <nav className="mn-studio__cats" aria-label="Herramientas">
        {TOOLS.map(t => (
          <button key={t.id} type="button" aria-current={tool === t.id ? "true" : undefined} onClick={() => pickTool(t.id)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{t.icon}</svg>
            {t.label}
          </button>
        ))}
        <button type="button" onClick={() => onMore(tool === "text" ? role : OBJ_OF[tool])}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
          Todo
        </button>
      </nav>
    </div>
  );
}

const FX_LABEL: Record<FxId, string> = { holo: "Holo", glare: "Reflejo", glitter: "Glitter", strass: "Strass", aura: "Aura", dust: "Polvo", edge: "Canto metálico" };

interface Slider { label: string; min: number; max: number; step: number; value: number; set: (v: number) => void }
function SliderRow({ s }: { s: Slider }) {
  const p = Math.max(0, Math.min(100, ((s.value - s.min) / (s.max - s.min || 1)) * 100));
  return (
    <label className="mn-studio__slider">
      <span>{s.label}</span>
      <input type="range" className="mn-studio__range" min={s.min} max={s.max} step={s.step} value={s.value}
        style={{ ["--p" as string]: `${p}%` }} onChange={e => s.set(Number(e.target.value))} aria-label={s.label} />
    </label>
  );
}
function Detail({ title, onCancel, onOk, children }: { title: string; onCancel: () => void; onOk: () => void; children: React.ReactNode }) {
  return (
    <div className="mn-studio__detail">
      <div className="mn-studio__dhead">
        <button type="button" className="mn-studio__round" aria-label="Cancelar" onClick={onCancel}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <span>{title}</span>
        <button type="button" className="mn-studio__round" data-ok="" aria-label="Listo" onClick={onOk}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </button>
      </div>
      {children}
    </div>
  );
}
function FontList({ value, sample, label, onPick, onClose }: { value: string; sample: string; label: string; onPick: (k: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const list = CANVAS_FONTS.filter(f => !q || f.label.toLowerCase().includes(q.toLowerCase()));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "center" }); }, []);
  return (
    <div className="mn-studio__pop mn-studio__fonts" role="listbox" aria-label={label}>
      <div className="mn-studio__fhead">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar fuente" aria-label="Buscar fuente" />
        <button type="button" className="mn-studio__round" aria-label="Cerrar" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div ref={ref} className="mn-studio__flist">
        {list.map(f => (
          <button key={f.key} type="button" role="option" aria-selected={value === f.key} className="mn-studio__fitem" onClick={() => onPick(f.key)}>
            <span style={{ fontFamily: f.style }} data-no-i18n="">{sample.slice(0, 22)}</span>
            <small data-no-i18n="">{f.label}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="mn-studio__row">{children}</div>;
}
function Hint({ children }: { children: React.ReactNode }) {
  return <div className="mn-studio__hintrow">{children}</div>;
}
function Chip({ on, drop, onClick, children }: { on?: boolean; drop?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="mn-studio__chip" aria-pressed={on} onClick={onClick}>
      {children}{drop && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden><path d="m6 9 6 6 6-6" /></svg>}
    </button>
  );
}
function Opt({ label, on, onClick, children, small, accent, aria }: {
  label: string; on?: boolean; onClick: () => void; children: React.ReactNode; small?: boolean; accent?: boolean; aria?: string;
}) {
  return (
    <button type="button" className="mn-studio__opt" data-on={on || undefined} data-small={small || undefined}
      data-accent={accent || undefined} aria-pressed={on} aria-label={aria ?? label} onClick={onClick}>
      <span className="mn-studio__tile">{children}</span>
      {label && <span className="mn-studio__label">{label}</span>}
    </button>
  );
}
function Glyph({ d, fill }: { d: React.ReactNode; fill?: boolean }) {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;
}
function Swatch({ bg, round }: { bg: string; round?: boolean }) {
  return <span aria-hidden style={{ width: round ? 34 : 36, height: round ? 34 : 36, borderRadius: round ? 17 : 10, background: bg, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.18)" }} />;
}
