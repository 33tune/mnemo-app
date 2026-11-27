"use client";
/**
 * Editor de celular — "Estudio" (2026-11-27, propuesta A elegida por el
 * usuario: "como editar una foto en Instagram"). Replaces the folded sheet:
 * the card stays big above, and at the bottom there is ONE row of options for
 * the pulgar, ONE big slider for the option in use, and the categories
 * (Efectos · Fondo · Texto · Foto · Redes). "Más" opens the full sheet at the
 * same part, so no setting is lost (it is the same inspector as always).
 *
 * Every write goes through the inspector's own onChange and the same writers
 * the menus use (useCardEffectActions, patchEffectGroup, identity fields), so
 * undo, the hover preview and auto-publish behave exactly the same.
 */
import React, { useEffect, useRef, useState } from "react";
import type { CardEffects, ProfileCardData, TextFont } from "@/types";
import type { ObjectId } from "@/lib/inspectorObjects";
import { useCardEffectActions } from "./ProfileEffectsMenu";
import { visibleBgColor } from "./ProfileBackgroundMenu";
import { patchEffectGroup } from "@/lib/effectBinding";
import { GRADIENT_DEFAULT, NAME_FONT_DEFAULT, ROLE_TYPOGRAPHY_RANGES, nameFontSizeDefault } from "@/lib/effectEditorDefaults";
import { HOLO_DEFAULT_INTENSITY, GLARE_DEFAULT_INTENSITY, GLITTER_DEFAULT_AMOUNT, holoOn, glareOn } from "@/lib/cardFoil";
import { CANVAS_FONTS } from "@/lib/fontList";
import { getCardPadding, getPfpSizeBounds, resolvePfpSize } from "@/lib/cardGeometry";
import { CONTACT_LINK_ICON_SIZE } from "@/lib/contactLinksBlock";
import { detectPlatform, PlatformIcon } from "./SocialIcons";


export const PHONE_STUDIO_H = 196;

type Cat = "fx" | "bg" | "text" | "photo" | "links";
const CAT_OF: Partial<Record<ObjectId, Cat>> = { cardFx: "fx", cardBg: "bg", name: "text", photo: "photo", links: "links", buttons: "links" };
const OBJ_OF: Record<Cat, ObjectId> = { fx: "cardFx", bg: "cardBg", text: "name", photo: "photo", links: "links" };
/** The parts the Estudio edits itself; any other part opens the full sheet. */
export function studioCovers(id: ObjectId): boolean { return id in CAT_OF; }

