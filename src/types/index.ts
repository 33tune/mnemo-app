export type CanvasMode = 'home' | 'space' | 'space_mobile';

// ── ProfileCard block style overrides (Stage FASE 1 — Personalization Core) ──
// Same 5 block keys ProfileCard.tsx's own BlockKey already uses for drag
// (identity/location/views/links/music) — see blockStyle.ts. First version:
// background/textColor/iconColor/radius only, deliberately excludes anything
// that would change the box computeBlockLayout() measures (padding, border
// width, size) — see that file's header for why.
export type BlockStyleKey = "identity" | "location" | "views" | "links";
export interface BlockStyleOverride {
  bg?:        string;
  textColor?: string;
  iconColor?: string;
  radius?:    number;
}

// ── ProfileCard text effects (Stage FASE 1 — Personalization Core) ─────────
// Infrastructure only — no UI writes these yet (see CLAUDE.md checkpoint).
// Lives at CardEffects.text; see textEffects.ts's resolveTextEffectStyle.
export interface TextShadowEffect {
  color?:   string;
  opacity?: number;  // 0-1
  blur?:    number;  // px
  offsetX?: number;  // px
  offsetY?: number;  // px
}
export interface TextGlowEffect {
  color?:     string;
  intensity?: number; // 0-1
  radius?:    number; // px
}
export interface TextStrokeEffect {
  color?: string;
  width?: number; // px
}
export interface TextEffects {
  shadow?: TextShadowEffect;
  glow?:   TextGlowEffect;
  stroke?: TextStrokeEffect;
  // Stage FASE 3: filter: blur(px) on the glyphs themselves — distinct from
  // shadow.blur, which only blurs the shadow layer, never the glyph. Stays
  // card-wide like shadow/glow/stroke above (not per-role — see
  // CardEffects.textRoles below for what IS per-role and why the split).
  blur?: number;
}

// Stage "Product closeout": multicolor gradient text (background-clip:text)
// — mutually exclusive with a role's solid color, gradient always wins when
// present (see textEffects.ts's resolveTextEffectStyle and
// RoleTypographyFields.tsx, where the solid ColorRow disables itself when
// this is set). `colors` is 2+ stops, evenly distributed across `angle`
// degrees (same angle convention as CardEffects.gradient) — was a fixed
// {from,to} pair in FASE 3; upgraded here to N colors since that's a strict
// superset (2 colors = byte-identical gradient to before). Old persisted
// {from,to} data (no `colors` array) is read via a defensive fallback in
// the resolver — see textEffects.ts.
export interface TextGradientEffect {
  colors: string[];
  angle:  number;
  /** @deprecated pre-multicolor shape — only ever read as a fallback when
   * `colors` is absent, never written by current UI. */
  from?:  string;
  /** @deprecated see `from`. */
  to?:    string;
}
// Shimmer on a text role. Works with OR without `gradient` on the same
// role ("Product closeout" fix): with a gradient, the gradient's own stops
// flow along its angle; without one, a highlight band sweeps across a flat
// surface synthesized from the role's resolved solid color — see
// textEffects.ts's resolveTextEffectStyle. Presence = enabled, same
// "absence = off" contract as card.music/blockStyle elsewhere.
export interface TextShimmerEffect {
  intensity?: number; // 0-1, opacity of the sweeping band
  speed?:     number; // unitless multiplier, 1 = default pace
}
// Stage "Product closeout": per-character bounce animation — Name only (see
// RoleTypographyFields.tsx, rendered conditionally per role label). When
// combined with gradient/multicolor, each letter gets a SOLID color
// interpolated from the gradient stops by character index rather than a
// sliced background-clip — a position-fixed gradient would visibly "shear"
// once letters independently translate, so per-letter solid interpolation
// is the correct choice here, not a shortcut (see cardColors.ts's
// interpolateMulticolor). When combined with shimmer, the sweep becomes a
// per-letter staggered opacity pulse instead of a position-swept band, for
// the same reason. Presence = enabled.
export interface TextLetterAnimationEffect {
  amplitude?: number; // px, default 4
  speed?:     number;  // unitless multiplier, 1 = default pace
  stagger?:   number;  // seconds between each letter's start, default 0.05
}
// Deliberately separate from TextEffects (above): shadow/glow/stroke/blur
// are card-wide (one setting affects every text role uniformly, unchanged
// since FASE 1/2) — gradient/shimmer/letter-animation are what the product
// spec explicitly requires per-role (username-style accent effects belong
// to individual roles, not the whole card at once; see CLAUDE.md's FASE 3
// checkpoint). Separate fields on CardEffects rather than folding these
// into TextEffects keeps existing FASE 1/2 data (already shipped) untouched
// — no shape change to `card.effects.text`, no migration needed.
export interface RoleTextEffect {
  gradient?:        TextGradientEffect;
  shimmer?:         TextShimmerEffect;
  letterAnimation?: TextLetterAnimationEffect;
}
export type TextRole = "name" | "handle" | "descriptor" | "location" | "bio" | "views";

