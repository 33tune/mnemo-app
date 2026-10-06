/**
 * Menu redesign Phase 2 — the ProfileCard inspector's OBJECT model.
 *
 * The inspector answers "¿qué objeto estoy editando?" (design-direction.md
 * §A/§B): a list of the card's objects (ObjectList, a tablist of chips) and,
 * below it, the sections of the active one. This file is the pure part:
 * ids, order, captions, the data each chip shows and the files whose
 * controls each object mounts (OBJECT_FILES — the capability matrix test
 * proves every route lives in a file its object mounts).
 *
 * Local to the ProfileCard inspector — NOT a registry/schema: nothing
 * renders from it generically (CLAUDE.md: no schema-generated menus). Role
 * ids are exactly TextRole, so Phase 5's `data-role` and Phase 3's specimen
 * plates can use them directly.
 */
import type { BlockStyleKey, CardEffects, ProfileCardData, TextRole } from "@/types";
import { effectState } from "./effectBinding";
import { isCardGlowFlagVisible } from "./effectEditorDefaults";

export type ObjectId = TextRole | "photo" | "links" | "logo" | "cardBg" | "cardFx" | "allText";

export type ObjectKind = "role" | "block" | "card" | "all";
/** Review r2: the list is a MAP of the card in three fixed clusters —
 * its texts, its blocks, the card as a whole. */
export type ObjectGroup = "text" | "block" | "card";
export const OBJECT_GROUPS: readonly ObjectGroup[] = ["text", "block", "card"];

/** What a chip shows — data, not JSX (ObjectList.tsx renders it). */
export interface ChipData {
  /** Visible text after the optional visual (the user's own text, or the
   * placeholder when empty). */
  text: string;
  /** True when `text` is the placeholder (rendered dimmer). */
  placeholder?: boolean;
  /** Image thumbnail (Foto / Logo). Decorative (alt=""). */
  thumb?: string;
  /** Empty Foto/Logo: a dashed 20px circle stands in for the thumbnail. */
  emptyThumb?: boolean;
  /** Contact link URLs to draw as icons (max 3) + how many more. */
  links?: { urls: string[]; more: number };
  /** Background swatch (Fondo de la card). */
  swatch?: { color?: string; image?: string; gradient?: string };
  /** Spoken content when it differs from `text` ("imagen", "Instagram, X y 2 más"). */
  spoken?: string;
  /** "Aa" sample (Todos los textos): the base text color drawn over the
   * same background layers as the Fondo swatch. */
  sampleColor?: string;
}

export interface ChipContext {
  card: ProfileCardData;
  /** getProfileCardEffects(card) — what the card renders. */
  effective: CardEffects;
  /** cardBaseColor(card). */
  baseColor: string;
  /** Profile view total, when the editor already has it (ProfileCard's
   * useProfileViews) — undefined = unknown. */
  viewCount?: number;
}

export interface InspectorObject {
  id: ObjectId;
  /** Object name: chip name, h2, route segment in the capability matrix. */
  caption: string;
  /** What the chip shows when the object has no content yet (design-direction §B "Caption"). */
  placeholder: string;
  kind: ObjectKind;
  group: ObjectGroup;
  /** Shorter caption the chip's visible text uses ("Efectos"), so the
   * accessible name contains the visible label (WCAG 2.5.3). */
  shortCaption?: string;
  role?: TextRole;
  blockKey?: BlockStyleKey;
  chip: (ctx: ChipContext) => ChipData;
}

const text = (value: string | undefined | null, placeholder: string): ChipData => {
  const v = (value ?? "").trim();
  return v ? { text: v } : { text: placeholder, placeholder: true };
};