const CATS: { id: Cat; label: string; icon: React.ReactNode }[] = [
  { id: "fx", label: "Efectos", icon: <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" /> },
  { id: "bg", label: "Fondo", icon: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M4 15l5-5 4 4 3-3 4 4" /></> },
  { id: "text", label: "Texto", icon: <path d="M5 6h14M12 6v13M9 19h6" /> },
  { id: "photo", label: "Foto", icon: <><circle cx="12" cy="10" r="4" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></> },
  { id: "links", label: "Redes", icon: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></> },
];

const BG_COLORS = ["#0E0C12", "#1d1b26", "#ffffff", "#f5e6d3", "#ffd1e8", "#ff4f94", "#b48cff", "#7fd8ff", "#4be39a", "#ffd34f", "#ff6b3d"];
const NAME_FONTS = ["DM Sans", "Playfair Display", "Pacifico", "Bebas Neue", "Space Mono", "Syne", "Dancing Script", "Great Vibes", "Anton", "Montserrat", "Comfortaa", "Courier New", "Georgia", "Impact"]
  .map(k => CANVAS_FONTS.find(f => f.key === k)).filter(Boolean) as typeof CANVAS_FONTS;

type FxId = "holo" | "glare" | "glitter" | "strass" | "aura" | "dust" | "edge" | "float";

interface Props {
  card: ProfileCardData;
  effective: CardEffects;
  object: ObjectId;
  onSelectObject: (id: ObjectId) => void;
  onChange: (patch: Partial<ProfileCardData>) => void;
  /** "Más": the full sheet at this part. */
  onMore: (id: ObjectId) => void;
  onPickPhoto?: () => void;
}

export default function PhoneStudio({ card, effective, object, onSelectObject, onChange, onMore, onPickPhoto }: Props) {
  const cat: Cat = CAT_OF[object] ?? "fx";
  const raw = card.effects;
  const fxa = useCardEffectActions({ effective, raw, onChange: effects => onChange({ effects }) });
  const [focusFx, setFocusFx] = useState<FxId | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => { rowRef.current?.scrollTo({ left: 0 }); }, [cat]);

  // ── Efectos ─────────────────────────────────────────────────────────────
  const fxOn: Record<FxId, boolean> = {
    holo: holoOn(effective), glare: glareOn(effective), glitter: !!effective.glitter?.enabled, strass: !!effective.strass?.enabled,
    aura: !!effective.aura?.enabled, dust: !!effective.dust?.enabled, edge: !!effective.edge?.enabled, float: !!effective.animations?.floating,
  };
  const setFx = (id: FxId, on: boolean) => {
    if (id === "holo") fxa.patchHolo({ enabled: on, intensity: on && !(effective.holo?.intensity) ? HOLO_DEFAULT_INTENSITY : effective.holo?.intensity });
    else if (id === "glare") fxa.patchGlare({ enabled: on, intensity: on && !(effective.glare?.intensity) ? GLARE_DEFAULT_INTENSITY : effective.glare?.intensity });
    else if (id === "float") fxa.patchAnimations({ floating: on });
    else fxa.patchFx(id, { enabled: on });
  };
  const shownFx = (): FxId | null => (focusFx && fxOn[focusFx] ? focusFx : (["holo", "glare", "glitter"] as FxId[]).find(k => fxOn[k]) ?? null);
  const tapFx = (id: FxId) => {
    if (!fxOn[id]) { setFx(id, true); setFocusFx(id); }
    else if (focusFx === id || shownFx() === id || !["holo", "glare", "glitter"].includes(id)) { setFx(id, false); setFocusFx(null); }
    else setFocusFx(id);
  };
  const allOff = () => {
    // One write: every effect of this row off (their settings stay, like the switches).
    const next: CardEffects = { ...raw };
    if (next.holo) next.holo = { ...next.holo, enabled: false };
    if (next.glare) next.glare = { ...next.glare, enabled: false };
    for (const k of ["glitter", "strass", "aura", "dust", "edge"] as const) if (next[k]) next[k] = { ...(next[k] as object), enabled: false } as never;
    if (next.animations?.floating) next.animations = { ...next.animations, floating: false };
    onChange({ effects: next });
    setFocusFx(null);
  };
  const fxSlider = (() => {
    // The effect in use; with none chosen yet, the first one that is on and has a slider.
    const f = focusFx && fxOn[focusFx] ? focusFx : (["holo", "glare", "glitter"] as FxId[]).find(k => fxOn[k]) ?? null;
    if (f === "holo") return { label: "Holo", min: 0.05, max: 1, step: 0.01, value: effective.holo?.intensity ?? HOLO_DEFAULT_INTENSITY, set: (v: number) => fxa.patchHolo({ intensity: v }) };
    if (f === "glare") return { label: "Reflejo", min: 0.05, max: 1, step: 0.01, value: effective.glare?.intensity ?? GLARE_DEFAULT_INTENSITY, set: (v: number) => fxa.patchGlare({ intensity: v }) };
    if (f === "glitter") return { label: "Glitter", min: 0, max: 1, step: 0.01, value: effective.glitter?.amount ?? GLITTER_DEFAULT_AMOUNT, set: (v: number) => fxa.patchFx("glitter", { amount: v }) };
    return null;
  })();

  // ── Fondo ───────────────────────────────────────────────────────────────
  const bgColor = effective.bg?.color;
  const hasGrad = !!effective.gradient;
  const pickBg = (c: string) => {
    const next = patchEffectGroup(raw, "bg", { color: visibleBgColor(c, raw?.bg?.color) }) as CardEffects;
    // A solid color is what you see: the gradient over it goes.
    onChange({ effects: { ...next, gradient: undefined } });
  };
  const pickGrad = () => onChange({ effects: { ...raw, gradient: { ...(raw?.gradient ?? GRADIENT_DEFAULT) } } });

  // ── Texto (el nombre) ───────────────────────────────────────────────────
  const nameFont = card.nameFont ?? card.font ?? NAME_FONT_DEFAULT;
  const nameSize = card.nameFontSize ?? nameFontSizeDefault(card.variant);
  const [nMin, nMax] = ROLE_TYPOGRAPHY_RANGES.name.fontSize;

  // ── Foto ────────────────────────────────────────────────────────────────
  const pad = getCardPadding(card.variant);
  const pfpBounds = getPfpSizeBounds(card.w, card.h, pad);
  const pfpSize = resolvePfpSize(card.photoSize, card.pfpSizePx, card.w, card.h, pad);
  const radius = card.pfpRadius ?? 100;

  // ── Redes ───────────────────────────────────────────────────────────────
  const links = card.contactLinks ?? [];

  const slider = cat === "fx" ? fxSlider
    : cat === "bg" ? { label: "Opacidad", min: 0.05, max: 1, step: 0.01, value: effective.bg?.opacity ?? 1, set: (v: number) => onChange({ effects: patchEffectGroup(raw, "bg", { opacity: v }) as CardEffects }) }
    : cat === "text" ? { label: "Tamaño", min: nMin, max: nMax, step: 1, value: nameSize, set: (v: number) => onChange({ nameFontSize: v }) }
    : cat === "photo" && card.photo ? { label: "Tamaño", min: pfpBounds.min, max: pfpBounds.max, step: 1, value: pfpSize, set: (v: number) => onChange({ pfpSizePx: v }) }
    : cat === "links" && links.length ? { label: "Íconos", min: 14, max: 48, step: 1, value: card.linksIconSize ?? CONTACT_LINK_ICON_SIZE, set: (v: number) => onChange({ linksIconSize: v }) }
    : null;

  const more = <Opt key="more" label="Más" onClick={() => onMore(cat === "text" ? "name" : OBJ_OF[cat])}><Glyph d={<><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></>} /></Opt>;

  return (
    <div data-mnemo-editor="" className="mn-studio" role="region" aria-label="Editar la card"
      onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
      <div className="mn-studio__slider">
        {slider ? (
          <label>
            <span>{slider.label}</span>
            <input type="range" className="mn-studio__range" min={slider.min} max={slider.max} step={slider.step} value={slider.value}
              style={{ ["--p" as string]: `${((slider.value - slider.min) / (slider.max - slider.min)) * 100}%` }}
              onChange={e => slider.set(Number(e.target.value))} aria-label={slider.label} />
          </label>
        ) : <span className="mn-studio__hint">{cat === "fx" ? "Tocá un efecto para sumarlo" : cat === "photo" ? "Subí tu foto" : cat === "links" ? "Sumá tus redes" : ""}</span>}
      </div>

      <div ref={rowRef} className="mn-studio__row" role="group" aria-label={CATS.find(c => c.id === cat)?.label}>
        {cat === "fx" && <>
          <Opt label="Nada" on={!Object.values(fxOn).some(Boolean)} onClick={allOff}><Glyph d={<><circle cx="12" cy="12" r="8" /><path d="M6.5 17.5l11-11" /></>} /></Opt>
          <Opt label="Holo" on={fxOn.holo} focus={fxSlider?.label === "Holo"} onClick={() => tapFx("holo")}><Swatch bg="linear-gradient(135deg,#ff4fd8,#62d4ff 50%,#fff36b)" /></Opt>
          <Opt label="Reflejo" on={fxOn.glare} focus={fxSlider?.label === "Reflejo"} onClick={() => tapFx("glare")}><Swatch bg="linear-gradient(135deg,#777,#fff 45%,#888)" /></Opt>
          <Opt label="Glitter" on={fxOn.glitter} focus={fxSlider?.label === "Glitter"} onClick={() => tapFx("glitter")}><Glyph d={<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />} fill /></Opt>
          <Opt label="Strass" on={fxOn.strass} onClick={() => tapFx("strass")}><Glyph d={<path d="M7 4h10l4 6-9 10L3 10z M3 10h18 M9 4l3 16 3-16" />} /></Opt>
          <Opt label="Aura" on={fxOn.aura} onClick={() => tapFx("aura")}><Swatch bg="radial-gradient(circle,#ff4f94 0 30%,#b48cff66 55%,transparent 72%)" /></Opt>
          <Opt label="Polvo" on={fxOn.dust} onClick={() => tapFx("dust")}><Swatch bg="radial-gradient(#fff 1.2px,transparent 1.8px) 0 0/8px 8px, #2a2433" /></Opt>
          <Opt label="Canto" on={fxOn.edge} onClick={() => tapFx("edge")}><Swatch bg="linear-gradient(135deg,#f6d77a,#8a6a1e,#ffe9a8)" ring /></Opt>
          <Opt label="Flotar" on={fxOn.float} onClick={() => tapFx("float")}><Glyph d={<><rect x="6" y="4" width="12" height="11" rx="2.5" /><path d="M8 20h8" /></>} /></Opt>
          {more}
        </>}

        {cat === "bg" && <>
          <Opt label="Degradé" on={hasGrad} onClick={pickGrad}><Swatch bg={`linear-gradient(135deg, ${GRADIENT_DEFAULT.from}, ${GRADIENT_DEFAULT.to})`} /></Opt>
          {BG_COLORS.map(c => (
            <Opt key={c} label="" aria={`Color ${c}`} on={!hasGrad && (bgColor ?? "").toLowerCase().startsWith(c.toLowerCase())} onClick={() => pickBg(c)} small><Swatch bg={c} round /></Opt>
          ))}
          <Opt label="Imagen" onClick={() => onMore("cardBg")}><Glyph d={<><rect x="4" y="5" width="16" height="14" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M5 17l5-4 4 3 5-4" /></>} /></Opt>
          {more}
        </>}

        {cat === "text" && <>
          {NAME_FONTS.map(f => (
            <button key={f.key} type="button" className="mn-studio__font" aria-pressed={nameFont === f.key} aria-label={`Fuente ${f.label}`}
              style={{ fontFamily: f.style }} onClick={() => onChange({ nameFont: f.key as TextFont })}>
              {(card.name || "Aa").slice(0, 10)}
            </button>
          ))}
          {more}
        </>}

        {cat === "photo" && <>
          <Opt label={card.photo ? "Cambiar" : "Subir"} onClick={() => onPickPhoto ? onPickPhoto() : onMore("photo")} accent={!card.photo}>
            <Glyph d={<><path d="M12 16V5M7 10l5-5 5 5" /><path d="M5 19h14" /></>} />
          </Opt>
          {([["Círculo", 100, 12], ["Redondeada", 45, 5.4], ["Cuadrada", 0, 0]] as const).map(([l, r, rx]) => (
            <Opt key={l} label={l} on={Math.round(radius) === r} onClick={() => onChange({ pfpRadius: r })}>
              <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden><rect x="3" y="3" width="18" height="18" rx={rx * 0.75} fill="currentColor" opacity=".85" /></svg>
            </Opt>
          ))}
          {more}
        </>}

        {cat === "links" && <>
          <Opt label="Agregar" accent={!links.length} onClick={() => onMore("links")}><Glyph d={<path d="M12 5v14M5 12h14" />} /></Opt>
          {links.map(l => {
            const p = detectPlatform(l.url);
            return <Opt key={l.id} label="" aria={l.url} onClick={() => onMore("links")} small><PlatformIcon platform={p} size={22} color="#fff" /></Opt>;
          })}
          <Opt label="Botones" onClick={() => onMore("buttons")}><Glyph d={<><rect x="4" y="6" width="16" height="5" rx="2.5" /><rect x="4" y="13" width="16" height="5" rx="2.5" /></>} /></Opt>
          {more}
        </>}
      </div>

      <nav className="mn-studio__cats" aria-label="Qué editar">
        {CATS.map(c => (
          <button key={c.id} type="button" aria-current={cat === c.id ? "true" : undefined} onClick={() => onSelectObject(OBJ_OF[c.id])}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{c.icon}</svg>
            {c.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Opt({ label, on, focus, onClick, children, small, accent, aria }: {
  label: string; on?: boolean; focus?: boolean; onClick: () => void; children: React.ReactNode; small?: boolean; accent?: boolean; aria?: string;
}) {
  return (
    <button type="button" className="mn-studio__opt" data-on={on || undefined} data-focus={focus || undefined} data-small={small || undefined}
      data-accent={accent || undefined} aria-pressed={on} aria-label={aria ?? label} onClick={onClick}>
      <span className="mn-studio__tile">{children}</span>
      {label && <span className="mn-studio__label">{label}</span>}
    </button>
  );
}
function Glyph({ d, fill }: { d: React.ReactNode; fill?: boolean }) {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;
}
function Swatch({ bg, round, ring }: { bg: string; round?: boolean; ring?: boolean }) {
  return <span aria-hidden style={{ width: round ? 34 : 36, height: round ? 34 : 36, borderRadius: round ? 17 : 10, background: bg,
    boxShadow: ring ? "inset 0 0 0 4px #0000, 0 0 0 1px rgba(255,255,255,.2)" : "inset 0 0 0 1px rgba(255,255,255,.18)" }} />;
}