// Stage FASE 3: shared by CardEffects.glow.animation and
// CardEffects.pfp.glow.animation — same shape, same resolver
// (cardMotion.ts's resolveGlowPulseAnimation), applied to whichever glow
// layer it's attached to.
export interface GlowPulseAnimation {
  enabled: boolean;
  speed?:  number; // unitless multiplier, 1 = default pace
}

export type CanvasImage = {
  id: string;
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  naturalW: number;
  naturalH: number;
  isTransparent: boolean;
  zIndex: number;
  layer: 0 | 1 | 2;
  depth: number;
  rotation: number;
  borderRadius?: number;
  locked?: boolean;
  isPublic?: boolean;
  pinCount?: number;
  storage_path?: string;
  linkUrl?: string;
  isLocal?: boolean;
};

export type CardType = "empty" | "text" | "list" | "gallery" | "links" | "folder";

export type CanvasCard = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  type: CardType;
  bgColor: string;
  bgImage: string;
  bgMode?: "cover" | "repeat";
  borderRadius: number;
  opacity: number;
  layer: 0 | 1 | 2;
  depth: number;
  rotation: number;
  isIdentityCard?: boolean;
  textColor?: string;
  locked?: boolean;
  content?: string;
  listItems?: { id: string; text: string; checked: boolean }[];
  linkItems?: { id: string; url: string; title: string }[];
  cardFont?: TextFont;
  cardFontSize?: number;
  isPublic?: boolean;
};

// Intentionally a string so future fonts (including custom uploads) need no type update.
export type TextFont = string;

export type CanvasText = {
  id: string;
  x: number;
  y: number;
  zIndex: number;
  layer: 0 | 1 | 2;
  depth: number;
  rotation: number;
  content: string;
  font: TextFont;
  size: number;
  color: string;
  opacity: number;
  letterSpacing: number;
  uppercase: boolean;
  locked?: boolean;
  isPublic?: boolean;
  pinCount?: number;
};

export type GalleryImage = {
  id: string;
  src: string;
  name: string;
};

export type CanvasGallery = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  layer: 0 | 1 | 2;
  depth: number;
  rotation: number;
  images: GalleryImage[];
  expanded: boolean;
  borderRadius: number;
  opacity: number;
  locked?: boolean;
  isPublic?: boolean;
};

export type PhotoSize = "sm" | "md" | "lg";

export type ProfileCardVariant = "classic" | "glass" | "guns" | "minimal" | "poster";

// Structural geometry only — NOT a visual preset. Does not touch color/font/
// effects/content. brochure/miniProfile are reserved for later, not wired yet.
export type CardFormat = "vertical" | "horizontal" | "square" | "phone" | "card";

export type ProfileLink = {
  id:    string;
  url:   string;
  label: string;
  icon?: string;
  kind?: "icon" | "button";
  x?:    number;
  y?:    number;
  scale?: number;
};

// Music block (Stage 4.2-C) — data model only in 4.2-C.1, player UI lands in
// 4.2-C.2. Scoped to option (A) from the 4.2-C audit: self-hosted/uploaded
// audio or a direct playable audio file URL — NOT Spotify/YouTube/SoundCloud
// embeds (that's a separate, later stage if it happens at all). `volume` is
// the owner's configured STARTING volume, never live playback state —
// `playing`/`currentTime` are never persisted here or anywhere: they're
// local-to-the-viewer React state in the player component, same as any
// other browser's own <audio> element controls itself.
export type MusicSourceType = "upload" | "url";

export type MusicBlockData = {
  sourceType: MusicSourceType;
  audioUrl:   string;
  title?:     string;
  artist?:    string;
  artwork?:   string; // storage URL, same uploadToStorage() flow as bgImage
  volume?:    number; // 0-1, initial volume only
};