/** "1234" → "1,2 k" (es-AR style), below 1000 the plain number. */
export function formatViewCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "").replace(".", ",")} k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",")} M`;
}

/** Card-level effects that are visibly on ("Efectos de la card: N activos"). */
export function countActiveCardEffects(raw: CardEffects | undefined, effective: CardEffects): number {
  const glow = effective.glow;
  const glowOn = isCardGlowFlagVisible(glow, "outer") || isCardGlowFlagVisible(glow, "inner");
  const inter = effective.interactions;
  const retro = effective.retro;
  return [
    effectState(raw, effective, "shadow").status === "on",
    glowOn,
    glowOn && !!glow?.animation?.enabled,
    !!effective.animations?.floating,
    !!inter?.tilt3d,
    !!inter?.hoverGlow,
    effectState(raw, effective, "interactions.hoverScale").status === "on",
    !!inter?.spotlight,
    !!retro?.scanlines?.enabled,
    !!retro?.noise?.enabled,
    !!retro?.flicker?.enabled,
    !!retro?.chromaticAberration?.enabled,
  ].filter(Boolean).length;
}

/** The card's effective background as swatch layers (color + image +
 * gradient). Drawn over the editor's checker, so a transparent background
 * still reads as "transparent" instead of vanishing. */
function backgroundSwatch(effective: CardEffects): NonNullable<ChipData["swatch"]> {
  const g = effective.gradient;
  return {
    color: effective.bg?.color,
    image: effective.bg?.image || undefined,
    gradient: g ? `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` : undefined,
  };
}

export const INSPECTOR_OBJECTS: readonly InspectorObject[] = [
  { id: "name", caption: "Nombre", placeholder: "Tu nombre", kind: "role", group: "text", role: "name", blockKey: "identity",
    chip: ({ card }) => text(card.name, "Tu nombre") },
  { id: "handle", caption: "@usuario", placeholder: "@usuario", kind: "role", group: "text", role: "handle", blockKey: "identity",
    chip: ({ card }) => text(card.handle ? `@${card.handle}` : "", "@usuario") },
  { id: "descriptor", caption: "Frase", placeholder: "Frase corta", kind: "role", group: "text", role: "descriptor", blockKey: "identity",
    chip: ({ card }) => text(card.status, "Frase corta") },
  { id: "location", caption: "Ubicación", placeholder: "Ubicación", kind: "role", group: "text", role: "location", blockKey: "location",
    chip: ({ card }) => text(card.location, "Ubicación") },
  { id: "bio", caption: "Bio", placeholder: "Bio", kind: "role", group: "text", role: "bio", blockKey: "identity",
    chip: ({ card }) => text(card.bio, "Bio") },
  { id: "views", caption: "Visitas", placeholder: "Visitas", kind: "role", group: "text", role: "views", blockKey: "views",
    chip: ({ card, viewCount }) => {
      const state = !card.showViews ? "oculto" : viewCount != null ? formatViewCount(viewCount) : "visible";
      return { text: `Visitas · ${state}`, spoken: state };
    } },
  { id: "photo", caption: "Foto", placeholder: "Foto", kind: "block", group: "block",
    chip: ({ card }) => card.photo ? { text: "Foto", thumb: card.photo, spoken: "imagen" } : { text: "Foto", placeholder: true, emptyThumb: true } },
  { id: "links", caption: "Links", placeholder: "Links", kind: "block", group: "block", blockKey: "links",
    chip: ({ card }) => {
      const urls = (card.contactLinks ?? []).map(l => l.url).filter(Boolean);
      if (urls.length === 0) return { text: "Links", placeholder: true };
      return { text: "", links: { urls: urls.slice(0, 3), more: Math.max(0, urls.length - 3) } };
    } },
  { id: "logo", caption: "Logo", placeholder: "Logo", kind: "block", group: "block",
    chip: ({ card }) => card.logo?.url ? { text: "Logo", thumb: card.logo.url, spoken: "imagen" } : { text: "Logo", placeholder: true, emptyThumb: true } },
  { id: "cardBg", caption: "Fondo de la card", placeholder: "Fondo", kind: "card", group: "card",
    chip: ({ effective }) => ({
      text: "Fondo",
      spoken: effective.bg?.image ? "imagen" : effective.gradient ? "gradiente" : effective.bg?.color ? "color" : "transparente",
      swatch: backgroundSwatch(effective),
    }) },
  { id: "cardFx", caption: "Efectos de la card", shortCaption: "Efectos", placeholder: "Efectos", kind: "card", group: "card",
    chip: ({ card, effective }) => {
      const n = countActiveCardEffects(card.effects, effective);
      const label = n === 1 ? "1 activo" : `${n} activos`;
      return { text: `Efectos · ${label}`, spoken: label };
    } },
  { id: "allText", caption: "Todos los textos", placeholder: "Aa", kind: "all", group: "card",
    chip: ({ baseColor, effective }) => ({ text: "Todos los textos", sampleColor: baseColor, swatch: backgroundSwatch(effective), spoken: "" }) },
];

export const OBJECT_IDS: readonly ObjectId[] = INSPECTOR_OBJECTS.map(o => o.id);
export const DEFAULT_OBJECT: ObjectId = "name";

export function inspectorObject(id: ObjectId): InspectorObject {
  return INSPECTOR_OBJECTS.find(o => o.id === id)!;
}

/** The object whose caption opens a capability route ui
 * ("Card de presentación › <caption> › …"). Longest caption wins. */
export function objectForRoute(ui: string, prefix: string): InspectorObject | undefined {
  if (!ui.startsWith(`${prefix} › `)) return undefined;
  const rest = ui.slice(prefix.length + 3);
  return [...INSPECTOR_OBJECTS].sort((a, b) => b.caption.length - a.caption.length)
    .find(o => rest === o.caption || rest.startsWith(`${o.caption} › `));
}

const MAX_NAME = 60;
/** Chip accessible name: caption + its visible content (WCAG 2.5.3),
 * capped at ~60 characters. `platformLabel` turns a link URL into its
 * platform name (SocialIcons.tsx's detectPlatform/PLATFORM_LABELS). */
export function chipAccessibleName(obj: InspectorObject, data: ChipData, platformLabel: (url: string) => string = u => u): string {
  // r2 (WCAG 2.5.3): the name always CONTAINS the visible label — the chip
  // shows "Efectos · 3 activos", so the name is "Efectos: 3 activos"; an
  // empty object says so ("Nombre: vacío, Tu nombre") instead of reading
  // its placeholder as if it were the value.
  const caption = obj.shortCaption ?? obj.caption;
  let content: string;
  if (data.placeholder) {
    content = data.text && data.text !== caption ? `vacío, ${data.text}` : "vacío";
  } else if (data.links) {
    const names = data.links.urls.map(platformLabel);
    content = data.links.more > 0
      ? `${names.join(", ")} y ${data.links.more} más`
      : names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}` : names[0] ?? "";
  } else {
    content = data.spoken ?? data.text;
  }
  const full = content && content !== caption ? `${caption}: ${content}` : caption;
  return full.length > MAX_NAME ? `${full.slice(0, MAX_NAME - 1).trimEnd()}…` : full;
}

