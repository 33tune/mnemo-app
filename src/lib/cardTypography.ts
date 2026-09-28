/**
 * Single source of truth for ProfileCard text-role typography (Stage FASE 1 —
 * Personalization Core). Used by BOTH consumers that need to agree on the
 * exact same numbers:
 *
 * 1. ProfileCard.tsx's render (`resolveCardTypography`) — what actually gets
 *    drawn.
 * 2. cardComposition.ts's measurement (`TYPOGRAPHY_METRICS` +
 *    `resolveTypographyMetrics`) — what the engine assumes when deciding
 *    whether content fits/wraps/overlaps.
 *
 * Before this stage, cardComposition.ts's TEXT_METRICS was a private,
 * hardcoded module-level const with a literal comment: "handle/descriptor
 * size is fixed today, not user-configurable". `TYPOGRAPHY_METRICS` below is
 * that exact same object, byte-for-byte, just relocated here and exported —
 * cardComposition.ts imports it instead of keeping its own copy, so a future
 * change to a default in one place can never silently drift from the other.
 *
 * IMPORTANT ASYMMETRY (deliberate, not a bug): render and engine already used
 * slightly different line-height numbers for the same role before this stage
 * (e.g. name renders at lineHeight 1.2 but the engine reserved 1.3 worth of
 * row height as a safety margin — see cardComposition.ts's file header on
 * SAFETY_MARGIN_PX). That gap is PRESERVED as each side's own default. Once a
 * user explicitly sets an override (e.g. card.nameLineHeight), both sides
 * read the SAME field and therefore land on the SAME number — the invisible
 * safety margin only applies to the pre-existing hardcoded defaults, not to
 * anything the user deliberately takes control of.
 *
 * Font FAMILY and font WEIGHT are deliberately NOT part of the engine-facing
 * metrics: cardComposition.ts's char-width estimates (nameCharW/monoCharW/
 * bioCharW) never varied by font or weight before this stage either — name
 * has always rendered bold (fontWeight 700) while being measured with the
 * same charW as if it weren't. Adding those as engine inputs would be a new
 * capability, not "keep render/engine in sync" — out of scope here; the
 * charW constants stay fixed, non-overridable measurement approximations,
 * exactly as before.
 */

// ── Canonical metrics — moved verbatim from cardComposition.ts's old
//    module-private TEXT_METRICS, now the shared source both consumers read. ──
export const TYPOGRAPHY_METRICS = {
  nameCharW: 0.58, nameLineH: 1.3, nameLetterSpacing: 0,
  monoCharW: 0.6,  monoLineH: 1.4,   // handle/descriptor/location/views (Space Mono is fixed-width-ish)
  handleLetterSpacing: 0.4, descriptorLetterSpacing: 0.5, locationLetterSpacing: 0.3,
  bioCharW: 0.55,  bioLineH: 1.5,
  monoFontSize: 9,                   // handle/descriptor default size
  locationFontSize: 8,
  viewsFontSize: 9,
  viewsWidthPx: 84,                  // "12.3K views" @ letterSpacing 1.5 + uppercase — not length-dependent
} as const;

// Render-only defaults — these never fed measurement before this stage either
// (see file header). Kept here (not duplicated in ProfileCard.tsx) so
// resolveCardTypography is the one place that knows them.
const RENDER_DEFAULTS = {
  nameLineHeight: 1.2,
  nameFontWeight: 700,
  bioLineHeight: 1.6,
  viewsLetterSpacing: 1.5,
} as const;

// ── Engine-facing: extends CompositionTypographyInput's optional fields ────

/** Matches cardComposition.ts's CompositionTypographyInput shape (duplicated
 * here structurally, not imported, to keep this file dependency-free of
 * cardComposition.ts — cardComposition.ts is the one that imports FROM here). */