// Contact Links (Stage 4.2-B) — the first real internal ProfileCard block.
// Deliberately leaner than ProfileLink/SocialLink above: no label, no kind,
// no free x/y (the whole block moves together via linksAnchorX/Y, see
// ProfileCardData below) — platform is derived from `url` via detectPlatform()
// in SocialIcons.tsx on read, never persisted (it's fully recomputable and
// would just drift out of sync with the url otherwise).
export type ContactLink = {
  id:  string;
  url: string;
};

export type SocialLink = {
  id:       string;
  platform: string;
  url:      string;
  x?:       number;
  y?:       number;
  scale?:   number;
};

export type MediaType = "spotify" | "youtube" | "soundcloud";

export type CanvasMedia = {
  id:        string;
  x:         number;
  y:         number;
  w:         number;
  h:         number;
  zIndex:    number;
  layer:     0 | 1 | 2;
  depth:     number;
  rotation:  number;
  url:       string;
  mediaType: MediaType;
  locked?:   boolean;
  isPublic?: boolean;
};

// ── Profile Card — identity only ─────────────────────────────────────────────

export type ProfileCardData = {
  id:              string;
  userId?:         string;
  x:               number;
  y:               number;
  w:               number;
  h:               number;
  zIndex:          number;
  layer:           0 | 1 | 2;
  depth:           number;
  rotation:        number;
  // Geometry — structural format + size, independent of layout/variant.
  // Legacy-safe: absent on any card means "vertical" default (see cardGeometry.ts).
  format?:         CardFormat;
  sizeScale?:      number; // 0-1, see resolveCardSize() in cardGeometry.ts
  // Composition (Stage 3B) — where the user dragged the PFP, 0-1 normalized
  // within the card's padded content area. Feeds computeComposition() in
  // cardComposition.ts. Independent of the legacy photoX/photoY (free mode,
  // 0-100, % of the whole card) below — do not conflate the two.
  pfpAnchorX?:     number;
  pfpAnchorY?:     number;
  // PFP size/shape (Stage 3B.2-B) — continuous overrides. Absent means "use
  // the legacy photoSize preset" / "full circle", so every existing card
  // renders unchanged. See resolvePfpSize() in cardGeometry.ts.
  pfpSizePx?:      number;
  pfpRadius?:      number; // 0-100: 0 = square corners, 100 = full circle.
  // Text alignment of the identity/content block — orthogonal to where the
  // composition engine places that block (anchor-driven). See cardComposition.ts.
  textAlign?:      "left" | "center" | "right";
  // Block position overrides (Stage 3B.3) — same normalized-anchor model as
  // pfpAnchorX/Y (0-1 within the card's padded content area), one pair per
  // semantic block. Absent means "no override, use the automatic base
  // composition" (computeComposition's existing placement) — every existing
  // card has none of these set and renders exactly as before. See
  // computeBlockLayout() in cardComposition.ts. Independent of the legacy
  // nameX/nameY/etc. (free mode) below — do not conflate the two.
  identityAnchorX?: number; // Name + Handle + Descriptor + Bio, moved as one group
  identityAnchorY?: number;
  locationAnchorX?: number;
  locationAnchorY?: number;
  viewsAnchorX?:    number;
  viewsAnchorY?:    number;
  // Links block anchor (Stage 4.2-A infrastructure, wired to a real block in
  // Stage 4.2-B) — same model as the three above. See computeBlockLayout()'s
  // LinksBlockInput in cardComposition.ts.
  linksAnchorX?:    number;
  linksAnchorY?:    number;
  // Contact Links (Stage 4.2-B) — the internal block those anchors position.
  // Absent/empty means "no Contact Links block", and every existing card
  // renders exactly as before (see cardComposition.ts's regression test).
  contactLinks?:    ContactLink[];
  // Icon diameter override for Contact Links (Stage 4.2-C.2.1, menu slider —
  // see ProfileContactLinksMenu.tsx). Absent -> CONTACT_LINK_ICON_SIZE
  // (contactLinksBlock.ts), same as before this field existed. Clamped to
  // CONTACT_LINK_ICON_SIZE_MIN/MAX at the menu input boundary.
  linksIconSize?:   number;
  // DEPRECATED — Music left ProfileCard's internal composition (it's now an
  // independent canvas element, MusicCardData/MusicCardWidget.tsx, with its
  // own audioUrl/title/artist/volume). These 4 fields are kept ONLY for
  // backward compat with any pre-existing card that had them set — nothing
  // reads or writes them anymore (no menu, no render, no computeBlockLayout
  // call ever passes `music` again). Safe to ignore going forward.
  musicAnchorX?:    number;
  musicAnchorY?:    number;
  music?:           MusicBlockData;
  musicWidth?:      number;
  // Logo — a free visual element living inside ProfileCard's own bounds
  // (NOT a structural block: no computeBlockLayout participation, no growth
  // impact, never measured — see ProfileCard.tsx's renderComposed()).
  // Position is a normalized anchor within the card's padded content area,
  // same anchorToRect/snapAxis contract blockConstraints.ts already
  // provides for every other draggable block, resolved WITHOUT the
  // anti-overlap pass (Logo never pushes or gets pushed by other blocks —
  // it can sit behind, in front of, or between them, purely via zIndex).
  // Size is menu-slider-driven (same "position via drag, size via menu"
  // pattern already established by PFP/the old Music block), not
  // drag-resize — there is no existing drag-resize infrastructure for
  // blocks internal to ProfileCard, and building one is out of scope here.
  logo?: {
    url:       string;
    anchorX:   number; // 0-1, normalized within the padded content area
    anchorY:   number;
    w:         number; // px
    h:         number; // px
    opacity?:  number; // 0-1, default 1
    rotation?: number; // degrees, default 0
    zIndex?:   number; // stacking relative to other blocks (which are
                        // implicitly z-index 0, DOM-order-stacked) —
                        // negative = behind, positive = in front
  };
  // Identity
  photo:           string;
  name:            string;
  handle:          string;
  status:          string;
  location?:       string;
  bio?:            string;
  // Photo positioning
  photoX:          number;
  photoY:          number;
  photoScale?:     number;
  photoSize:       PhotoSize;
  // Text block (legacy fallback)
  textX:           number;
  textY:           number;
  textScale?:      number;
  // Per-element positions
  nameX?:          number;
  nameY?:          number;
  nameScale?:      number;
  handleX?:        number;
  handleY?:        number;
  handleScale?:    number;
  statusX?:        number;
  statusY?:        number;
  statusScale?:    number;
  locationX?:      number;
  locationY?:      number;
  locationScale?:  number;
  bioX?:           number;
  bioY?:           number;
  bioScale?:       number;
  // Views counter
  showViews?:      boolean;
  viewsX?:         number;
  viewsY?:         number;
  viewsScale?:     number;
  // Typography
  font?:           TextFont;
  nameFont?:       TextFont;
  nameFontSize?:   number;
  bioFontSize?:    number;
  statusFont?:     TextFont;
  statusFontSize?: number;
  locationFontSize?: number;
  textColor?:      string;
  // Stage FASE 1 (Personalization Core): per-role typography, feeding BOTH
  // ProfileCard.tsx's render (resolveCardTypography) and cardComposition.ts's
  // measurement (resolveTypographyMetrics) from the same source — see
  // cardTypography.ts. Absent = the exact numbers each side already
  // hardcoded before this stage (see that file's header for the deliberate
  // render/engine default asymmetry). descriptor's size/letter-spacing reuse
  // `statusFontSize` above (status IS the descriptor field) plus the new
  // `descriptorLetterSpacing`; location's size reuses `locationFontSize`.
  nameLetterSpacing?: number;
  nameLineHeight?:    number;
  nameFontWeight?:    number;
  handleFontSize?:    number;
  handleLetterSpacing?: number;
  descriptorLetterSpacing?: number;
  locationLetterSpacing?:   number;
  bioLineHeight?:     number;
  viewsFontSize?:     number;
  /** Stage FASE 2: views is otherwise a normal mono role (fontSize/
   * lineHeight/weight all already overridable) — this fills the one gap
   * FASE 1 left (its letter-spacing was hardcoded, no other mono role was).
   * Render-only: views' width was never letter-spacing-derived (fixed
   * viewsWidthPx, see cardComposition.ts), so no engine change needed. */
  viewsLetterSpacing?: number;
  /** Shared line-height for handle/descriptor/location/views — these never
   * had an explicit CSS line-height before this stage (browser default), so
   * absent means "don't set the property at all", not "use some default
   * number" — see cardTypography.ts's resolveCardTypography. */
  monoLineHeight?:    number;
  // Stage FASE 2 (Personalization UI/UX): per-role font family + weight —
  // extends the same resolver (cardTypography.ts's resolveCardTypography),
  // not a parallel mechanism. Font family never fed measurement even for
  // `nameFont` in FASE 1 (charW estimates are fixed regardless of typeface),
  // so this stays purely a render concern, same as before. Absent = the
  // exact fontFamily/fontWeight each role already rendered with (MONO for
  // handle/descriptor/location/bio/views, no explicit weight — browser
  // default — for anything but name, which already defaulted to 700).
  // `nameFont`/`statusFont` above are reused for name/descriptor; the other
  // 4 roles get their own field, same pattern.
  handleFont?:      TextFont;
  locationFont?:    TextFont;
  bioFont?:         TextFont;
  viewsFont?:       TextFont;
  handleFontWeight?:     number;
  descriptorFontWeight?: number;
  locationFontWeight?:   number;
  bioFontWeight?:        number;
  viewsFontWeight?:      number;
  // Stage FASE 1: per-role text color, resolved via resolveCardColors
  // (cardColors.ts). Absent = the exact opacity-derived color each role
  // already rendered with before this stage. `textColor` above stays the
  // BASE color every role derives its default from — these are additional,
  // independent overrides layered on top of that base, one per role.
  nameColor?:       string;
  handleColor?:     string;
  descriptorColor?: string;
  locationColor?:   string;
  bioColor?:        string;
  viewsColor?:      string;
  linksIconColor?:  string;
  // Stage FASE 1: first version of per-block visual overrides — background/
  // textColor/iconColor/radius ONLY (deliberately no padding/border/size —
  // those change the box computeBlockLayout() measures, see blockStyle.ts's
  // header). Absent per-block or per-field = inherits ProfileCard's own
  // look exactly as before this stage.
  blockStyle?:      Partial<Record<BlockStyleKey, BlockStyleOverride>>;
  // Block 1 ("apagar no borra"): editor-only stash for a block override the
  // user switched OFF ("Personalizar este bloque"), restored when switched
  // back ON — same idea as CardEffects.paused, as a sibling field because
  // blockStyle doesn't live in effects. Nothing renders from it:
  // resolveBlockStyle (blockStyle.ts) only reads `blockStyle[key]`.
  blockStylePaused?: Partial<Record<BlockStyleKey, BlockStyleOverride>>;
  // Style
  bgColor:         string;
  bgImage:         string;
  bgMode?:         "cover" | "repeat";
  borderRadius:    number;
  opacity:         number;
  variant?:        ProfileCardVariant;
  accentColor?:    string;
  glowIntensity?:  number;
  glowColor?:      string;
  borderColor?:    string;
  borderWidth?:    number;
  bgOverlayOpacity?: number;
  // Layout mode
  layout?:         "vertical" | "horizontal" | "free";
  // State
  locked?:         boolean;
  isPublic?:       boolean;
  // Stack
  stackId?:        string;
  isStackAnchor?:  boolean;
  // Effects
  effects?:        CardEffects;
};

