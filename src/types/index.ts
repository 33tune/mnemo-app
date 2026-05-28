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
  isLocal?: boolean;
  pinCount?: number;
  storage_path?: string;
  linkUrl?: string;
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

export type ProfileLink = { id: string; url: string; label: string; icon?: string };

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
  linksX?:        number;
  linksY?:        number;
  linksScale?:    number;
  bio?:           string;
  links?:         ProfileLink[];
  mood?:          string;
  musicUrl?:      string;
};


export type CanvasState = {
  cards:      CanvasCard[];
  images:     CanvasImage[];
  texts:      CanvasText[];
  galleries:  CanvasGallery[];
  profiles:   ProfileCardData[];
  medias:     CanvasMedia[];
  bgColor:    string;
  wallpaper:  string;
};

export type ElementType = "card" | "image" | "text" | "gallery" | "profile" | "media";

export type CanvasElement =
  | (CanvasCard      & { elementType: "card" })
  | (CanvasImage     & { elementType: "image" })
  | (CanvasText      & { elementType: "text" })
  | (CanvasGallery   & { elementType: "gallery" })
  | (ProfileCardData & { elementType: "profile" })
  | (CanvasMedia     & { elementType: "media" });

export type PublishState = "idle" | "pending" | "publishing" | "success";

export type PresenceState = "ACTIVE NOW" | "EDITING SPACE" | "AWAY" | "OFFLINE";