export interface TypographyMeasurementInput {
  nameFontSize: number;
  bioFontSize: number;
  nameLetterSpacing?: number;
  nameLineHeight?: number;
  handleFontSize?: number;
  handleLetterSpacing?: number;
  descriptorFontSize?: number;
  descriptorLetterSpacing?: number;
  locationFontSize?: number;
  locationLetterSpacing?: number;
  bioLineHeight?: number;
  viewsFontSize?: number;
  monoLineHeight?: number;
}

export interface ResolvedTypographyMetrics {
  nameCharW: number; nameLineH: number; nameLetterSpacing: number;
  monoCharW: number; monoLineH: number;
  handleFontSize: number; handleLetterSpacing: number;
  descriptorFontSize: number; descriptorLetterSpacing: number;
  locationFontSize: number; locationLetterSpacing: number;
  bioCharW: number; bioLineH: number;
  viewsFontSize: number; viewsWidthPx: number;
}

/**
 * Merges a composition call's typography input with TYPOGRAPHY_METRICS'
 * defaults. Called once per computeComposition()/computeBlockLayout() call
 * (cardComposition.ts's resolveContentBlock/resolveCentered) — every field
 * left absent on the input resolves to the exact constant that was
 * previously hardcoded, so a call with no new optional fields set produces
 * measurements byte-identical to before this stage.
 */
export function resolveTypographyMetrics(input: TypographyMeasurementInput): ResolvedTypographyMetrics {
  return {
    nameCharW: TYPOGRAPHY_METRICS.nameCharW,
    nameLineH: input.nameLineHeight ?? TYPOGRAPHY_METRICS.nameLineH,
    nameLetterSpacing: input.nameLetterSpacing ?? TYPOGRAPHY_METRICS.nameLetterSpacing,
    monoCharW: TYPOGRAPHY_METRICS.monoCharW,
    monoLineH: input.monoLineHeight ?? TYPOGRAPHY_METRICS.monoLineH,
    handleFontSize: input.handleFontSize ?? TYPOGRAPHY_METRICS.monoFontSize,
    handleLetterSpacing: input.handleLetterSpacing ?? TYPOGRAPHY_METRICS.handleLetterSpacing,
    descriptorFontSize: input.descriptorFontSize ?? TYPOGRAPHY_METRICS.monoFontSize,
    descriptorLetterSpacing: input.descriptorLetterSpacing ?? TYPOGRAPHY_METRICS.descriptorLetterSpacing,
    locationFontSize: input.locationFontSize ?? TYPOGRAPHY_METRICS.locationFontSize,
    locationLetterSpacing: input.locationLetterSpacing ?? TYPOGRAPHY_METRICS.locationLetterSpacing,
    bioCharW: TYPOGRAPHY_METRICS.bioCharW,
    bioLineH: input.bioLineHeight ?? TYPOGRAPHY_METRICS.bioLineH,
    viewsFontSize: input.viewsFontSize ?? TYPOGRAPHY_METRICS.viewsFontSize,
    viewsWidthPx: TYPOGRAPHY_METRICS.viewsWidthPx,
  };
}

// ── Render-facing: what ProfileCard.tsx's Line components consume ─────────

export interface RoleTypographyCardFields {
  nameLetterSpacing?: number;
  nameLineHeight?: number;
  nameFontWeight?: number;
  handleFontSize?: number;
  handleLetterSpacing?: number;
  statusFontSize?: number;       // descriptor's size — reuses the existing field
  descriptorLetterSpacing?: number;
  locationFontSize?: number;
  locationLetterSpacing?: number;
  bioFontSize?: number;
  bioLineHeight?: number;
  viewsFontSize?: number;
  monoLineHeight?: number;       // shared by handle/descriptor/location/views
  // Stage FASE 2: per-role weight — same "absent = no explicit CSS property"
  // contract as monoLineHeight (handle/descriptor/location/bio/views never
  // had an explicit font-weight before this stage, browser default applied).
  handleFontWeight?: number;
  descriptorFontWeight?: number;
  locationFontWeight?: number;
  bioFontWeight?: number;
  viewsFontWeight?: number;
  /** Stage FASE 2: the one mono role FASE 1 left non-overridable — render
   * only, views' width was never letter-spacing-derived. */
  viewsLetterSpacing?: number;
}