// ── Module cards ─────────────────────────────────────────────────────────────

export type SocialCardData = {
  id:            string;
  x:             number;
  y:             number;
  w:             number;
  h:             number;
  zIndex:        number;
  layer:         0 | 1 | 2;
  depth:         number;
  rotation:      number;
  locked?:       boolean;
  isPublic?:     boolean;
  stackId?:      string;
  socialLinks:   SocialLink[];
  bgColor?:      string;
  bgImage?:      string;
  bgMode?:       "cover" | "repeat";
  borderRadius?: number;
  opacity?:      number;
  variant?:      ProfileCardVariant;
  borderColor?:  string;
  borderWidth?:  number;
  glowColor?:    string;
  glowIntensity?: number;
  textColor?:    string;
  iconSize?:     number;
  effects?:      CardEffects;
};

export type MusicCardData = {
  id:            string;
  x:             number;
  y:             number;
  w:             number;
  h:             number;
  zIndex:        number;
  layer:         0 | 1 | 2;
  depth:         number;
  rotation:      number;
  locked?:       boolean;
  isPublic?:     boolean;
  stackId?:      string;
  // Legacy link-preview fields (Spotify/YouTube/SoundCloud URL + a "mood"
  // caption, never a real player) — kept for backward compat with any
  // pre-existing data, no longer written by MusicCardWidget.tsx.
  musicUrl?:     string;
  mood?:         string;
  // Stage "Product closeout" — Music as an independent canvas element
  // (moved out of ProfileCard's internal composition; see ProfileCard.tsx's
  // FASE history). Same shape as MusicBlockData's own fields, self-hosted
  // audio only — MusicCardWidget.tsx renders these via the exact same
  // ProfileMusicPlayer.tsx component ProfileCard used to.
  audioUrl?:     string;
  title?:        string;
  artist?:       string;
  volume?:       number;
  bgColor?:      string;
  bgImage?:      string;
  bgMode?:       "cover" | "repeat";
  borderRadius?: number;
  opacity?:      number;
  variant?:      ProfileCardVariant;
  borderColor?:  string;
  borderWidth?:  number;
  glowColor?:    string;
  glowIntensity?: number;
  textColor?:    string;
  textSize?:     number;
  font?:         TextFont;
  effects?:      CardEffects;
};

