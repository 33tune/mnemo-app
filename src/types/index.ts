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

export type ProfileLink = {
  id:    string;
  url:   string;
  label: string;
  icon?: string;
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
  // Identity
  photo:           string;
  name:            string;
  handle:          string;
  status:          string;
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