export interface ResolvedCardTypography {
  name: { fontSize: number; letterSpacing: number; lineHeight: number; fontWeight: number };
  handle: { fontSize: number; letterSpacing: number; lineHeight?: number; fontWeight?: number };
  descriptor: { fontSize: number; letterSpacing: number; lineHeight?: number; fontWeight?: number };
  location: { fontSize: number; letterSpacing: number; lineHeight?: number; fontWeight?: number };
  bio: { fontSize: number; lineHeight: number; fontWeight?: number };
  views: { fontSize: number; letterSpacing: number; lineHeight?: number; fontWeight?: number };
}

/**
 * Render-side counterpart to resolveTypographyMetrics — same override
 * fields, same TYPOGRAPHY_METRICS defaults for fontSize/letterSpacing (those
 * already matched between render and engine before this stage), but its own
 * RENDER_DEFAULTS for line-height/weight (see file header's asymmetry note).
 * `nameFontSize` is passed in already-resolved (ProfileCard.tsx nudges it per
 * variant before this call — that's product logic, not a typography concern).
 * `handle`/`descriptor`/`location`/`views`' `lineHeight` is left `undefined`
 * when `card.monoLineHeight` is absent — the pre-existing render never set
 * an explicit line-height for these roles at all (relied on the browser
 * default), so omitting the CSS property entirely (not just passing a
 * "default" number) is what byte-identical actually requires here.
 */
export function resolveCardTypography(card: RoleTypographyCardFields, nameFontSize: number): ResolvedCardTypography {
  return {
    name: {
      fontSize: nameFontSize,
      letterSpacing: card.nameLetterSpacing ?? TYPOGRAPHY_METRICS.nameLetterSpacing,
      lineHeight: card.nameLineHeight ?? RENDER_DEFAULTS.nameLineHeight,
      fontWeight: card.nameFontWeight ?? RENDER_DEFAULTS.nameFontWeight,
    },
    handle: {
      fontSize: card.handleFontSize ?? TYPOGRAPHY_METRICS.monoFontSize,
      letterSpacing: card.handleLetterSpacing ?? TYPOGRAPHY_METRICS.handleLetterSpacing,
      lineHeight: card.monoLineHeight,
      fontWeight: card.handleFontWeight,
    },
    descriptor: {
      fontSize: card.statusFontSize ?? TYPOGRAPHY_METRICS.monoFontSize,
      letterSpacing: card.descriptorLetterSpacing ?? TYPOGRAPHY_METRICS.descriptorLetterSpacing,
      lineHeight: card.monoLineHeight,
      fontWeight: card.descriptorFontWeight,
    },
    location: {
      fontSize: card.locationFontSize ?? TYPOGRAPHY_METRICS.locationFontSize,
      letterSpacing: card.locationLetterSpacing ?? TYPOGRAPHY_METRICS.locationLetterSpacing,
      lineHeight: card.monoLineHeight,
      fontWeight: card.locationFontWeight,
    },
    bio: {
      fontSize: card.bioFontSize ?? 8,
      lineHeight: card.bioLineHeight ?? RENDER_DEFAULTS.bioLineHeight,
      fontWeight: card.bioFontWeight,
    },
    views: {
      fontSize: card.viewsFontSize ?? TYPOGRAPHY_METRICS.viewsFontSize,
      letterSpacing: card.viewsLetterSpacing ?? RENDER_DEFAULTS.viewsLetterSpacing,
      lineHeight: card.monoLineHeight,
      fontWeight: card.viewsFontWeight,
    },
  };
}