export type LinksCardData = {
  id:            string;
  x:             number;
  y:             number;
  w:             number;
  h:             number;
  zIndex:        number;
  layer:         0 | 1 | 2;
  depth:         number;
  rotation:      number;
  locked?:       boolean;
  isPublic?:     boolean;
  stackId?:      string;
  links:         ProfileLink[];
  bgColor?:      string;
  bgImage?:      string;
  bgMode?:       "cover" | "repeat";
  borderRadius?: number;
  opacity?:      number;
  variant?:      ProfileCardVariant;
  borderColor?:  string;
  borderWidth?:  number;
  glowColor?:    string;
  glowIntensity?: number;
  textColor?:    string;
  textSize?:     number;
  font?:         TextFont;
  iconSize?:     number;
  iconGap?:      number;
  iconOrientation?: "horizontal" | "vertical";
  displayMode?:  "icons" | "icons-text";
  effects?:      CardEffects;
};

// ── Stats module ─────────────────────────────────────────────────────────────

export type StatBlock = {
  id:      string;
  label?:  string;
  visible: boolean;
};

export type StatsCardData = {
  id:            string;
  x:             number;
  y:             number;
  w:             number;
  h:             number;
  zIndex:        number;
  layer:         0 | 1 | 2;
  depth:         number;
  rotation:      number;
  locked?:       boolean;
  isPublic?:     boolean;
  stackId?:      string;
  stats?:        StatBlock[];
  displayLayout?: "grid" | "list" | "compact";
  bgColor?:      string;
  bgImage?:      string;
  bgMode?:       "cover" | "repeat";
  borderRadius?: number;
  opacity?:      number;
  borderColor?:  string;
  borderWidth?:  number;
  glowColor?:    string;
  glowIntensity?: number;
  textColor?:    string;
  textSize?:     number;
  font?:         TextFont;
  effects?:      CardEffects;
};

