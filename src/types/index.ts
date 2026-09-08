export type CanvasMode = 'home' | 'space' | 'space_mobile';

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
  musicUrl?:     string;
  mood?:         string;
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
  };
  shadow?: {
    color?: string;
    intensity?: number; // 0–1
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
    hoverGlow?: boolean;
    hoverScale?: number;
  };
  animations?: {
    floating?: boolean;
    floatHeight?: number;
    floatSpeed?: number;
  };
  opacity?: number;
  padding?: number;
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
