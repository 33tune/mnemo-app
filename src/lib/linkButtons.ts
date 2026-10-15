/**
 * Link buttons (Linktree-style, user decision 2026-10-14) — PURE: sizing,
 * defaults and the resolved look of `card.linkButtons` /
 * `card.linkButtonStyle`. No React, no DOM.
 *
 * The ONE source every renderer reads: ProfileCard (via LinkButtonsBlock)
 * today; the mobile renderer later (MobilePublicCanvas is untouched for now
 * — the mobile adaptation is a future stage, and it only has to mount
 * LinkButtonsBlock with `resolveLinkButtonStyle` + `linkButtonsBlockSize`;
 * nothing here assumes the desktop canvas).
 *
 * Engine contract (engine rewrite 2026-10-15): the 7th, lowest-priority
 * block of computeBlockLayout. Never dragged, it flows under the texts and
 * the icons row, as part of the anchored group; the card's content floor
 * (profileCardLayout.ts) keeps it always inside the card. Dragged, it sits
 * at its anchor and is hidden only when it cannot sit there
 * (linkButtonsPlaced).
 */
import type { CSSProperties } from "react";
import type { LinkButtonStyle } from "@/types";
import { luminance, withOpacity } from "./cardColors";

export const LINK_BUTTONS_MAX = 8;
export const LINK_BUTTON_LABEL_MAX = 40;
export const LINK_BUTTON_FONT_SIZE = { min: 11, max: 20, default: 13 } as const;
export const LINK_BUTTON_GAP = { min: 4, max: 20, default: 8 } as const;
export const LINK_BUTTON_DEFAULT_FONT = "DM Sans";
export const LINK_BUTTON_DEFAULT_WEIGHT = 600;

/** Button height for a font size — a comfortable tap target (13px -> 38px). */
export function linkButtonHeight(fontSize: number): number {
  return Math.round(fontSize * 2.9);
}

export interface ResolvedLinkButtonStyle {
  shape: NonNullable<LinkButtonStyle["shape"]>;
  fill: NonNullable<LinkButtonStyle["fill"]>;
  color: string;
  textColor: string;
  font: string;
  fontSize: number;
  fontWeight: number;
  showIcon: boolean;
  width: NonNullable<LinkButtonStyle["width"]>;
  gap: number;
  height: number;
  radius: number;
  hover: { lift: boolean; glow: boolean; invert: boolean };
}

/** Readable label color on `bg` (black or white). */
export function contrastInk(bg: string): string {
  return bg.startsWith("#") && luminance(bg) > 0.5 ? "#111111" : "#FFFFFF";
}

/** Every default applied. `baseColor` = the card's base text color
 * (cardBaseColor), so a card without a style gets buttons that already
 * belong to it. */
export function resolveLinkButtonStyle(style: LinkButtonStyle | undefined, baseColor: string): ResolvedLinkButtonStyle {
  const fontSize = clamp(style?.fontSize ?? LINK_BUTTON_FONT_SIZE.default, LINK_BUTTON_FONT_SIZE.min, LINK_BUTTON_FONT_SIZE.max);
  const height = linkButtonHeight(fontSize);
  const shape = style?.shape ?? "pill";
  const fill = style?.fill ?? "solid";
  const color = style?.color ?? baseColor;
  return {
    shape, fill, color,
    // Outline / glass draw the label in the button color by default.
    textColor: style?.textColor ?? (fill === "solid" ? contrastInk(color) : color),
    font: style?.font ?? LINK_BUTTON_DEFAULT_FONT,
    fontSize,
    fontWeight: style?.fontWeight ?? LINK_BUTTON_DEFAULT_WEIGHT,
    showIcon: style?.showIcon ?? true,
    width: style?.width ?? "full",
    gap: clamp(style?.gap ?? LINK_BUTTON_GAP.default, LINK_BUTTON_GAP.min, LINK_BUTTON_GAP.max),
    height,
    radius: shape === "square" ? 4 : shape === "soft" ? Math.round(height * 0.3) : Math.ceil(height / 2),
    hover: { lift: style?.hover?.lift ?? true, glow: !!style?.hover?.glow, invert: !!style?.hover?.invert },
  };
}

/** The block's box: full available width, the buttons stacked. 0 buttons =
 * zero size (no block). */
export function linkButtonsBlockSize(count: number, style: ResolvedLinkButtonStyle, availableWidth: number): { width: number; height: number } {
  if (count <= 0) return { width: 0, height: 0 };
  return { width: Math.max(0, availableWidth), height: count * style.height + (count - 1) * style.gap };
}

/** One button's look (hovered or not). `fontFamily` is the CSS stack for
 * `style.font` (fontList.ts's getFontStyle, resolved by the caller). */
export function linkButtonCss(style: ResolvedLinkButtonStyle, fontFamily: string, hovered = false): CSSProperties {
  const invert = hovered && style.hover.invert;
  const solid = style.fill === "solid";
  const fg = invert ? (solid ? style.color : contrastInk(style.color)) : style.textColor;
  const background = invert
    ? (solid ? style.textColor : style.color)
    : solid ? style.color : style.fill === "glass" ? withOpacity(style.color.startsWith("#") ? style.color : "#ffffff", 0.16) : "transparent";
  const shadows: string[] = [];
  if (style.fill === "outline" || style.fill === "glass") shadows.push(`inset 0 0 0 1.5px ${style.color}`);
  if (hovered && style.hover.glow) shadows.push(`0 0 18px ${withOpacity(style.color.startsWith("#") ? style.color : "#ffffff", 0.55)}`);
  if (hovered && style.hover.lift) shadows.push("0 8px 18px -8px rgba(0,0,0,0.45)");
  return {
    display: "flex", alignItems: "center", justifyContent: "center", gap: Math.round(style.fontSize * 0.55),
    boxSizing: "border-box", height: style.height, padding: `0 ${Math.round(style.fontSize * 1.2)}px`,
    width: style.width === "full" ? "100%" : "auto", maxWidth: "100%",
    borderRadius: style.radius, background, color: fg,
    boxShadow: shadows.length ? shadows.join(", ") : undefined,
    backdropFilter: style.fill === "glass" ? "blur(8px)" : undefined,
    fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: 1, letterSpacing: "-0.01em",
    textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden",
    transform: hovered && style.hover.lift ? "translateY(-2px)" : undefined,
    transition: "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease, color 160ms ease",
  };
}

interface Box { x: number; y: number; w: number; h: number }
const overlaps = (a: Box, b: Box) =>
  Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5;

/** The buttons got a real place: inside the padded card AND not on top of
 * any earlier block (the engine resolves overlaps when there is room; with
 * none it can only clamp). Otherwise ProfileCard hides them. */
export function linkButtonsPlaced(
  layout: { boxes: Partial<Record<string, Box>>; identityRect?: Box }, cardH: number, padding: number,
): boolean {
  const b = layout.boxes.buttons;
  if (!b || b.y + b.h > cardH - padding + 0.5) return false;
  const others = [layout.boxes.pfp, layout.identityRect, layout.boxes.location, layout.boxes.views, layout.boxes.links]
    .filter((o): o is Box => !!o);
  return !others.some(o => overlaps(o, b));
}

/** "https://" added when missing (what the <a> opens). */
export function linkButtonHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