// ── Guestbook ────────────────────────────────────────────────────────────────

export type GuestbookMessage = {
  id:            string;
  profile_id:    string;
  author_id:     string | null;
  author_name:   string;
  author_avatar: string;
  message:       string;
  anonymous:     boolean;
  created_at:    string;
};

export type GuestbookPreset = "default" | "notebook" | "ambient" | "minimal" | "old-internet" | "sticky";

export type GuestbookCardData = {
  id:            string;
  x:             number;
  y:             number;
  w:             number;
  h:             number;
  zIndex:        number;
  layer:         0 | 1 | 2;
  depth:         number;
  rotation:      number;
  locked?:       boolean;
  isPublic?:     boolean;
  stackId?:      string;
  preset?:       GuestbookPreset;
  bgColor?:      string;
  bgImage?:      string;
  bgMode?:       "cover" | "repeat";
  borderRadius?: number;
  opacity?:      number;
  blur?:         number;
  brightness?:   number;
};

// ── Card Effects System ───────────────────────────────────────────────────────

export type CardEffects = {
  bg?: {
    color?: string;
    image?: string;
    imageMode?: "cover" | "repeat";
    opacity?: number;   // 0–1
    blur?: number;      // 0–20 backdrop blur px
    glass?: boolean;
  };
  border?: {
    color?: string;
    width?: number;     // 0–6px
    radius?: number;    // 0–60px
    opacity?: number;   // 0–1
  };
  glow?: {
    color?: string;
    intensity?: number; // 0–1
    inner?: boolean;
    outer?: boolean;
    // Stage FASE 1: independent radius — absent falls back to the original
    // intensity*30 formula (CardLayers.tsx), same visual result as before
    // this field existed. See CardLayers.tsx's glow layer for the exact math.
    radius?: number; // px
    // Stage FASE 3: "border animation" in the UI (ProfileEffectsMenu's
    // "Borde" section) — pulses this same glow's opacity via
    // cardMotion.ts's shared keyframe. Reuses the glow the user already
    // configured rather than introducing a second glow concept; a pulse
    // with no visible glow underneath (intensity 0, outer/inner both off)
    // is an accepted no-op, not a bug.
    animation?: GlowPulseAnimation;
  };
  shadow?: {
    color?: string;
    intensity?: number; // 0–1
    // Stage FASE 1: independent from `intensity` — each absent field falls
    // back to the original intensity-derived formula (blur = intensity*40,
    // offsetY = intensity*8, offsetX = 0, opacity = 1 if color is explicit
    // else the 0.5 baked into the old "rgba(0,0,0,0.5)" default). See
    // CardLayers.tsx's shadow layer.
    blur?:    number; // px
    offsetX?: number; // px
    offsetY?: number; // px
    opacity?: number; // 0–1
  };
  // Stage FASE 1: per-text-effect infrastructure (shadow/glow/stroke/blur on
  // the TEXT itself, distinct from the card-level shadow/glow above).
  // Card-wide — applies uniformly to every text role. See textEffects.ts.
  text?: TextEffects;
  // Stage FASE 3: per-role gradient/shimmer — see RoleTextEffect's header
  // for why this is a separate field from `text` above rather than folded
  // into it.
  textRoles?: Partial<Record<TextRole, RoleTextEffect>>;
  // Stage FASE 2: PFP-specific border/shadow/glow — same shape as the
  // card-level fields above, deliberately separate (the avatar is a single
  // div, not the multi-layer CardLayers.tsx stack, so it resolves these
  // directly in ProfileCard.tsx rather than through CardLayers). Absent =
  // the exact variant-derived border/shadow ProfileCard.tsx already
  // hardcoded before this stage (see its avatarBorder/avatarShadow).
  pfp?: {
    border?: { color?: string; width?: number; opacity?: number };
    shadow?: { color?: string; intensity?: number };
    // Stage FASE 3: same GlowPulseAnimation as the card-level glow above —
    // same shared keyframe (cardMotion.ts), independent instance (its own
    // speed, its own element).
    glow?:   { color?: string; intensity?: number; radius?: number; animation?: GlowPulseAnimation };
  };
  gradient?: {
    from: string;
    to: string;
    angle: number;
    opacity: number;
  };
  interactions?: {
    tilt3d?: boolean;
    tiltIntensity?: number;
    spotlight?: boolean;
    spotlightColor?: string;
    spotlightSize?: number;
    // Stage FASE 3: previously dead (Toggle existed in 5 menus, nothing
    // ever read these) — now implemented via useCardInteractions.ts's
    // onMouseEnter + CardLayers.tsx's `--hover-glow`/`--hover-scale` CSS
    // vars, each on its OWN nested layer/wrapper so neither fights tilt's
    // transform or floating's animation (same nesting principle FASE 1
    // used to fix that exact coupling — see CardLayers.tsx). hoverScale's
    // presence (not a separate boolean) is what enables it, matching the
    // rest of this codebase's "absence = off" contract; 1 is a no-op too.
    hoverGlow?: boolean;
    hoverScale?: number; // target scale on hover, e.g. 1.05 — absent/1 = off
  };
  animations?: {
    floating?: boolean;
    floatHeight?: number;
    floatSpeed?: number;
  };
  // Stage "Product closeout": analog/retro screen effects, each fully
  // independent (own toggle, own layer in CardLayers.tsx, own opacity/
  // intensity) — CSS/SVG-data-URI only, no canvas, no heavy libraries. The
  // noise texture reuses the exact SVG feTurbulence technique already used
  // elsewhere in this codebase (GuestbookWidget.tsx/MobilePublicCanvas.tsx's
  // static grain overlay) — same approach, now parametrized and toggleable.
  retro?: {
    scanlines?: { enabled: boolean; intensity?: number };        // 0-1
    noise?:     { enabled: boolean; intensity?: number };        // 0-1 (VHS/analog grain)
    flicker?:   { enabled: boolean; intensity?: number; speed?: number };
    chromaticAberration?: { enabled: boolean; intensity?: number }; // 0-1, subtle RGB offset
  };
  opacity?: number;
  padding?: number;
  // Block 1 ("apagar no borra"): editor-only stash of effects the user
  // toggled OFF, kept at the same path they had in the active tree so
  // toggling back ON restores the exact previous config. No renderer reads
  // this (it rides along harmlessly through getProfileCardEffects()'s
  // `...card.effects` spread) — see effectPause.ts for the helpers and the
  // never-in-both invariant.
  paused?: Omit<CardEffects, "paused">;
};

