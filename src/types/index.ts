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

export type TextFont =
  | "DM Sans"
  | "Space Mono"
  | "Impact"
  | "Playfair Display"
  | "Bebas Neue"
  | "Syne";

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
  // Typography
  font?:           TextFont;
  nameFont?:       TextFont;
  nameFontSize?:   number;
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
  // State
  locked?:         boolean;
  isPublic?:       boolean;
  // Stack
  stackId?:        string;
  isStackAnchor?:  boolean;
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
  font?:         TextFont;
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
  font?:         TextFont;
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
  bgColor:      string;
  wallpaper:    string;
  wallpaperBlur?:       number;
  wallpaperBrightness?: number;
  wallpaperVignette?:   number;
};

export type ElementType =
  | "card" | "image" | "text" | "gallery"
  | "profile" | "media" | "guestbook"
  | "social" | "music" | "links";

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
  | (LinksCardData       & { elementType: "links" });

export type PublishState = "idle" | "pending" | "publishing" | "success";

export type PresenceState = "ACTIVE NOW" | "EDITING SPACE" | "AWAY" | "OFFLINE";
