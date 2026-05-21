export type CanvasMode = 'home' | 'space';

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

export type ProfileLink = { id: string; url: string; label: string };

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

export type ProfileCardData = {
  id:             string;
  userId?:        string;   // owner's auth.users.id — used to wire social hooks
  x:              number;
  y:              number;
  w:              number;
  h:              number;
  zIndex:         number;
  layer:          0 | 1 | 2;
  depth:          number;
  rotation:       number;
  photo:          string;
  name:           string;
  status:         string;
  handle:         string;
  photoX:         number;
  photoY:         number;
  textX:          number;
  textY:          number;
  photoSize:      PhotoSize;
  font?:          TextFont;
  nameFont?:      TextFont;
  nameFontSize?:  number;
  statusFont?:    TextFont;
  statusFontSize?: number;
  textColor?:     string;
  bgColor:        string;
  bgImage:        string;
  bgMode?:        "cover" | "repeat";
  borderRadius:   number;
  opacity:        number;
  locked?:        boolean;
  isPublic?:      boolean;
  statsX?:        number;
  statsY?:        number;
  actionsX?:      number;
  actionsY?:      number;
  photoScale?:    number;
  textScale?:     number;
  statsScale?:    number;
  actionsScale?:  number;
  followX?:       number;
  followY?:       number;
  messageX?:      number;
  messageY?:      number;
  favoriteX?:     number;
  favoriteY?:     number;
  followScale?:   number;
  messageScale?:  number;
  favoriteScale?: number;
  bio?:           string;
  links?:         ProfileLink[];
  mood?:          string;
  musicUrl?:      string;
};

export type SignalTheme = "void" | "graphite" | "terminal" | "chrome" | "signal" | "notebook" | "static";

export type PostItItem = {
  id:        string;
  text:      string;
  photo:     string;
  createdAt: number;
  // legacy layout fields — kept for backward compat, unused in new vertical feed
  x?:        number;
  y?:        number;
  rotation?: number;
  color?:    string;
  w?:        number;
};

export type PostStyleKey    = "compact" | "minimal" | "tumblr" | "terminal" | "diary" | "media-heavy";
export type CardStyleKey    = "solid" | "glass" | "gradient" | "noise" | "transparent" | "image";
export type ImageDisplayMode = "natural" | "cover" | "contain";

export type PostItBoard = {
  id:                 string;
  x:                  number;
  y:                  number;
  w:                  number;
  h:                  number;
  zIndex:             number;
  layer:              0 | 1 | 2;
  depth:              number;
  rotation:           number;
  posts:              PostItItem[];
  locked?:            boolean;
  isPublic?:          boolean;
  // Signal Card Studio — all optional, backward-compatible
  theme?:             SignalTheme;
  signalFont?:        "mono" | "sans";
  postStyle?:         PostStyleKey;
  imageDisplayMode?:  ImageDisplayMode;
  cardStyle?:         CardStyleKey;
  bgImageUrl?:        string;
  bgOpacity?:         number;
  blurStrength?:      number;
  cardBorderRadius?:  number;
  borderIntensity?:   number;
  shadowIntensity?:   number;
  paddingDensity?:    "compact" | "normal" | "spacious";
  accentColor?:       string;
  textColor?:         string;
  glowEnabled?:       boolean;
  titleLabel?:        string;
  fontSize?:          number;
  lineSpacing?:       number;
};

export type CanvasState = {
  cards:         CanvasCard[];
  images:        CanvasImage[];
  texts:         CanvasText[];
  galleries:     CanvasGallery[];
  profiles:      ProfileCardData[];
  postItBoards:  PostItBoard[];
  medias:        CanvasMedia[];
  bgColor:       string;
  wallpaper:     string;
};

export type ElementType = "card" | "image" | "text" | "gallery" | "profile" | "postit" | "media";

export type CanvasElement =
  | (CanvasCard        & { elementType: "card" })
  | (CanvasImage       & { elementType: "image" })
  | (CanvasText        & { elementType: "text" })
  | (CanvasGallery     & { elementType: "gallery" })
  | (ProfileCardData   & { elementType: "profile" })
  | (PostItBoard       & { elementType: "postit" })
  | (CanvasMedia       & { elementType: "media" });

export type PublishState = "idle" | "pending" | "publishing" | "success";

export type PresenceState = "ACTIVE NOW" | "EDITING SPACE" | "AWAY" | "OFFLINE";