// ── Space-level identity settings ────────────────────────────────────────────

export type SpaceMusic = {
  url:   string;   // Supabase public URL for MP3
  name?: string;   // display filename
};

export type SpaceCursor = {
  url: string;     // Supabase public URL for PNG cursor
};

export type SpaceFont = {
  name:   string;
  url:    string;
  format: "woff2" | "woff" | "ttf" | "otf";
};

// ── Shared-widget overlay (MY LAND: Desktop/Mobile unification) ─────────────
//
// "space" stays the source of truth for shared-widget content
// (profiles/guestbooks/socialCards/musicCards/linksCards/statsCards/galleries).
// "space_mobile" stores only an overlay on top of that content: which shared
// widgets are hidden in that view, and per-view placement overrides.

export type SharedWidgetKind =
  | "profile" | "guestbook" | "social" | "music" | "links" | "stats" | "gallery";

export type Placement = {
  x:        number;
  y:        number;
  w:        number;
  h:        number;
  zIndex:   number;
  layer:    0 | 1 | 2;
  depth:    number;
  rotation: number;
  locked?:        boolean;
  stackId?:       string;
  isStackAnchor?: boolean;
};

export const PLACEMENT_FIELDS = [
  "x", "y", "w", "h", "zIndex", "layer", "depth", "rotation",
  "locked", "stackId", "isStackAnchor",
] as const satisfies readonly (keyof Placement)[];

