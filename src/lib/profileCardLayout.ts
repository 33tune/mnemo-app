/**
 * The ProfileCard's composition inputs, built from the card data in ONE
 * place (engine rewrite, 2026-10-15). ProfileCard renders with it, and the
 * resize (useDragDrop), Ctrl/⌘+arrows (canvasNudge) and Medidas use it for
 * the card's minimum size — so the floor the user hits while resizing is
 * exactly the size where the rendered card fits everything. Pure: text
 * widths come from an injected TextMeasurer (textMeasure.ts in the
 * browser), or from the engine's estimates without one (tests, server).
 */
import type { ProfileCardData, ProfileCardVariant } from "@/types";
import {
  computeBlockLayout, computeCardMinSize,
  type BlockLayoutResult, type BlockOverrides, type ButtonsBlockInput, type CompositionInput, type LinksBlockInput,
} from "./cardComposition";
import { getCardPadding, getFreeformCardBounds, PFP_PHOTO_SIZES, resolvePfpSize } from "./cardGeometry";
import { contactLinksNaturalSize, CONTACT_LINK_ICON_SIZE } from "./contactLinksBlock";
import { linkButtonsBlockSize, resolveLinkButtonStyle } from "./linkButtons";
import { resolveCardTypography } from "./cardTypography";
import { getFontStyle } from "./fontList";

/** The CSS font of one text role, as the card renders it. */
export interface MeasureFont {
  family: string;
  size: number;
  weight: number;
  letterSpacing: number;
  uppercase?: boolean;
}

/** Real text measurement (textMeasure.ts). */
export interface TextMeasurer {
  /** Natural single-line width, px, letter-spacing included. */
  width(text: string, font: MeasureFont): number;
  /** Lines `text` takes wrapped at `availWidth` (white-space: pre-wrap). */
  lines(text: string, font: MeasureFont, availWidth: number): number;
}

const SANS = "'DM Sans', sans-serif";
const MONO = "'Space Mono', monospace";

/** "12.3K" — the views counter, as rendered. */
export function formatViewCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function profileVariant(card: ProfileCardData): ProfileCardVariant {
  return (card.variant as ProfileCardVariant) ?? "classic";
}

export function profileNameFontSize(card: ProfileCardData): number {
  const v = profileVariant(card);
  return card.nameFontSize ?? (v === "guns" || v === "poster" ? 17 : 15);
}

/** The photo size before the card's own clamp, with the variant nudge. */
export function profilePfpBase(card: ProfileCardData): number {
  const v = profileVariant(card);
  const base = card.pfpSizePx ?? PFP_PHOTO_SIZES[card.photoSize ?? "md"];
  return v === "guns" || v === "poster" ? Math.max(base, 88) : v === "minimal" ? Math.min(base, 56) : base;
}

export function profileAvatarSize(card: ProfileCardData, w: number, h: number): number {
  return resolvePfpSize(card.photoSize ?? "md", profilePfpBase(card), w, h, getCardPadding(profileVariant(card)));
}

/** The persisted drag anchors of the movable blocks (absent = automatic). */
export function persistedBlockOverrides(card: ProfileCardData): BlockOverrides {
  const pair = (x?: number, y?: number) => (x != null && y != null ? { x, y } : undefined);
  return {
    identity: pair(card.identityAnchorX, card.identityAnchorY),
    location: pair(card.locationAnchorX, card.locationAnchorY),
    views: pair(card.viewsAnchorX, card.viewsAnchorY),
    links: pair(card.linksAnchorX, card.linksAnchorY),
    buttons: pair(card.buttonsAnchorX, card.buttonsAnchorY),
  };
}

export interface ProfileLayoutOptions {
  /** Card size to compose for (defaults: card.w / card.h). */
  w?: number;
  h?: number;
  /** The photo anchor while it is being dragged (defaults: the persisted one). */
  pfpAnchor?: { x: number; y: number };
  /** Block anchors while one is being dragged (defaults: the persisted ones). */
  overrides?: BlockOverrides;
  measure?: TextMeasurer;
  viewCount?: number;
}

export interface ProfileLayoutInputs {
  input: CompositionInput;
  overrides: BlockOverrides;
  links?: LinksBlockInput;
  buttons?: ButtonsBlockInput;
  pad: number;
  avatarSize: number;
}