/** Roving-tabindex navigation of the tablist (APG): arrows wrap, Home/End.
 * Returns -1 for keys it doesn't handle. */
export function nextTabIndex(key: string, index: number, count: number): number {
  if (count <= 0) return -1;
  switch (key) {
    case "ArrowRight": case "ArrowDown": return (index + 1) % count;
    case "ArrowLeft": case "ArrowUp": return (index - 1 + count) % count;
    case "Home": return 0;
    case "End": return count - 1;
    default: return -1;
  }
}

// ── Which files each object mounts ─────────────────────────────────────────
// ProfileConfigMenu.tsx's OBJECT_SECTIONS mounts, per object, section
// components from exactly these files (inspectorObjects.test.ts checks the
// imports). CHILD_FILES are components those files render, so a capability
// whose evidence lives in a child (RoleTypographyFields, BlockStyleFields)
// counts as mounted by the parent's objects.
const C = "src/components/canvas/";
const IDENTITY = `${C}ProfileIdentityMenu.tsx`;
const METADATA = `${C}ProfileMetadataMenu.tsx`;
const TYPOGRAPHY = `${C}ProfileTypographyMenu.tsx`;
const EFFECTS = `${C}ProfileEffectsMenu.tsx`;
export const OBJECT_FILES: Record<ObjectId, readonly string[]> = {
  name:       [IDENTITY, TYPOGRAPHY],
  handle:     [IDENTITY, TYPOGRAPHY],
  descriptor: [IDENTITY, METADATA, TYPOGRAPHY],
  location:   [METADATA, TYPOGRAPHY],
  bio:        [IDENTITY, METADATA, TYPOGRAPHY],
  views:      [METADATA, TYPOGRAPHY],
  photo:      [IDENTITY],
  links:      [`${C}ProfileContactLinksMenu.tsx`],
  logo:       [`${C}ProfileLogoMenu.tsx`],
  cardBg:     [`${C}ProfileBackgroundMenu.tsx`, EFFECTS, `${C}ProfileConfigMenu.tsx`],
  cardFx:     [EFFECTS],
  allText:    [TYPOGRAPHY],
};
export const CHILD_FILES: Record<string, readonly string[]> = {
  [TYPOGRAPHY]: [`${C}RoleTypographyFields.tsx`],
  [IDENTITY]: [`${C}BlockStyleFields.tsx`],
  [METADATA]: [`${C}BlockStyleFields.tsx`],
  [`${C}ProfileContactLinksMenu.tsx`]: [`${C}BlockStyleFields.tsx`],
};

/** Every file whose controls the object's sections render (direct + children). */
export function filesMountedBy(id: ObjectId): string[] {
  const direct = OBJECT_FILES[id];
  return [...new Set([...direct, ...direct.flatMap(f => CHILD_FILES[f] ?? [])])];
}