// ids of shared widgets hidden in a given view, keyed by widget kind
export type HiddenMap = Partial<Record<SharedWidgetKind, string[]>>;

// per-view placement overrides for shared widgets, keyed by widget kind then id
export type PlacementMap = Partial<Record<SharedWidgetKind, Record<string, Placement>>>;

// ── Canvas state ─────────────────────────────────────────────────────────────

export type CanvasState = {
  cards:        CanvasCard[];
  images:       CanvasImage[];
  texts:        CanvasText[];
  galleries:    CanvasGallery[];
  profiles:     ProfileCardData[];
  medias:       CanvasMedia[];
  guestbooks:   GuestbookCardData[];
  socialCards:  SocialCardData[];
  musicCards:   MusicCardData[];
  linksCards:   LinksCardData[];
  statsCards:   StatsCardData[];
  bgColor:      string;
  wallpaper:    string;
  wallpaperBlur?:       number;
  wallpaperBrightness?: number;
  wallpaperVignette?:   number;
  spaceMusic?:  SpaceMusic;
  spaceFont?:   SpaceFont;
  spaceCursor?: SpaceCursor;
  // Shared-widget overlay (see above). Optional/additive — absent on existing rows.
  hidden?:      HiddenMap;
  placements?:  PlacementMap;
};

export type ElementType =
  | "card" | "image" | "text" | "gallery"
  | "profile" | "media" | "guestbook"
  | "social" | "music" | "links" | "stats";

export type CanvasElement =
  | (CanvasCard          & { elementType: "card" })
  | (CanvasImage         & { elementType: "image" })
  | (CanvasText          & { elementType: "text" })
  | (CanvasGallery       & { elementType: "gallery" })
  | (ProfileCardData     & { elementType: "profile" })
  | (CanvasMedia         & { elementType: "media" })
  | (GuestbookCardData   & { elementType: "guestbook" })
  | (SocialCardData      & { elementType: "social" })
  | (MusicCardData       & { elementType: "music" })
  | (LinksCardData       & { elementType: "links" })
  | (StatsCardData       & { elementType: "stats" });

export type PublishState = "idle" | "pending" | "publishing" | "success";

export type PresenceState = "ACTIVE NOW" | "EDITING SPACE" | "AWAY" | "OFFLINE";