export function profileLayoutInputs(card: ProfileCardData, o: ProfileLayoutOptions = {}): ProfileLayoutInputs {
  const w = o.w ?? card.w;
  const h = o.h ?? card.h;
  const pad = getCardPadding(profileVariant(card));
  const avatarSize = profileAvatarSize(card, w, h);
  const nameFontSize = profileNameFontSize(card);
  const typo = resolveCardTypography(card, nameFontSize);
  const m = o.measure;
  const font = (family: string, t: { fontSize: number; letterSpacing?: number; fontWeight?: number }, uppercase?: boolean): MeasureFont =>
    ({ family, size: t.fontSize, weight: t.fontWeight ?? 400, letterSpacing: t.letterSpacing ?? 0, uppercase });
  const fonts = {
    name: font(getFontStyle(card.nameFont ?? card.font ?? "DM Sans", SANS), typo.name),
    handle: font(getFontStyle(card.handleFont, MONO), typo.handle),
    descriptor: font(getFontStyle(card.statusFont, MONO), typo.descriptor),
    location: font(getFontStyle(card.locationFont, MONO), typo.location),
    bio: font(getFontStyle(card.bioFont, MONO), typo.bio),
    views: font(getFontStyle(card.viewsFont, MONO), typo.views, true),
  };
  const field = (text: string | undefined, f: MeasureFont, extraChars = 0) => {
    if (!text) return { present: false };
    return { present: true, length: text.length + extraChars, ...(m ? { width: m.width(text, f) } : {}) };
  };
  // HandleLine / LocationLine render "@handle" and "● location".
  const handleText = card.handle ? `@${card.handle}` : undefined;
  const locationText = card.location ? `● ${card.location}` : undefined;
  const viewsText = `${formatViewCount(o.viewCount ?? 0)} views`;
  const bio = card.bio;

  const input: CompositionInput = {
    format: card.format ?? "vertical",
    boxW: w, boxH: h, padding: pad,
    pfp: { anchorX: o.pfpAnchor?.x ?? card.pfpAnchorX ?? 0.5, anchorY: o.pfpAnchor?.y ?? card.pfpAnchorY ?? 0.5, size: avatarSize },
    content: {
      name: field(card.name, fonts.name),
      handle: { ...field(handleText, fonts.handle), length: handleText?.length ?? 0 },
      descriptor: field(card.status, fonts.descriptor),
      location: { ...field(locationText, fonts.location), length: locationText?.length ?? 0 },
      bio: {
        ...field(bio, fonts.bio),
        ...(m && bio ? { linesAt: (availW: number) => m.lines(bio, fonts.bio, availW) } : {}),
      },
      views: card.showViews ? { present: true, ...(m ? { width: m.width(viewsText, fonts.views) } : {}) } : { present: false },
    },
    // Raw override fields: resolveTypographyMetrics applies the same
    // defaults render does (cardTypography.ts).
    typography: {
      nameFontSize, bioFontSize: card.bioFontSize ?? 8,
      nameLetterSpacing: card.nameLetterSpacing, nameLineHeight: card.nameLineHeight,
      handleFontSize: card.handleFontSize, handleLetterSpacing: card.handleLetterSpacing,
      descriptorFontSize: card.statusFontSize, descriptorLetterSpacing: card.descriptorLetterSpacing,
      locationFontSize: card.locationFontSize, locationLetterSpacing: card.locationLetterSpacing,
      bioLineHeight: card.bioLineHeight, viewsFontSize: card.viewsFontSize,
      monoLineHeight: card.monoLineHeight,
    },
    textAlign: card.textAlign ?? "left",
  };

  const availW = Math.max(0, w - 2 * pad);
  const linkCount = (card.contactLinks ?? []).length;
  const links: LinksBlockInput | undefined = linkCount > 0
    ? { size: contactLinksNaturalSize(linkCount, availW, card.linksIconSize ?? CONTACT_LINK_ICON_SIZE) }
    : undefined;
  const buttonCount = (card.linkButtons ?? []).filter(b => b.url).length;
  // Only the SIZE matters here; the color never changes it.
  const buttons: ButtonsBlockInput | undefined = buttonCount > 0
    ? { size: linkButtonsBlockSize(buttonCount, resolveLinkButtonStyle(card.linkButtonStyle, "#ffffff"), availW) }
    : undefined;

  return { input, overrides: o.overrides ?? persistedBlockOverrides(card), links, buttons, pad, avatarSize };
}

/** The card's composed layout (what ProfileCard draws). */
export function profileLayout(card: ProfileCardData, o: ProfileLayoutOptions = {}): BlockLayoutResult & { pad: number; avatarSize: number } {
  const p = profileLayoutInputs(card, o);
  return { ...computeBlockLayout(p.input, p.overrides, p.links, undefined, p.buttons), pad: p.pad, avatarSize: p.avatarSize };
}

/**
 * The smallest size this card can have at width `w` without losing
 * anything (user decision 2026-10-15), within the product bounds
 * (cardGeometry.ts's getFreeformCardBounds). `h` is the minimum height AT
 * `w`; `w` is the minimum width.
 */
export function profileCardMinSize(card: ProfileCardData, w: number, o: Pick<ProfileLayoutOptions, "measure" | "viewCount"> = {}): { w: number; h: number } {
  const b = getFreeformCardBounds();
  // The photo is clamped by the card's width only here: at any height that
  // fits the content the height clamp never binds (photo + padding <= min).
  const p = profileLayoutInputs(card, { ...o, w, h: b.maxH });
  const min = computeCardMinSize(p.input, p.overrides, p.links, p.buttons);
  return {
    w: Math.max(b.minW, Math.min(b.maxW, min.w)),
    h: Math.max(b.minH, Math.min(b.maxH, min.h)),
  };
}

/**
 * Clamps a requested card size to the product bounds AND the content floor:
 * what the resize handles, Ctrl/⌘+arrows and Medidas write. `startW` (the
 * width when the gesture began) keeps a card that is already narrower than
 * its content — saved before this floor existed — from jumping wider.
 */
export function clampProfileCardSize(
  card: ProfileCardData, w: number, h: number,
  o: Pick<ProfileLayoutOptions, "measure" | "viewCount"> & { startW?: number } = {},
): { w: number; h: number } {
  const b = getFreeformCardBounds();
  const minW = Math.min(profileCardMinSize(card, b.maxW, o).w, o.startW ?? Infinity);
  const nw = Math.max(b.minW, minW, Math.min(b.maxW, Math.round(w)));
  const minH = profileCardMinSize(card, nw, o).h;
  const nh = Math.max(minH, Math.min(b.maxH, Math.round(h)));
  return { w: nw, h: nh };
}
