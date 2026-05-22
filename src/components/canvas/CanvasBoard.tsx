"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CanvasImage as CanvasImageType, CanvasCard, CanvasText, CanvasGallery, ProfileCardData, PostItBoard, CanvasMedia, CanvasGuestbook, TextFont, CanvasState, CanvasMode, CanvasElement, PublishState } from "@/types";
import GuestbookWidget from "./GuestbookWidget";
import MediaCardWidget from "./MediaCardWidget";
import { SocialDock } from "./SocialDock";
import Topbar from "./Topbar";
import CardMenu from "./CardMenu";
import GalleryWidget from "./GalleryWidget";
import ProfileCard from "./ProfileCard";
import PostItBoardWidget from "./PostItBoardWidget";
import { renderContent, textColor, isLight } from "./CardContent";
import { useParallax } from "@/hooks/useParallax";
import { useDragDrop } from "@/hooks/useDragDrop";
import { uploadToStorage } from "@/lib/storage";
import { queueOrphanedAssets } from "@/lib/storage/queueOrphanedAssets";
import { bgImageStyle, detectBgMode } from "@/lib/bgStyle";
import { useChatWindows } from "@/hooks/useChatWindows";
import { openOrCreateChat } from "@/lib/chat/openOrCreateChat";
import ChatsWorkspace from "@/components/chats/ChatsWorkspace";
import SocialPanelWindow from "@/components/social/SocialPanelWindow";
import SocialView from "@/components/social/SocialView";
import type { SocialPanelState } from "@/components/social/SocialPanelWindow";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import { useNotifications } from "@/hooks/useNotifications";
import { WidgetBoundary } from "@/components/error/WidgetBoundary";
import { trackRender } from "@/lib/perfDebug";
import { useOnboarding } from "@/hooks/useOnboarding";
import OnboardingOverlay from "@/components/onboarding/OnboardingOverlay";
import { useIsMobile } from "@/hooks/useIsMobile";
import { analytics } from "@/lib/analytics";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const LAYER_NAMES = ["Back", "Mid", "Front"] as const;

const CANVAS_H = 3000;

const TEXT_FONTS: { key: TextFont; label: string; style: string }[] = [
  { key: "DM Sans",          label: "DM Sans",    style: "'DM Sans', sans-serif" },
  { key: "Space Mono",       label: "Space Mono", style: "'Space Mono', monospace" },
  { key: "Impact",           label: "Impact",     style: "Impact, sans-serif" },
  { key: "Playfair Display", label: "Playfair",   style: "'Playfair Display', serif" },
  { key: "Bebas Neue",       label: "Bebas Neue", style: "'Bebas Neue', sans-serif" },
  { key: "Syne",             label: "Syne",       style: "'Syne', sans-serif" },
];

function getFontStyle(font: TextFont): string {
  return TEXT_FONTS.find(f => f.key === font)?.style ?? "'DM Sans', sans-serif";
}

async function blobToBase64(url: string): Promise<string> {
  if (!url || !url.startsWith("blob:")) return url ?? "";
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror   = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return ""; }
}

function adaptivePad(br: number): number {
  return Math.max(14, Math.min(br * 0.75, 32));
}

type DrawingRect   = { startX:number; startY:number; currentX:number; currentY:number } | null;
type SelectionRect = { startX:number; startY:number; currentX:number; currentY:number } | null;

type CanvasOp =
  | { type: "add_card";       card: CanvasCard }
  | { type: "update_card";    id: string; patch: Partial<CanvasCard> }
  | { type: "delete_card";    id: string }
  | { type: "add_image";      image: CanvasImageType }
  | { type: "update_image";   id: string; patch: Partial<CanvasImageType> }
  | { type: "delete_image";   id: string }
  | { type: "add_text";       text: CanvasText }
  | { type: "update_text";    id: string; patch: Partial<CanvasText> }
  | { type: "delete_text";    id: string }
  | { type: "add_gallery";    gallery: CanvasGallery }
  | { type: "update_gallery"; id: string; patch: Partial<CanvasGallery> }
  | { type: "delete_gallery"; id: string }
  | { type: "add_profile";    profile: ProfileCardData }
  | { type: "update_profile"; id: string; patch: Partial<ProfileCardData> }
  | { type: "delete_profile"; id: string }
  | { type: "add_postit";     board: PostItBoard }
  | { type: "update_postit";  id: string; patch: Partial<PostItBoard> }
  | { type: "delete_postit";  id: string }
  | { type: "add_media";       media:      CanvasMedia }
  | { type: "update_media";    id: string; patch: Partial<CanvasMedia> }
  | { type: "delete_media";    id: string }
  | { type: "add_guestbook";   guestbook:  CanvasGuestbook }
  | { type: "update_guestbook";id: string; patch: Partial<CanvasGuestbook> }
  | { type: "delete_guestbook";id: string }
  | { type: "set_bg";          value: string }
  | { type: "set_wallpaper";   value: string }
  | { type: "move_elements";   moves: Array<{ id: string; elementType: string; x: number; y: number }> };

type QueuedOp = { op: CanvasOp; canvas_type: CanvasMode };

// Pure reducer for op replay — does not touch React state.
function reduceOp(els: CanvasElement[], op: CanvasOp): CanvasElement[] {
  switch (op.type) {
    case "add_card":       return [...els, { ...op.card,    elementType: "card"    as const }];
    case "update_card":    return els.map(e => e.elementType==="card"    && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_card":    return els.filter(e => !(e.elementType==="card"    && e.id===op.id));
    case "add_image":      return [...els, { ...op.image,   elementType: "image"   as const }];
    case "update_image":   return els.map(e => e.elementType==="image"   && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_image":   return els.filter(e => !(e.elementType==="image"   && e.id===op.id));
    case "add_text":       return [...els, { ...op.text,    elementType: "text"    as const }];
    case "update_text":    return els.map(e => e.elementType==="text"    && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_text":    return els.filter(e => !(e.elementType==="text"    && e.id===op.id));
    case "add_gallery":    return [...els, { ...op.gallery, elementType: "gallery" as const }];
    case "update_gallery": return els.map(e => e.elementType==="gallery" && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_gallery": return els.filter(e => !(e.elementType==="gallery" && e.id===op.id));
    case "add_profile":    return [...els, { ...op.profile, elementType: "profile" as const }];
    case "update_profile": return els.map(e => e.elementType==="profile" && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_profile": return els.filter(e => !(e.elementType==="profile" && e.id===op.id));
    case "add_postit":     return [...els, { ...op.board,   elementType: "postit"  as const }];
    case "update_postit":  return els.map(e => e.elementType==="postit"  && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_postit":  return els.filter(e => !(e.elementType==="postit"  && e.id===op.id));
    case "add_media":       return [...els, { ...op.media,      elementType: "media"     as const }];
    case "update_media":    return els.map(e => e.elementType==="media"     && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_media":    return els.filter(e => !(e.elementType==="media"     && e.id===op.id));
    case "add_guestbook":   return [...els, { ...op.guestbook, elementType: "guestbook" as const }];
    case "update_guestbook":return els.map(e => e.elementType==="guestbook" && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_guestbook":return els.filter(e => !(e.elementType==="guestbook" && e.id===op.id));
    case "move_elements":   return els.map(e => { const m = op.moves.find(m => m.id===e.id); return m ? { ...e, x: m.x, y: m.y } as CanvasElement : e; });
    default:                return els;
  }
}

export default function CanvasBoard({
  userHandle = "",
  canEdit = true,
  viewerLoggedIn = false,
  initialState,
  ownerUserId,
}: {
  userHandle?: string;
  canEdit?: boolean;
  viewerLoggedIn?: boolean;
  initialState?: CanvasState;
  ownerUserId?: string;
}) {
  const [wallpaper,        setWallpaper]        = useState("");
  const [wallpaperLoaded,  setWallpaperLoaded]  = useState(true);
  const [bgColor,          setBgColor]          = useState("#0a0a0c");
  const [hovLayerKey,      setHovLayerKey]      = useState<string|null>(null);
  const [view,             setView]             = useState<"canvas" | "browse" | "chats">("canvas");
  const [totalUnread,      setTotalUnread]      = useState(0);
  const [homeBg,           setHomeBg]           = useState<{ color: string; wallpaper: string; wallpaperLoaded: boolean }>({ color: "#0a0a0c", wallpaper: "", wallpaperLoaded: false });
  const [currentUserId,    setCurrentUserId]    = useState<string | undefined>(undefined);
  const [authResolved,     setAuthResolved]     = useState(false);
  const [socialPanels,     setSocialPanels]     = useState<SocialPanelState[]>([]);
  const socialZRef = useRef(5000);
  const [showSignals,      setShowSignals]      = useState(false);
  const [elements,      setElements]      = useState<CanvasElement[]>([]);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [creatingCard,  setCreatingCard]  = useState(false);
  const [addingText,    setAddingText]    = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [drawingRect,   setDrawingRect]   = useState<DrawingRect>(null);
  const [selRect,       setSelRect]       = useState<SelectionRect>(null);
  const [cardMenuId,    setCardMenuId]    = useState<string | null>(null);
  const [cardMenuRect,  setCardMenuRect]  = useState<DOMRect | null>(null);
  const [cardMenuTab,   setCardMenuTab]   = useState<"type"|"style"|"layer">("type");
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [wallpaperMenuOpen, setWallpaperMenuOpen] = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [publishState,  setPublishState]  = useState<PublishState>("idle");
  const [canvasMode,    setCanvasMode]    = useState<CanvasMode>("home");

  const cards        = useMemo(() => elements.filter(e => e.elementType === "card")        as (CanvasCard        & { elementType: "card" })[], [elements]);
  const images       = useMemo(() => elements.filter(e => e.elementType === "image")       as (CanvasImageType   & { elementType: "image" })[], [elements]);
  const texts        = useMemo(() => elements.filter(e => e.elementType === "text")        as (CanvasText        & { elementType: "text" })[], [elements]);
  const galleries    = useMemo(() => elements.filter(e => e.elementType === "gallery")     as (CanvasGallery     & { elementType: "gallery" })[], [elements]);
  const profiles     = useMemo(() => elements.filter(e => e.elementType === "profile")     as (ProfileCardData   & { elementType: "profile" })[], [elements]);
  const postItBoards = useMemo(() => elements.filter(e => e.elementType === "postit")      as (PostItBoard       & { elementType: "postit" })[], [elements]);
  const medias       = useMemo(() => elements.filter(e => e.elementType === "media")       as (CanvasMedia       & { elementType: "media" })[], [elements]);
  const guestbooks   = useMemo(() => elements.filter(e => e.elementType === "guestbook")  as (CanvasGuestbook   & { elementType: "guestbook" })[], [elements]);

  const trashRef          = useRef<HTMLDivElement>(null);
  const canvasWrapperRef  = useRef<HTMLDivElement>(null);
  const cardDivRefs    = useRef<Record<string, HTMLDivElement | null>>({});
  const bgImageRef     = useRef<HTMLInputElement>(null);
  const bgCardId       = useRef<string | null>(null);
  const wallpaperRef   = useRef<HTMLInputElement>(null);
  const imageRef       = useRef<HTMLInputElement>(null);
  const zCounter       = useRef(10);
  const textElRefs     = useRef<Record<string, HTMLDivElement | null>>({});
  const selChangedRef  = useRef(false);
  const canvasIdRef       = useRef<string | null>(null);
  const savingRef         = useRef(false);
  const lastSavedStateRef = useRef<CanvasState | null>(null);
  // ── Mode switching ───────────────────────────────────────────────────────────
  const canvasModeRef  = useRef<CanvasMode>("home");
  const canvasIds      = useRef<Record<CanvasMode, string | null>>({ home: null, space: null });
  const modeStates     = useRef<Record<CanvasMode, CanvasState | null>>({ home: null, space: null });
  // ── Ops queue ────────────────────────────────────────────────────────────────
  const hasLoadedRef       = useRef(false);
  const sessionIdRef       = useRef(0);
  const userInteractedRef  = useRef(false);
  const opsQueueRef  = useRef<QueuedOp[]>([]);
  const flushingRef  = useRef(false);
  const clientIdRef       = useRef(crypto.randomUUID());
  const logicalW          = useRef(typeof window !== "undefined" ? window.screen.width : 1920);
  const firstEditRef      = useRef(false); // fires analytics.canvasEdit once per session

  const isMobile     = useIsMobile();
  const isReadOnly   = !canEdit;
  // Block pointer interactions on touch-only devices — drag/resize/rotate require mouse
  const canInteract  = canEdit && !isMobile;

  // Performance debug — enable in browser: window.__MNEMO_DEBUG_PERF = true
  const _perfRenderCount = useRef(0);
  _perfRenderCount.current++;
  if (process.env.NODE_ENV !== "production") {
    trackRender("CanvasBoard", { elements: elements.length, selectedIds: selectedIds.size });
  }

  function toCanvasCoords(clientX: number, clientY: number) {
    const rect = canvasWrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: clientX - rect.left,
      y: clientY - rect.top + (canvasWrapperRef.current?.parentElement?.scrollTop ?? 0),
    };
  }

  function viewCenter() {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  function clampToViewport(x: number, y: number, w: number, _h: number) {
    return {
      x: Math.max(0, Math.min(logicalW.current - w, x)),
      y: Math.max(44, y), // no upper clamp — canvas scrolls vertically
    };
  }

  const router = useRouter();

  const { handleMouseMoveParallax, getParallaxStyle } = useParallax();
  const {
    dragging, resizing, rotating, overTrash, didDrag,
    startDrag, startGroupResize, startSingleResize, startRotate,
    handleDragMove, handleDragUp,
  } = useDragDrop({
    elements, setElements,
    trashRef,
    canvasBounds: { w: logicalW.current, h: CANVAS_H, topOffset: 44 },
  });

  // ── Auth — fetch once on mount so MESSAGE handler and chat hooks have userId ──
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? undefined);
      setAuthResolved(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── URL-driven view init — restore view/mode from ?view= param after auth ────
  const urlViewInitRef = useRef(false);
  useEffect(() => {
    if (!authResolved || urlViewInitRef.current) return;
    urlViewInitRef.current = true;
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "space") handleModeChange("space");
    else if (v === "chats") setView("chats");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authResolved]);

  // Mirror currentUserId into a ref so markActive never captures stale state.
  const currentUserIdRef     = useRef<string | undefined>(undefined);
  const lastActivityWriteRef = useRef(0);
  const lastProfileWriteRef  = useRef(0);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const { notifications, loading: notifsLoading, unreadCount, markAllRead } = useNotifications(currentUserId);

  const {
    windows: chatWindows, openWindow, closeWindow, minimizeWindow, focusWindow, updateWindow,
  } = useChatWindows(currentUserId);

  const { showOnboarding, dismissOnboarding } = useOnboarding(canEdit, authResolved);

  // ── Elementos visibles (en space, solo isPublic:true) ────────────────────────
  const inSpace      = canvasMode === "space";
  const visCards     = useMemo(() => inSpace ? cards.filter(c => c.isPublic)              : cards,        [inSpace, cards]);
  const visImages    = useMemo(() => (inSpace ? images.filter(i => i.isPublic) : images).filter(img => img.src && (img.src.startsWith("http") || img.src.startsWith("blob:"))), [inSpace, images]);
  const visTexts     = useMemo(() => inSpace ? texts.filter(t => t.isPublic)              : texts,        [inSpace, texts]);
  const visGalleries = useMemo(() => inSpace ? galleries.filter(g => g.isPublic)          : galleries,    [inSpace, galleries]);
  const visProfiles  = useMemo(() => inSpace ? profiles.filter(p => p.isPublic)           : profiles,     [inSpace, profiles]);
  const visBoards    = useMemo(() => inSpace ? postItBoards.filter(b => b.isPublic)       : postItBoards, [inSpace, postItBoards]);
  const visMedias      = useMemo(() => inSpace ? medias.filter(m => m.isPublic)           : medias,       [inSpace, medias]);
  const visGuestbooks  = useMemo(() => inSpace ? guestbooks.filter(g => g.isPublic)      : guestbooks,   [inSpace, guestbooks]);

  // ── Persistencia ─────────────────────────────────────────────────────────────

  function loadWallpaper(src: string) {
    if (!src) {
      setWallpaper("");
      setWallpaperLoaded(true);
      return;
    }
    setWallpaperLoaded(false);
    const expected = src;
    const img = new Image();
    img.onload = () => {
      if (expected !== src) return;
      setWallpaper(src);
      setWallpaperLoaded(true);
    };
    img.onerror = () => {
      setWallpaper("");
      setWallpaperLoaded(true);
    };
    img.src = src;
  }

  // buildSaveState: pure — converts blob URLs to base64 for a given elements snapshot.
  // Always pass an explicit snapshot; never reads from live state.
  async function buildSaveState(snapshot: CanvasElement[]): Promise<CanvasState> {
    const safe = (url: string) => blobToBase64(url);
    const sCards     = snapshot.filter(e => e.elementType === "card")    as (CanvasCard        & { elementType: "card" })[];
    const sImages    = snapshot.filter(e => e.elementType === "image")   as (CanvasImageType   & { elementType: "image" })[];
    const sTexts     = snapshot.filter(e => e.elementType === "text")    as (CanvasText        & { elementType: "text" })[];
    const sGalleries = snapshot.filter(e => e.elementType === "gallery") as (CanvasGallery     & { elementType: "gallery" })[];
    const sProfiles  = snapshot.filter(e => e.elementType === "profile") as (ProfileCardData   & { elementType: "profile" })[];
    const sBoards    = snapshot.filter(e => e.elementType === "postit")  as (PostItBoard       & { elementType: "postit" })[];
    const sMedias      = snapshot.filter(e => e.elementType === "media")     as (CanvasMedia     & { elementType: "media" })[];
    const sGuestbooks  = snapshot.filter(e => e.elementType === "guestbook") as (CanvasGuestbook & { elementType: "guestbook" })[];
    return {
      cards:        await Promise.all(sCards.map(async c => ({ ...c, bgImage: await safe(c.bgImage) }))),
      images:       await Promise.all(sImages.map(async i => ({ ...i, src: await safe(i.src) }))),
      texts:        sTexts,
      galleries:    await Promise.all(sGalleries.map(async g => ({ ...g, images: await Promise.all(g.images.map(async gi => ({ ...gi, src: await safe(gi.src) }))) }))),
      profiles:     await Promise.all(sProfiles.map(async p => ({ ...p, photo: await safe(p.photo), bgImage: await safe(p.bgImage) }))),
      postItBoards: await Promise.all(sBoards.map(async b => ({ ...b, posts: await Promise.all(b.posts.map(async p => ({ ...p, photo: await safe(p.photo) }))) }))),
      medias:       sMedias,
      guestbooks:   sGuestbooks,
      bgColor,
      wallpaper: await safe(wallpaper),
    };
  }

  function applyOp(op: CanvasOp) {
    switch (op.type) {
      case "add_card":
        setElements(p => p.some(e => e.id === op.card.id) ? p : [...p, { ...op.card, elementType: "card" as const }]); break;
      case "update_card":
        setElements(p => p.map(e => e.elementType === "card" && e.id === op.id ? { ...e, ...op.patch } : e)); break;
      case "delete_card":
        setElements(p => p.filter(e => !(e.elementType === "card" && e.id === op.id))); break;

      case "add_image":
        setElements(p => p.some(e => e.id === op.image.id) ? p : [...p, { ...op.image, elementType: "image" as const }]); break;
      case "update_image":
        setElements(p => p.map(e => e.elementType === "image" && e.id === op.id ? { ...e, ...op.patch } : e)); break;
      case "delete_image":
        setElements(p => p.filter(e => !(e.elementType === "image" && e.id === op.id))); break;

      case "add_text":
        setElements(p => p.some(e => e.id === op.text.id) ? p : [...p, { ...op.text, elementType: "text" as const }]); break;
      case "update_text":
        setElements(p => p.map(e => e.elementType === "text" && e.id === op.id ? { ...e, ...op.patch } : e)); break;
      case "delete_text":
        setElements(p => p.filter(e => !(e.elementType === "text" && e.id === op.id))); break;

      case "add_gallery":
        setElements(p => p.some(e => e.id === op.gallery.id) ? p : [...p, { ...op.gallery, elementType: "gallery" as const }]); break;
      case "update_gallery":
        setElements(p => p.map(e => e.elementType === "gallery" && e.id === op.id ? { ...e, ...op.patch } : e)); break;
      case "delete_gallery":
        setElements(p => p.filter(e => !(e.elementType === "gallery" && e.id === op.id))); break;

      case "add_profile":
        setElements(p => p.some(e => e.id === op.profile.id) ? p : [...p, { ...op.profile, elementType: "profile" as const }]); break;
      case "update_profile":
        setElements(p => p.map(e => e.elementType === "profile" && e.id === op.id ? { ...e, ...op.patch } : e)); break;
      case "delete_profile":
        setElements(p => p.filter(e => !(e.elementType === "profile" && e.id === op.id))); break;

      case "add_postit":
        setElements(p => p.some(e => e.id === op.board.id) ? p : [...p, { ...op.board, elementType: "postit" as const }]); break;
      case "update_postit":
        setElements(p => p.map(e => e.elementType === "postit" && e.id === op.id ? { ...e, ...op.patch } : e)); break;
      case "delete_postit":
        setElements(p => p.filter(e => !(e.elementType === "postit" && e.id === op.id))); break;

      case "add_media":
        setElements(p => p.some(e => e.id === op.media.id) ? p : [...p, { ...op.media, elementType: "media" as const }]); break;
      case "update_media":
        setElements(p => p.map(e => e.elementType === "media" && e.id === op.id ? { ...e, ...op.patch } : e)); break;
      case "delete_media":
        setElements(p => p.filter(e => !(e.elementType === "media" && e.id === op.id))); break;

      case "add_guestbook":
        setElements(p => p.some(e => e.id === op.guestbook.id) ? p : [...p, { ...op.guestbook, elementType: "guestbook" as const }]); break;
      case "update_guestbook":
        setElements(p => p.map(e => e.elementType === "guestbook" && e.id === op.id ? { ...e, ...op.patch } : e)); break;
      case "delete_guestbook":
        setElements(p => p.filter(e => !(e.elementType === "guestbook" && e.id === op.id))); break;

      case "set_bg":
        setBgColor(op.value);
        if (canvasModeRef.current === "home") setHomeBg(h => ({ ...h, color: op.value }));
        break;
      case "set_wallpaper":
        setWallpaper(op.value); setWallpaperLoaded(true);
        if (canvasModeRef.current === "home") setHomeBg(h => ({ ...h, wallpaper: op.value, wallpaperLoaded: true }));
        break;
      case "move_elements":
        setElements(p => p.map(e => {
          const m = op.moves.find(m => m.id === e.id);
          return m ? { ...e, x: m.x, y: m.y } as CanvasElement : e;
        }));
        break;
    }
  }

  function openSocialPanel(uid: string, handle: string, mode: "followers" | "following") {
    const existing = socialPanels.find(p => p.targetUserId === uid && p.mode === mode);
    if (existing) {
      socialZRef.current += 1;
      setSocialPanels(prev => prev.map(p => p.id === existing.id ? { ...p, z: socialZRef.current } : p));
      return;
    }
    socialZRef.current += 1;
    setSocialPanels(prev => [...prev, {
      id: crypto.randomUUID(),
      targetUserId: uid,
      targetHandle: handle,
      mode,
      x: 120 + Math.random() * 180,
      y: 80  + Math.random() * 100,
      z: socialZRef.current,
    }]);
  }

  function closeSocialPanel(id: string) {
    setSocialPanels(prev => prev.filter(p => p.id !== id));
  }

  function focusSocialPanel(id: string) {
    socialZRef.current += 1;
    const z = socialZRef.current;
    setSocialPanels(prev => prev.map(p => p.id === id ? { ...p, z } : p));
  }

  function moveSocialPanel(id: string, x: number, y: number) {
    setSocialPanels(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
  }

  function markActive(isProfileUpdate = false) {
    const uid = currentUserIdRef.current;
    if (!uid) return;
    const now = Date.now();
    const patch: Record<string, string> = {};

    if (now - lastActivityWriteRef.current > 30_000) {
      patch.last_active_at = new Date().toISOString();
      lastActivityWriteRef.current = now;
    }
    if (isProfileUpdate && now - lastProfileWriteRef.current > 30_000) {
      patch.last_profile_update_at = new Date().toISOString();
      lastProfileWriteRef.current = now;
    }
    if (Object.keys(patch).length === 0) return;

    createClient()
      .from("profiles")
      .update(patch)
      .eq("user_id", uid)
      .then();
  }

  function enqueueOp(op: CanvasOp) {
    if (!canEdit) return;
    userInteractedRef.current = true;
    if (!firstEditRef.current && currentUserId) {
      firstEditRef.current = true;
      analytics.canvasEdit(currentUserId, op.type);
    }
    applyOp(op);
    opsQueueRef.current.push({ op, canvas_type: canvasModeRef.current });
    if (canvasModeRef.current === "space") {
      setPublishState(s => (s === "publishing" ? s : "pending"));
    }
    markActive(op.type === "update_profile" || canvasModeRef.current === "space");

    // Activity feed — fire-and-forget for space mode ops
    if (canvasModeRef.current === "space") {
      const uid = currentUserIdRef.current;
      const actType =
        op.type === "add_image"      ? "new_image"     :
        op.type === "set_wallpaper"  ? "canvas_update" :
        op.type === "update_profile" ? "status_change" :
        op.type === "add_guestbook"  ? "new_guestbook" :
        null;
      if (actType && uid) {
        createClient().from("activity_feed").insert({ user_id: uid, activity_type: actType, metadata: {} }).then();
      }
    }

    flushOps();
  }

  async function flushOps() {
    if (flushingRef.current) return;
    if (!opsQueueRef.current.length) return;
    flushingRef.current = true;
    const batch = [...opsQueueRef.current];
    opsQueueRef.current = [];
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Re-enqueue: can't persist without auth
        opsQueueRef.current.unshift(...batch);
        return;
      }
      const rows = batch.map(({ op, canvas_type }) => ({
        user_id: user.id,
        canvas_type,
        op,
      }));
      const { error } = await supabase.from("canvas_ops").insert(rows);
      if (error) {
        console.error("[OPS INSERT ERROR]", error);
        opsQueueRef.current.unshift(...batch);
      } else {
        compactOps();
      }
    } catch (err) {
      console.error("[OPS FLUSH EXCEPTION]", err);
      opsQueueRef.current.unshift(...batch);
    } finally {
      flushingRef.current = false;
      if (opsQueueRef.current.length) flushOps();
    }
  }

  async function compactOps() {
    const mode    = canvasModeRef.current;
    const session = sessionIdRef.current;
    // Capture elements synchronously before any await so the snapshot is
    // consistent with the ops batch we're about to compact.
    const elementsAtCompact = elements;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || session !== sessionIdRef.current) return;
    const { count } = await supabase
      .from("canvas_ops")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("canvas_type", mode);
    if (!count || count < 50) return;
    const state = await buildSaveState(elementsAtCompact);
    if (session !== sessionIdRef.current) return;

    // Queue any assets that disappeared since the last save (non-blocking)
    const prevState = lastSavedStateRef.current;
    if (prevState) {
      queueOrphanedAssets(user.id, prevState, state).catch(e =>
        console.error("[storage-gc] queueOrphanedAssets failed:", e)
      );
    }
    lastSavedStateRef.current = state;

    const { error } = await supabase.from("canvases").upsert(
      { user_id: user.id, type: mode, data: state, updated_at: new Date().toISOString() },
      { onConflict: "user_id,type" }
    );
    if (error) { console.error("[COMPACT ERROR]", error); return; }
    await supabase.from("canvas_ops").delete()
      .eq("user_id", user.id)
      .eq("canvas_type", mode);
  }

  async function publishSpace() {
    if (publishState !== "pending" || !canvasIdRef.current) return;

    setPublishState("publishing");

    try {
      const supabase = createClient();

      const elementsSnapshot = structuredClone(elements)
        .filter(e => e.isPublic === true)
        .filter(e => {
          if (e.elementType === "image") {
            return e.src && e.src.startsWith("http");
          }
          return true;
        });
      const state = await buildSaveState(elementsSnapshot);

      const { error } = await supabase
        .from("canvases")
        .update({ data: state, updated_at: new Date().toISOString() })
        .eq("id", canvasIdRef.current);

      if (!error) {
        setPublishState("success");
        setTimeout(() => {
          setPublishState(s => (s === "success" ? "idle" : s));
        }, 1500);
      } else {
        setPublishState("pending");
      }
    } catch (e) {
      console.error("[PUBLISH ERROR]", e);
      setPublishState("pending");
    }
  }

  // Carga (inicial y al cambiar de modo) con flush no-bloqueante y session guard
  useEffect(() => {
    async function switchCanvas() {
      const prevMode = canvasModeRef.current;
      const wasLoaded = hasLoadedRef.current;

      sessionIdRef.current += 1;
      canvasModeRef.current = canvasMode;
      const sessionAtLoad = sessionIdRef.current;

      // Reset UI immediately
      setIsLoading(true);
      setElements([]);
      setBgColor("#0a0a0c");
      setWallpaper("");
      setWallpaperLoaded(false);
      hasLoadedRef.current = false;
      savingRef.current = false;
      lastSavedStateRef.current = null;
      userInteractedRef.current = false;
      opsQueueRef.current = [];
      canvasIdRef.current = null;

      // Read-only mode: load from initialState
      if (!canEdit) {
        if (initialState) {
          setElements([
            ...(initialState.cards        ?? []).map(c => ({ ...c, elementType: "card"    as const })),
            ...(initialState.images       ?? []).map(i => ({ ...i, elementType: "image"   as const })),
            ...(initialState.texts        ?? []).map(t => ({ ...t, elementType: "text"    as const })),
            ...(initialState.galleries    ?? []).map(g => ({ ...g, elementType: "gallery" as const })),
            ...(initialState.profiles     ?? []).map(p => ({ ...p, elementType: "profile" as const })),
            ...(initialState.postItBoards ?? []).map(b => ({ ...b, elementType: "postit"    as const })),
            ...(initialState.medias       ?? []).map(m => ({ ...m, elementType: "media"    as const })),
            ...(initialState.guestbooks   ?? []).map(g => ({ ...g, elementType: "guestbook" as const })),
          ]);
          if (initialState.bgColor)   setBgColor(initialState.bgColor);
          if (initialState.wallpaper) { setWallpaper(initialState.wallpaper); setWallpaperLoaded(true); }
        }
        hasLoadedRef.current = true;
        setIsLoading(false);
        return;
      }

      // Load from canvas_ops — single source of truth
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { hasLoadedRef.current = true; setIsLoading(false); return; }

      if (sessionAtLoad !== sessionIdRef.current) return;

      // Fetch snapshot + resolve canvas id atomically
      const { data: canvasRow } = await supabase
        .from("canvases")
        .select("id, data, updated_at")
        .eq("user_id", user.id)
        .eq("type", canvasModeRef.current)
        .maybeSingle();

      if (sessionAtLoad !== sessionIdRef.current) return;

      // Ensure canvas record exists so canvasIdRef is always non-null after load
      let canvasId = canvasRow?.id ?? null;
      if (!canvasId) {
        const { data: created } = await supabase
          .from("canvases")
          .upsert({ user_id: user.id, type: canvasModeRef.current, data: {} }, { onConflict: "user_id,type" })
          .select("id")
          .single();
        canvasId = created?.id ?? null;
      }
      canvasIdRef.current = canvasId;

      if (sessionAtLoad !== sessionIdRef.current) return;

      // Build initial elements from snapshot into a local variable (no setElements yet)
      let newElements: CanvasElement[] = [];
      if (canvasRow?.data) {
        const s = canvasRow.data as CanvasState;
        lastSavedStateRef.current = s; // baseline for GC diffing
        newElements = [
          ...(s.cards        ?? []).map(c => ({ ...c, elementType: "card"    as const })),
          ...(s.images       ?? []).map(i => ({ ...i, elementType: "image"   as const })),
          ...(s.texts        ?? []).map(t => ({ ...t, elementType: "text"    as const })),
          ...(s.galleries    ?? []).map(g => ({ ...g, elementType: "gallery" as const })),
          ...(s.profiles     ?? []).map(p => ({ ...p, elementType: "profile" as const })),
          ...(s.postItBoards ?? []).map(b => ({ ...b, elementType: "postit"    as const })),
          ...(s.medias       ?? []).map(m => ({ ...m, elementType: "media"    as const })),
          ...(s.guestbooks   ?? []).map(g => ({ ...g, elementType: "guestbook" as const })),
        ].filter(el => el.elementType !== "image" || (el.src && el.src !== ""));
        if (s.bgColor)   setBgColor(s.bgColor);
        if (s.wallpaper) { setWallpaper(s.wallpaper); setWallpaperLoaded(true); }
      }

      // Keep homeBg in sync — always reflects the HOME canvas background
      if (canvasModeRef.current === "home") {
        const s = (canvasRow?.data ?? {}) as Partial<CanvasState>;
        setHomeBg({
          color:           s.bgColor    || "#0a0a0c",
          wallpaper:       s.wallpaper  || "",
          wallpaperLoaded: !!(s.wallpaper),
        });
      }

      // Load only ops AFTER the snapshot (fast path when compaction ran)
      const { data: opsRows } = canvasRow?.updated_at
        ? await supabase
            .from("canvas_ops")
            .select("op")
            .eq("user_id", user.id)
            .eq("canvas_type", canvasModeRef.current)
            .gt("created_at", canvasRow.updated_at)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
        : await supabase
            .from("canvas_ops")
            .select("op")
            .eq("user_id", user.id)
            .eq("canvas_type", canvasModeRef.current)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true });

      if (sessionAtLoad !== sessionIdRef.current) {
        return;
      }

      if (userInteractedRef.current) {
        hasLoadedRef.current = true;
        setIsLoading(false);
        return;
      }

      // Fold ops into newElements — single full replacement at the end
      for (const row of opsRows ?? []) {
        const op = row.op as CanvasOp;
        if (op.type === "set_bg")             { setBgColor(op.value); }
        else if (op.type === "set_wallpaper") { setWallpaper(op.value); setWallpaperLoaded(true); }
        else                                  { newElements = reduceOp(newElements, op); }
      }

      // Sync zCounter to the highest zIndex among loaded elements.
      // Without this, zCounter starts at 10 but loaded elements may have zIndex 500+,
      // so newly added elements or "bring to front" would land below existing ones.
      const maxLoadedZ = newElements.reduce(
        (m, e) => Math.max(m, (e as { zIndex?: number }).zIndex ?? 0), 0
      );
      if (maxLoadedZ > zCounter.current) zCounter.current = maxLoadedZ;

      setElements(newElements);

      // Final deduplication — guarantees no duplicate IDs regardless of snapshot/op overlap
      setElements(prev => {
        const seen = new Set<string>();
        return prev.filter(e => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });
      });

      hasLoadedRef.current = true;
      setPublishState("idle");
      setIsLoading(false);
    }

    switchCanvas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasMode]);

  // beforeunload: flush remaining ops via sendBeacon
  useEffect(() => {
    function handler() {
      if (!canEdit) return;
      if (!opsQueueRef.current.length) return;
      navigator.sendBeacon(
        "/api/flush-ops",
        new Blob(
          [JSON.stringify(opsQueueRef.current.map(({ op, canvas_type }) => ({ canvas_type, op })))],
          { type: "application/json" }
        )
      );
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Cambio de modo — el useEffect([canvasMode]) maneja flush + reset + carga ──
  async function switchMode(newMode: CanvasMode) {
    if (newMode === canvasModeRef.current) return;

    const activeEl = document.activeElement as HTMLElement;
    if (activeEl && activeEl.contentEditable === "true") {
      activeEl.blur();
    }

    // Limpiar selección y menús
    setSelectedIds(new Set());
    setCardMenuId(null); setCardMenuRect(null);
    setEditingId(null);  setEditingTextId(null);
    setCreatingCard(false); setAddingText(false);

    // El useEffect([canvasMode]) se encarga del flush + reset + load
    setCanvasMode(newMode);
  }

  // Wrapper: exiting browse/chats mode when switching HOME/MY SPACE
  async function handleModeChange(newMode: CanvasMode) {
    setView("canvas");
    await switchMode(newMode);
  }

  // MESSAGE button handler — open or focus a 1-to-1 chat, switch to chats workspace
  async function handleMessage(targetHandle: string) {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    if (!targetHandle) return;
    try {
      const sb = createClient();
      const { data: targetProfile } = await sb
        .from("profiles")
        .select("user_id")
        .eq("handle", targetHandle)
        .maybeSingle();
      if (!targetProfile?.user_id) return;
      // Do not open a chat with yourself
      if (targetProfile.user_id === currentUserId) return;
      const chatId = await openOrCreateChat(currentUserId, targetProfile.user_id);
      console.log("OPEN CHAT CLICK", chatId);
      await openWindow(chatId);
      setView("chats");
    } catch (e) {
      console.error("[handleMessage]", e);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ─────────────────────────────────────────────────────────────────────────────

  // Devuelve todos los elementos que contienen el punto (x,y), ordenados por zIndex desc
  function getElementsAtPoint(x: number, y: number): { id: string; z: number }[] {
    const hits: { id: string; z: number }[] = [];
    const check = (el: { id: string; x: number; y: number; w: number; h: number; zIndex: number; layer: 0|1|2 }) => {
      if (x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h)
        hits.push({ id: el.id, z: el.zIndex + el.layer * 100 });
    };
    cards.forEach(check);
    images.forEach(check);
    galleries.forEach(check);
    profiles.forEach(check);
    postItBoards.forEach(check);
    guestbooks.forEach(check);
    hits.sort((a, b) => b.z - a.z);
    return hits;
  }

  function findElementById(id: string): { id: string; type: "image"|"card"|"text"|"gallery"|"profile"|"postit"|"guestbook"; x: number; y: number } | null {
    const img = images.find(i => i.id === id); if (img) return { id: img.id, type: "image", x: img.x, y: img.y };
    const card = cards.find(c => c.id === id); if (card) return { id: card.id, type: "card", x: card.x, y: card.y };
    const txt = texts.find(t => t.id === id); if (txt) return { id: txt.id, type: "text", x: txt.x, y: txt.y };
    const gal = galleries.find(g => g.id === id); if (gal) return { id: gal.id, type: "gallery", x: gal.x, y: gal.y };
    const prof = profiles.find(p => p.id === id); if (prof) return { id: prof.id, type: "profile", x: prof.x, y: prof.y };
    const board = postItBoards.find(b => b.id === id); if (board) return { id: board.id, type: "postit", x: board.x, y: board.y };
    const gb = guestbooks.find(g => g.id === id); if (gb) return { id: gb.id, type: "guestbook", x: gb.x, y: gb.y };
    return null;
  }

  // Si el elemento ya está seleccionado, cicla al siguiente en zIndex
  function clickThrough(id: string, e: React.MouseEvent): boolean {
    if (selectedIds.size !== 1 || !selectedIds.has(id)) return false;
    const hits = getElementsAtPoint(e.clientX, e.clientY);
    const idx = hits.findIndex(h => h.id === id);
    if (idx === -1 || hits.length < 2) return false;
    setSelectedIds(new Set([hits[(idx + 1) % hits.length].id]));
    return true;
  }

  function updateCard(id: string, patch: Partial<CanvasCard>) { enqueueOp({ type: "update_card", id, patch }); }
  function updateText(id: string, patch: Partial<CanvasText>) { enqueueOp({ type: "update_text", id, patch }); }
  function updateGallery(id: string, patch: Partial<CanvasGallery>) { enqueueOp({ type: "update_gallery", id, patch }); }
  function updateProfile(id: string, patch: Partial<ProfileCardData>) { enqueueOp({ type: "update_profile", id, patch }); }
  function updatePostItBoard(id: string, patch: Partial<PostItBoard>) { enqueueOp({ type: "update_postit", id, patch }); }
  function updateMedia(id: string, patch: Partial<CanvasMedia>) { enqueueOp({ type: "update_media", id, patch }); }

  function addMedia() {
    if (!canInteract) return;
    zCounter.current += 1;
    const vc = viewCenter();
    const { x: mx, y: my } = clampToViewport(vc.x + (Math.random() - 0.5) * 300, vc.y + (Math.random() - 0.5) * 200, 280, 120);
    const m: CanvasMedia = {
      id: crypto.randomUUID(),
      x: mx, y: my,
      w: 280, h: 120, zIndex: zCounter.current,
      layer: 1, depth: 0.5, rotation: 0,
      url: "", mediaType: "spotify",
      isPublic: inSpace ? true : undefined,
    };
    enqueueOp({ type: "add_media", media: m });
    setSelectedIds(new Set([m.id]));
    setMenuOpen(false);
  }

  function addGalleryImageToCanvas(src: string, x: number, y: number) {
    const el=new Image();
    el.onload=()=>{
      const maxW=Math.min(el.naturalWidth,420), ratio=el.naturalHeight/el.naturalWidth;
      const h=Math.round(maxW*ratio);
      const { x: cx, y: cy } = clampToViewport(x - maxW/2, y - h/2, maxW, h);
      zCounter.current+=1;
      enqueueOp({ type: "add_image", image: {id:crypto.randomUUID(),src,x:cx,y:cy,w:maxW,h,naturalW:el.naturalWidth,naturalH:el.naturalHeight,isTransparent:true,zIndex:zCounter.current,layer:1,depth:0.5,rotation:0} });
    };
    el.src=src;
  }

  function addProfile() {
    if (!canInteract) return;
    if (profiles.length > 0) return;
    zCounter.current += 1;
    const vc = viewCenter();
    const { x: px, y: py } = clampToViewport(vc.x + (Math.random() - 0.5) * 300, vc.y + (Math.random() - 0.5) * 200, 260, 220);
    const p: ProfileCardData = {
      id: crypto.randomUUID(), x: px, y: py,
      w: 260, h: 220, zIndex: zCounter.current, layer: 2, depth: 0.5, rotation: 0,
      photo: "", name: "", status: "", handle: userHandle,
      userId: currentUserId,
      photoX: 50, photoY: 34, textX: 50, textY: 72,
      photoSize: "md",
      bgColor: "", bgImage: "", borderRadius: 20, opacity: 1,
      isPublic: inSpace ? true : undefined,
    };
    enqueueOp({ type: "add_profile", profile: p });
    setSelectedIds(new Set([p.id]));
    setMenuOpen(false);
  }

  function addPostItBoard() {
    if (!canInteract) return;
    zCounter.current += 1;
    const vc = viewCenter();
    const { x: bx, y: by } = clampToViewport(vc.x + (Math.random() - 0.5) * 300, vc.y + (Math.random() - 0.5) * 200, 360, 320);
    const b: PostItBoard = {
      id: crypto.randomUUID(),
      x: bx, y: by,
      w: 360, h: 320, zIndex: zCounter.current,
      layer: 2, depth: 0.5, rotation: 0, posts: [],
      isPublic: inSpace ? true : undefined,
    };
    enqueueOp({ type: "add_postit", board: b });
    setSelectedIds(new Set([b.id]));
    setMenuOpen(false);
  }

  function addGuestbook() {
    if (!canInteract) return;
    zCounter.current += 1;
    const vc = viewCenter();
    const { x: gx, y: gy } = clampToViewport(vc.x + (Math.random() - 0.5) * 300, vc.y + (Math.random() - 0.5) * 200, 300, 340);
    const gb: CanvasGuestbook = {
      id: crypto.randomUUID(),
      x: gx, y: gy,
      w: 300, h: 340,
      zIndex: zCounter.current,
      layer: 2, depth: 0.5, rotation: 0,
      isPublic: inSpace ? true : undefined,
    };
    enqueueOp({ type: "add_guestbook", guestbook: gb });
    setSelectedIds(new Set([gb.id]));
    setMenuOpen(false);
  }

  function addGallery() {
    if (!canInteract) return;
    zCounter.current += 1;
    const vc = viewCenter();
    const { x: gx, y: gy } = clampToViewport(vc.x + (Math.random() - 0.5) * 300, vc.y + (Math.random() - 0.5) * 200, 260, 200);
    const g: CanvasGallery = {
      id: crypto.randomUUID(), x: gx, y: gy,
      w: 260, h: 200, zIndex: zCounter.current, layer: 1, depth: 0.5, rotation: 0,
      images: [], expanded: false, borderRadius: 16, opacity: 1,
      isPublic: inSpace ? true : undefined,
    };
    enqueueOp({ type: "add_gallery", gallery: g });
    setSelectedIds(new Set([g.id]));
    setMenuOpen(false);
  }

  function getGroupBounds(ids: Set<string>) {
    const all=[
      ...images.filter(i=>ids.has(i.id)).map(i=>({id:i.id,x:i.x,y:i.y,w:i.w,h:i.h})),
      ...cards.filter(c=>ids.has(c.id)).map(c=>({id:c.id,x:c.x,y:c.y,w:c.w,h:c.h})),
    ];
    if (!all.length) return null;
    const minX=Math.min(...all.map(i=>i.x)), minY=Math.min(...all.map(i=>i.y));
    const maxX=Math.max(...all.map(i=>i.x+i.w)), maxY=Math.max(...all.map(i=>i.y+i.h));
    return {x:minX,y:minY,w:maxX-minX,h:maxY-minY,items:all};
  }

  function onElementMouseDown(id: string, type: "image"|"card"|"text"|"gallery"|"profile"|"postit"|"media"|"guestbook", x: number, y: number, e: React.MouseEvent) {
    if (!canInteract) return;
    userInteractedRef.current = true;
    if (creatingCard||addingText) return;
    e.preventDefault(); e.stopPropagation();
    setSelRect(null); setCardMenuId(null); setCardMenuRect(null); setEditingId(null);
    selChangedRef.current = false;

    if (e.shiftKey) {
      const cur=new Set(selectedIds);
      if(cur.has(id))cur.delete(id);else cur.add(id);
      setSelectedIds(cur);
      startDrag(id,type,x,y,e,cur);
      return;
    }

    // If a selected element exists at the click point, drag it — don't change selection
    if (selectedIds.size > 0) {
      const hits = getElementsAtPoint(e.clientX, e.clientY);
      const selHit = hits.find(h => selectedIds.has(h.id));
      if (selHit) {
        const sel = findElementById(selHit.id);
        if (sel) { startDrag(sel.id, sel.type, sel.x, sel.y, e, selectedIds); return; }
      }
    }

    // No selected element at point → select topmost (id) and drag it
    const newSel = new Set([id]);
    setSelectedIds(newSel);
    selChangedRef.current = true;
    startDrag(id, type, x, y, e, newSel);
  }

  function onRotateText(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const el=textElRefs.current[id];
    if(el){const rect=el.getBoundingClientRect();startRotate(id,"text",e,rect.left+rect.width/2,rect.top+rect.height/2);}
    else startRotate(id,"text",e);
  }

  function handleElementClick(id: string, e: React.MouseEvent, canSelect = true) {
    e.stopPropagation();
    if (!canSelect || didDrag.current) return;
    if (e.shiftKey) {
      selChangedRef.current = true;
      setSelectedIds(prev => { const ns = new Set(prev); if (ns.has(id)) ns.delete(id); else ns.add(id); return ns; });
      return;
    }
    if (selChangedRef.current) { selChangedRef.current = false; return; }
    if (!clickThrough(id, e)) setSelectedIds(new Set([id]));
  }

  function onGlobalMouseMove(e: React.MouseEvent) {
    handleMouseMoveParallax(e);
    if(creatingCard&&drawingRect){const cc=toCanvasCoords(e.clientX,e.clientY);setDrawingRect(p=>p?{...p,currentX:cc.x,currentY:cc.y}:null);return;}
    if(selRect&&!dragging&&!resizing&&!rotating){setSelRect(p=>p?{...p,currentX:e.clientX,currentY:e.clientY}:null);return;}
    handleDragMove(e);
  }

  function onCanvasClick(e: React.MouseEvent) {
    if (!canInteract) return;
    if(addingText){
      zCounter.current+=1;
      const cc = toCanvasCoords(e.clientX, e.clientY);
      const { x: tx, y: ty } = clampToViewport(cc.x, cc.y, 0, 0);
      const newText: CanvasText = {
        id:crypto.randomUUID(),x:tx,y:ty,zIndex:zCounter.current,
        layer:1,depth:0.5,rotation:0,content:"text",font:"DM Sans",size:48,
        color:"#ffffff",opacity:1,letterSpacing:0,uppercase:false,
        isPublic:inSpace?true:undefined,
      };
      enqueueOp({ type: "add_text", text: newText });
      setSelectedIds(new Set([newText.id]));
      setEditingTextId(newText.id);
      setAddingText(false);return;
    }
  }

  function onGlobalMouseUp() {
    if (!canInteract) return;
    userInteractedRef.current = true;

    if (creatingCard && drawingRect) {
      const x=Math.min(drawingRect.startX,drawingRect.currentX), y=Math.min(drawingRect.startY,drawingRect.currentY);
      const w=Math.abs(drawingRect.currentX-drawingRect.startX), h=Math.abs(drawingRect.currentY-drawingRect.startY);
      if (w>40 && h>40) {
        zCounter.current += 1;
        const newCard: CanvasCard = {
          id: crypto.randomUUID(), x, y, w, h, zIndex: zCounter.current,
          type: "empty", bgColor: "", bgImage: "", borderRadius: 14, opacity: 1,
          layer: 2, depth: 0.5, rotation: (Math.random()-0.5)*6,
          isPublic: inSpace ? true : undefined,
        };
        enqueueOp({ type: "add_card", card: newCard });
      }
      setDrawingRect(null); setCreatingCard(false);
      return;
    }

    if (selRect) {
      const sx=Math.min(selRect.startX,selRect.currentX), sy=Math.min(selRect.startY,selRect.currentY);
      const sw=Math.abs(selRect.currentX-selRect.startX), sh=Math.abs(selRect.currentY-selRect.startY);
      if (sw>8 && sh>8) {
        const ns = new Set<string>();
        const hit = (ex:number,ey:number,ew:number,eh:number) => ex<sx+sw&&ex+ew>sx&&ey<sy+sh&&ey+eh>sy;
        visImages.forEach(img => { if(hit(img.x,img.y,img.w,img.h)) ns.add(img.id); });
        visCards.forEach(c => { if(hit(c.x,c.y,c.w,c.h)) ns.add(c.id); });
        visTexts.forEach(t => { const tw=(t.content?.length??4)*t.size*0.55; const th=t.size*1.6; if(hit(t.x,t.y,tw,th)) ns.add(t.id); });
        visGalleries.forEach(g => { if(hit(g.x,g.y,g.w,g.h)) ns.add(g.id); });
        visProfiles.forEach(p => { if(hit(p.x,p.y,p.w,p.h)) ns.add(p.id); });
        visBoards.forEach(b => { if(hit(b.x,b.y,b.w,b.h)) ns.add(b.id); });
        visMedias.forEach(m    => { if(hit(m.x,m.y,m.w,m.h)) ns.add(m.id); });
        visGuestbooks.forEach(g => { if(hit(g.x,g.y,g.w,g.h)) ns.add(g.id); });
        setSelectedIds(ns);
      } else setSelectedIds(new Set());
      setSelRect(null);
      return;
    }

    // Capture what's about to be deleted before handleDragUp removes them
    const toDelete: Array<{ id: string; type: "image"|"card"|"text"|"gallery"|"profile"|"postit"|"media"|"guestbook" }> = [];
    if (dragging && overTrash) {
      images.forEach(i  => { if (selectedIds.has(i.id))  toDelete.push({ id: i.id,  type: "image"   }); });
      cards.forEach(c   => { if (selectedIds.has(c.id))  toDelete.push({ id: c.id,  type: "card"    }); });
      texts.forEach(t   => { if (selectedIds.has(t.id))  toDelete.push({ id: t.id,  type: "text"    }); });
      galleries.forEach(g => { if (selectedIds.has(g.id)) toDelete.push({ id: g.id, type: "gallery" }); });
      profiles.forEach(p  => { if (selectedIds.has(p.id)) toDelete.push({ id: p.id, type: "profile" }); });
      postItBoards.forEach(b => { if (selectedIds.has(b.id)) toDelete.push({ id: b.id, type: "postit" }); });
      medias.forEach(m      => { if (selectedIds.has(m.id))  toDelete.push({ id: m.id,  type: "media"     }); });
      guestbooks.forEach(g  => { if (selectedIds.has(g.id)) toDelete.push({ id: g.id, type: "guestbook" }); });
    }

    if (dragging && overTrash) setSelectedIds(new Set());
    const result = handleDragUp(selectedIds);

    if (canEdit) {
      if (result.wasDeleted) {
        toDelete.forEach(({ id, type }) => {
          if (type === "image")   enqueueOp({ type: "delete_image",   id });
          else if (type === "card")    enqueueOp({ type: "delete_card",    id });
          else if (type === "text")    enqueueOp({ type: "delete_text",    id });
          else if (type === "gallery") enqueueOp({ type: "delete_gallery", id });
          else if (type === "profile") enqueueOp({ type: "delete_profile", id });
          else if (type === "postit")    enqueueOp({ type: "delete_postit",    id });
          else if (type === "media")     enqueueOp({ type: "delete_media",     id });
          else if (type === "guestbook") enqueueOp({ type: "delete_guestbook", id });
        });
      } else if (result.moved.length === 1) {
        const { id, type, x, y } = result.moved[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        enqueueOp({ type: `update_${type}` as any, id, patch: { x, y } });
      } else if (result.moved.length > 1) {
        enqueueOp({
          type: "move_elements",
          moves: result.moved.map(({ id, type, x, y }) => ({ id, elementType: type, x, y })),
        });
      } else if (result.rotated) {
        const { id, type, rotation } = result.rotated;
        const patch = { rotation };
        if (type === "image")   enqueueOp({ type: "update_image",   id, patch });
        else if (type === "card")    enqueueOp({ type: "update_card",    id, patch });
        else if (type === "text")    enqueueOp({ type: "update_text",    id, patch });
        else if (type === "gallery") enqueueOp({ type: "update_gallery", id, patch });
        else if (type === "profile") enqueueOp({ type: "update_profile", id, patch });
        else if (type === "postit")    enqueueOp({ type: "update_postit",    id, patch });
        else if (type === "media")     enqueueOp({ type: "update_media",     id, patch });
        else if (type === "guestbook") enqueueOp({ type: "update_guestbook", id, patch });
      } else if (result.resized) {
        const { id, type, ...dims } = result.resized;
        // Guard: never persist NaN/Infinity/zero — these make elements invisible on reload
        const safeNum = (n: number | undefined, min: number) =>
          typeof n === "number" && isFinite(n) && n >= min ? n : undefined;
        if (type === "text") {
          const size = safeNum(dims.size, 6);
          if (size !== undefined) enqueueOp({ type: "update_text", id, patch: { size } });
        } else {
          const w = safeNum(dims.w, 1);
          const h = safeNum(dims.h, 1);
          if (w !== undefined && h !== undefined) {
            if (type === "image")   enqueueOp({ type: "update_image",   id, patch: { w, h } });
            else if (type === "card")    enqueueOp({ type: "update_card",    id, patch: { w, h } });
            else if (type === "gallery") enqueueOp({ type: "update_gallery", id, patch: { w, h } });
            else if (type === "profile") enqueueOp({ type: "update_profile", id, patch: { w, h } });
            else if (type === "postit")    enqueueOp({ type: "update_postit",    id, patch: { w, h } });
            else if (type === "media")     enqueueOp({ type: "update_media",     id, patch: { w, h } });
            else if (type === "guestbook") enqueueOp({ type: "update_guestbook", id, patch: { w, h } });
          }
        }
      }
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!canInteract) return;
    if (!canvasIdRef.current) return;
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const localUrl = URL.createObjectURL(f);
      const id = crypto.randomUUID();
      const isGif = f.type === "image/gif";

      // Mostrar inmediatamente con URL local mientras sube en background
      const el = new Image();
      el.onload = () => {
        const maxW = Math.min(el.naturalWidth, 420), ratio = el.naturalHeight / el.naturalWidth;
        zCounter.current += 1;
        const newImg: CanvasImageType = {
          id, src: localUrl, isLocal: true,
          ...clampToViewport(window.innerWidth / 2 + (Math.random() - 0.5) * 400, window.innerHeight / 2 + (Math.random() - 0.5) * 200, maxW, Math.round(maxW * ratio)),
          w: maxW, h: Math.round(maxW*ratio),
          naturalW: el.naturalWidth, naturalH: el.naturalHeight,
          isTransparent: f.type !== "image/jpeg",
          zIndex: zCounter.current, layer: isGif ? 1 : 0,
          depth: 0.5, rotation: 0,
          isPublic: canvasModeRef.current === "space" ? true : undefined,
        };
        enqueueOp({ type: "add_image", image: newImg });

        const uploadSession = sessionIdRef.current;
        uploadToStorage(f)
          .then(storageUrl => {
            if (!storageUrl) {
              enqueueOp({ type: "delete_image", id });
              return;
            }
            if (uploadSession !== sessionIdRef.current) {
              URL.revokeObjectURL(localUrl);
              return;
            }
            enqueueOp({ type: "update_image", id, patch: { src: storageUrl, isLocal: false } });
            URL.revokeObjectURL(localUrl);
          })
          .catch(() => {
            enqueueOp({ type: "delete_image", id });
            URL.revokeObjectURL(localUrl);
          });
      };
      el.src = localUrl;
    }
    setMenuOpen(false);
    if (imageRef.current) imageRef.current.value = "";
  }

  async function handleBgImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0];
    if(!f||!bgCardId.current)return;
    const src = await uploadToStorage(f);
    const bgMode = await detectBgMode(src);
    updateCard(bgCardId.current,{bgImage:src,bgMode});
    bgCardId.current=null;
    if(bgImageRef.current)bgImageRef.current.value="";
  }

  const isActive    = !!(dragging||resizing||rotating);
  const multiSel    = selectedIds.size>1;
  const groupBounds = multiSel?getGroupBounds(selectedIds):null;

  const drawRectVis = drawingRect?{x:Math.min(drawingRect.startX,drawingRect.currentX),y:Math.min(drawingRect.startY,drawingRect.currentY),w:Math.abs(drawingRect.currentX-drawingRect.startX),h:Math.abs(drawingRect.currentY-drawingRect.startY)}:null;
  const selRectVis  = selRect?{x:Math.min(selRect.startX,selRect.currentX),y:Math.min(selRect.startY,selRect.currentY),w:Math.abs(selRect.currentX-selRect.startX),h:Math.abs(selRect.currentY-selRect.startY)}:null;
  const bgStyle = {
    backgroundColor: bgColor,
    ...(wallpaper && wallpaperLoaded ? {
      backgroundImage: `url(${wallpaper})`,
      backgroundSize: "auto",
      backgroundRepeat: "repeat",
      transition: "background-image 0.2s ease",
    } : {}),
  };

  return (
    <div className="grain" style={{
      position: "relative",
      minHeight: "100vh",
      minWidth: "100vw",
      overflowX: "hidden",
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      cursor: addingText?"text":rotating?"crosshair":creatingCard?"crosshair":dragging?"grabbing":"default",
      fontFamily: SANS,
    }}
      onMouseMove={onGlobalMouseMove} onMouseUp={onGlobalMouseUp} onClick={onCanvasClick}>
      {/* ── Fixed background layer ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        ...bgStyle,
      }} />
      <Topbar
        wallpaper={wallpaper}
        handle={userHandle}
        onLogout={canEdit ? handleLogout : undefined}
        canvasMode={canEdit ? canvasMode : (viewerLoggedIn ? "home" : undefined)}
        onModeChange={canEdit ? handleModeChange : (viewerLoggedIn ? async (mode: CanvasMode) => { router.push(mode === "space" ? "/dashboard?view=space" : "/dashboard"); } : undefined)}
        publishState={canEdit && canvasMode === "space" && view === "canvas" ? publishState : undefined}
        onPublish={canEdit && canvasMode === "space" && view === "canvas" ? publishSpace : undefined}
        isChats={view === "chats"}
        onChats={canEdit ? () => setView("chats") : (viewerLoggedIn ? () => router.push("/dashboard?view=chats") : undefined)}
        unreadChats={totalUnread}
        unreadSignals={canEdit ? unreadCount : undefined}
        onSignals={canEdit ? () => { if (!showSignals) markAllRead(); setShowSignals(s => !s); } : undefined}
      />

      {view==="canvas"&&(creatingCard||rotating||addingText)&&(
        <div style={{position:"fixed",top:58,left:"50%",transform:"translateX(-50%)",background:"rgba(10,10,12,0.92)",color:"rgba(255,255,255,0.4)",padding:"5px 14px",borderRadius:6,zIndex:700,fontFamily:MONO,fontSize:9,letterSpacing:2,textTransform:"uppercase",border:"1px solid rgba(255,255,255,0.06)",pointerEvents:"none"}}>
          {addingText?"click to place text":rotating?"rotating":"draw the area"}
        </div>
      )}

      <input ref={wallpaperRef} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files?.[0];if(f){const src=await uploadToStorage(f);enqueueOp({type:"set_wallpaper",value:src});}}} />
      <input ref={imageRef} type="file" accept="image/*,image/gif" multiple style={{display:"none"}} onChange={handleImageUpload} />
      <input ref={bgImageRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleBgImage} />

      {/* ── Canvas content wrapper ── */}
      {view === "canvas" && (
      <div ref={canvasWrapperRef} suppressHydrationWarning style={{ position: "relative", width: logicalW.current, minHeight: CANVAS_H, zIndex: 1, overflow: "hidden", flexShrink: 0 }}>

      {/* Grid overlay */}

      {/* Grid overlay */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)",backgroundSize:"48px 48px",pointerEvents:"none",zIndex:1}} />

      <div style={{position:"absolute",inset:0,zIndex:0}}
        onMouseDown={e=>{
          if(!canInteract)return;
          if(addingText)return;
          if(creatingCard){e.preventDefault();const cc=toCanvasCoords(e.clientX,e.clientY);setDrawingRect({startX:cc.x,startY:cc.y,currentX:cc.x,currentY:cc.y});return;}
          e.preventDefault();
          selChangedRef.current = false;
          setSelectedIds(new Set());setMenuOpen(false);setCardMenuId(null);setCardMenuRect(null);setEditingId(null);setEditingTextId(null);
          setSelRect({startX:e.clientX,startY:e.clientY,currentX:e.clientX,currentY:e.clientY});
        }} />


      {view==="canvas"&&drawRectVis&&drawRectVis.w>0&&(<div style={{position:"absolute",left:drawRectVis.x,top:drawRectVis.y,width:drawRectVis.w,height:drawRectVis.h,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.02)",borderRadius:4,pointerEvents:"none",zIndex:600}} />)}
      {view==="canvas"&&selRectVis&&selRectVis.w>5&&selRectVis.h>5&&(<div style={{position:"absolute",left:selRectVis.x,top:selRectVis.y,width:selRectVis.w,height:selRectVis.h,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.02)",borderRadius:3,pointerEvents:"none",zIndex:600}} />)}

      {/* ── IMAGES ── */}
      {visImages.map(img=>{
        const isSel=selectedIds.has(img.id);
        const ps=getParallaxStyle(img.layer,img.depth);
        return (
          <div key={img.id} style={{position:"absolute",left:img.x,top:img.y,width:img.w,height:img.h,zIndex:img.zIndex+img.layer*100,cursor:img.locked?"default":dragging?.id===img.id?"grabbing":"grab",userSelect:"none",transform:`${ps.transform} rotate(${img.rotation??0}deg)`,willChange:"transform"}}
            onMouseDown={e=>{if(!img.locked)onElementMouseDown(img.id,"image",img.x,img.y,e);else e.stopPropagation();}}
            onClick={e=>handleElementClick(img.id,e)}

            onDoubleClick={e=>{e.stopPropagation();zCounter.current++;setElements(p=>p.map(e=>e.elementType==="image"&&e.id===img.id?{...e,zIndex:zCounter.current}:e));}}>
            <img src={img.src} draggable={false} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} style={{width:"100%",height:"100%",objectFit:"contain",borderRadius:img.borderRadius??( img.isTransparent?0:8),outline:isSel?"1px solid rgba(255,255,255,0.3)":"none",filter:isSel?"drop-shadow(0 0 8px rgba(255,255,255,0.12))":"none"}} />
            {isSel&&canInteract&&(<div style={{position:"absolute",top:-22,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:4,padding:4,background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,backdropFilter:"blur(6px)"}} onMouseDown={e=>e.stopPropagation()}>
              {([0,1,2] as const).map(l=>{const hk=`img_${img.id}_${l}`;return(<div key={l} onClick={e=>{e.stopPropagation();setElements(p=>p.map(e=>e.elementType==="image"&&e.id===img.id?{...e,layer:l}:e));}} onMouseDown={e=>e.stopPropagation()} onMouseEnter={()=>setHovLayerKey(hk)} onMouseLeave={()=>setHovLayerKey(null)} style={{padding:"4px 8px",borderRadius:4,fontFamily:MONO,fontSize:11,letterSpacing:"1px",cursor:"pointer",transition:"all 0.12s ease",background:img.layer===l?"white":"transparent",color:img.layer===l?"black":"rgba(255,255,255,0.4)",opacity:hovLayerKey===hk?1:undefined,transform:hovLayerKey===hk?"scale(1.05)":undefined}}>{LAYER_NAMES[l].slice(0,2).toUpperCase()}</div>);})}
              <div style={{width:1,height:12,background:"rgba(255,255,255,0.18)",margin:"0 2px",flexShrink:0}} />
              {([0,8,20,999] as const).map(r=>{const cur=img.borderRadius??(img.isTransparent?0:8);const active=r===999?cur>=50:cur===r;const vr=r===0?"2px":r===8?"4px":r===20?"7px":"50%";return(<div key={r} title={r===0?"Square":r===8?"Slight":r===20?"Rounded":"Circle"} onClick={e=>{e.stopPropagation();setElements(p=>p.map(el=>el.elementType==="image"&&el.id===img.id?{...el,borderRadius:r}:el));enqueueOp({type:"update_image",id:img.id,patch:{borderRadius:r}});}} onMouseDown={e=>e.stopPropagation()} style={{width:14,height:14,borderRadius:vr,border:`1px solid ${active?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.3)"}`,background:active?"rgba(255,255,255,0.2)":"transparent",cursor:"pointer",flexShrink:0}} />);})}
            </div>)}
            {isSel&&canInteract&&!multiSel&&(<LockBtn locked={!!img.locked} onClick={e=>{e.stopPropagation();setElements(p=>p.map(e=>e.elementType==="image"&&e.id===img.id?{...e,locked:!e.locked}:e));}} />)}
            {isSel&&canInteract&&!multiSel&&!img.locked&&(<div onMouseDown={e=>startSingleResize(img.id,"image",e)} style={{position:"absolute",bottom:-5,right:-5,width:10,height:10,borderRadius:"50%",background:"rgba(255,255,255,0.7)",cursor:"nwse-resize",border:"1.5px solid rgba(0,0,0,0.2)",zIndex:10}} />)}
            {isSel&&canInteract&&!multiSel&&!img.locked&&(<RotateHandle onMouseDown={e=>{e.stopPropagation();startRotate(img.id,"image",e);}} />)}
          </div>
        );
      })}

      {/* ── TEXTS ── */}
      {visTexts.map(txt=>{
        const isSel=selectedIds.has(txt.id);
        const isEdit=editingTextId===txt.id;
        const ps=getParallaxStyle(txt.layer,txt.depth);
        return (
          <div key={txt.id} ref={el=>{textElRefs.current[txt.id]=el;}}
            style={{position:"absolute",left:txt.x,top:txt.y,zIndex:txt.zIndex+txt.layer*100,transform:`${ps.transform} rotate(${txt.rotation}deg)`,willChange:"transform",userSelect:isEdit?"text":"none",cursor:txt.locked?"default":dragging?.id===txt.id?"grabbing":isEdit?"text":"grab",display:"inline-block"}}
            onMouseDown={e=>{if(txt.locked){e.stopPropagation();return;}if(!isEdit)onElementMouseDown(txt.id,"text",txt.x,txt.y,e);}}
            onClick={e=>handleElementClick(txt.id,e)}
            onDoubleClick={e=>{e.stopPropagation();setEditingTextId(txt.id);}}>
            {isSel&&!isEdit&&(<div style={{position:"absolute",inset:-8,borderRadius:4,outline:"1.5px solid rgba(255,255,255,0.28)",outlineOffset:0,pointerEvents:"none",zIndex:-1}} />)}
            <div contentEditable={isEdit && canInteract} suppressContentEditableWarning
              onFocus={e=>{const r=document.createRange();r.selectNodeContents(e.currentTarget);r.collapse(false);window.getSelection()?.removeAllRanges();window.getSelection()?.addRange(r);}}
              onBlur={canInteract ? (e=>{updateText(txt.id,{content:e.currentTarget.innerText});setEditingTextId(null);}) : undefined}
              onKeyDown={canInteract ? (e=>{if(e.key==="Escape"){updateText(txt.id,{content:e.currentTarget.innerText});setEditingTextId(null);}e.stopPropagation();}) : undefined}
              onInput={canInteract ? (e=>{updateText(txt.id,{content:(e.currentTarget as HTMLDivElement).innerText});}) : undefined}
              onClick={e=>{if(isEdit)e.stopPropagation();}}
              onMouseDown={e=>{if(isEdit)e.stopPropagation();}}
              style={{fontFamily:getFontStyle(txt.font),fontSize:txt.size,color:txt.color,opacity:txt.opacity,letterSpacing:txt.letterSpacing,textTransform:txt.uppercase?"uppercase":"none",lineHeight:1.15,whiteSpace:"pre",outline:isEdit?"1px dashed rgba(255,255,255,0.2)":"none",outlineOffset:6,padding:"2px 0",cursor:isEdit?"text":"grab",minWidth:4} as React.CSSProperties}
              dangerouslySetInnerHTML={isEdit ? undefined : { __html: txt.content }}
              ref={el=>{if(el&&isEdit&&el.innerText!==txt.content){el.innerText=txt.content;}}}
            />
            {isSel&&canInteract&&!isEdit&&(<div style={{position:"absolute",top:-22,left:0,display:"flex",gap:4,padding:4,background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,backdropFilter:"blur(6px)"}} onMouseDown={e=>e.stopPropagation()}>
              {([0,1,2] as const).map(l=>{const hk=`txt_${txt.id}_${l}`;return(<div key={l} onClick={e=>{e.stopPropagation();updateText(txt.id,{layer:l});}} onMouseEnter={()=>setHovLayerKey(hk)} onMouseLeave={()=>setHovLayerKey(null)} style={{padding:"4px 8px",borderRadius:4,fontFamily:MONO,fontSize:11,letterSpacing:"1px",cursor:"pointer",transition:"all 0.12s ease",background:txt.layer===l?"white":"transparent",color:txt.layer===l?"black":"rgba(255,255,255,0.4)",opacity:hovLayerKey===hk?1:undefined,transform:hovLayerKey===hk?"scale(1.05)":undefined}}>{LAYER_NAMES[l].slice(0,2).toUpperCase()}</div>);})}
            </div>)}
            {isSel&&canInteract&&!isEdit&&(<LockBtn locked={!!txt.locked} onClick={e=>{e.stopPropagation();updateText(txt.id,{locked:!txt.locked});}} />)}
            {isSel&&canInteract&&!isEdit&&!txt.locked&&(<RotateHandle onMouseDown={e=>onRotateText(txt.id,e)} />)}
            {isSel&&canInteract&&!isEdit&&!txt.locked&&(<div onMouseDown={e=>startSingleResize(txt.id,"text",e)} style={{position:"absolute",bottom:-5,right:-5,width:10,height:10,borderRadius:"50%",background:"rgba(255,255,255,0.65)",cursor:"nwse-resize",border:"1.5px solid rgba(0,0,0,0.2)",zIndex:10}} />)}
            {isSel&&canInteract&&!isEdit&&(
              <div onMouseDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}
                style={{position:"absolute",top:"calc(100% + 14px)",left:"50%",transform:"translateX(-50%)",background:"rgba(10,10,12,0.97)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"10px 12px",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",zIndex:500,boxShadow:"0 12px 40px rgba(0,0,0,0.7)",display:"flex",flexDirection:"column",gap:10,whiteSpace:"nowrap",minWidth:220}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <select value={txt.font} onChange={e=>updateText(txt.id,{font:e.target.value as TextFont})} onMouseDown={e=>e.stopPropagation()} style={{flex:1,padding:"4px 8px",borderRadius:7,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.8)",fontSize:12,fontFamily:getFontStyle(txt.font),cursor:"pointer",outline:"none"}}>
                    {TEXT_FONTS.map(f=>(<option key={f.key} value={f.key} style={{fontFamily:f.style,background:"#0a0a0c"}}>{f.label}</option>))}
                  </select>
                  <button onClick={()=>updateText(txt.id,{uppercase:!txt.uppercase})} style={{padding:"4px 9px",borderRadius:7,border:"none",cursor:"pointer",background:txt.uppercase?"rgba(212,240,196,0.12)":"rgba(255,255,255,0.05)",color:txt.uppercase?"rgba(212,240,196,0.85)":"rgba(255,255,255,0.3)",fontFamily:MONO,fontSize:9,letterSpacing:1,outline:txt.uppercase?"1px solid rgba(212,240,196,0.2)":"none",flexShrink:0}}>AA</button>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <button onClick={()=>updateText(txt.id,{size:Math.max(10,txt.size-8)})} style={{width:20,height:20,borderRadius:5,border:"none",background:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                    <span style={{fontFamily:MONO,fontSize:10,color:"rgba(255,255,255,0.5)",minWidth:32,textAlign:"center"}}>{txt.size}px</span>
                    <button onClick={()=>updateText(txt.id,{size:Math.min(300,txt.size+8)})} style={{width:20,height:20,borderRadius:5,border:"none",background:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                  </div>
                  <div style={{width:1,height:16,background:"rgba(255,255,255,0.08)",flexShrink:0}} />
                  <div style={{width:24,height:24,borderRadius:7,overflow:"hidden",border:"1px solid rgba(255,255,255,0.12)",flexShrink:0}}>
                    <input type="color" value={txt.color.startsWith("#")?txt.color:"#ffffff"} onChange={e=>updateText(txt.id,{color:e.target.value})} style={{width:"100%",height:"100%",border:"none",cursor:"pointer",padding:2}} />
                  </div>
                  <div style={{width:1,height:16,background:"rgba(255,255,255,0.08)",flexShrink:0}} />
                  <div style={{display:"flex",alignItems:"center",gap:5,flex:1}}>
                    <span style={{fontFamily:MONO,fontSize:9,color:"rgba(255,255,255,0.25)",flexShrink:0}}>OP</span>
                    <input type="range" min={5} max={100} value={Math.round(txt.opacity*100)} onChange={e=>updateText(txt.id,{opacity:Number(e.target.value)/100})} style={{flex:1,accentColor:"rgba(212,240,196,0.7)"}} />
                    <span style={{fontFamily:MONO,fontSize:9,color:"rgba(255,255,255,0.35)",minWidth:24,textAlign:"right"}}>{Math.round(txt.opacity*100)}</span>
                  </div>
                </div>
                <div style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,0.12)",letterSpacing:1,textAlign:"center"}}>double-click to edit · corner to resize</div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── GALLERIES ── */}
      {visGalleries.map(gallery=>{
        const ps=getParallaxStyle(gallery.layer,gallery.depth);
        return (
          <WidgetBoundary key={gallery.id} label="gallery">
            <GalleryWidget gallery={gallery} isSel={selectedIds.has(gallery.id)} multiSel={multiSel} draggingId={dragging?.id??null} locked={!!gallery.locked} onMouseDown={gallery.locked?(id,t,x,y,e)=>e.stopPropagation():onElementMouseDown} onClick={e=>handleElementClick(gallery.id,e)}
 onResizeMD={gallery.locked?(id,t,e)=>e.stopPropagation():startSingleResize} onRotateMD={gallery.locked?(id,t,e)=>e.stopPropagation():startRotate} updateGallery={updateGallery} onDropToCanvas={addGalleryImageToCanvas} parallaxTransform={ps.transform as string} onToggleLock={()=>updateGallery(gallery.id,{locked:!gallery.locked} as any)} canInteract={canInteract} />
          </WidgetBoundary>
        );
      })}

      {/* ── PROFILES ── */}
      {visProfiles.map(prof=>{
        const ps=getParallaxStyle(prof.layer,prof.depth);
        return (<ProfileCard key={prof.id} card={prof} isSel={selectedIds.has(prof.id)} draggingId={dragging?.id??null} parallaxTransform={ps.transform as string}
          locked={!!prof.locked}
          onMouseDown={prof.locked?e=>e.stopPropagation():e=>onElementMouseDown(prof.id,"profile",prof.x,prof.y,e)}
          onClick={e=>handleElementClick(prof.id,e)}

          onResizeMD={prof.locked?e=>e.stopPropagation():e=>startSingleResize(prof.id,"profile",e)}
          onRotateMD={prof.locked?e=>e.stopPropagation():e=>{const el=document.querySelector(`[data-profile-id="${prof.id}"]`) as HTMLElement;if(el){const r=el.getBoundingClientRect();startRotate(prof.id,"profile",e,r.left+r.width/2,r.top+r.height/2);}else startRotate(prof.id,"profile",e,prof.x+prof.w/2,prof.y+prof.h/2);}}
          updateProfile={updateProfile}
          onToggleLock={()=>setElements(p=>p.map(e=>e.elementType==="profile"&&e.id===prof.id?{...e,locked:!e.locked}:e))}
          canInteract={canInteract}
          currentUserId={currentUserId}
          ownerUserId={ownerUserId}
          authResolved={authResolved}
          onMessage={(handle) => handleMessage(handle)}
          onOpenSocialPanel={(mode) => {
            const uid = prof.userId ?? ownerUserId;
            if (uid) openSocialPanel(uid, prof.handle || userHandle, mode);
          }} />);
      })}

      {/* ── POST IT BOARDS ── */}
      {visBoards.map(board=>{
        const ps=getParallaxStyle(board.layer,board.depth);
        return (
          <WidgetBoundary key={board.id} label="postit">
            <PostItBoardWidget board={board} isSel={selectedIds.has(board.id)} multiSel={multiSel} draggingId={dragging?.id??null}
              parallaxTransform={ps.transform as string}
              onMouseDown={board.locked?(id,t,x,y,e)=>e.stopPropagation():onElementMouseDown}
              onClick={e=>handleElementClick(board.id,e)}
              onResizeMD={board.locked?(id,t,e)=>e.stopPropagation():startSingleResize}
              onRotateMD={board.locked?(id,t,e)=>e.stopPropagation():startRotate}
              updateBoard={updatePostItBoard}
              locked={!!board.locked}
              canInteract={canInteract}
              onToggleLock={()=>setElements(p=>p.map(e=>e.elementType==="postit"&&e.id===board.id?{...e,locked:!e.locked}:e))} />
          </WidgetBoundary>
        );
      })}

      {/* ── CARDS ── */}
      {visCards.map(card=>{
        const isSel=selectedIds.has(card.id);
        const showMenu=cardMenuId===card.id;
        const isEdit=editingId===card.id;
        const isNote=card.type==="text"||card.type==="list";
        const tc=card.textColor||textColor(card.bgColor);
        const light=isLight(card.bgColor);
        const pad=adaptivePad(card.borderRadius);
        const ps=getParallaxStyle(card.layer,card.depth);
        return (
          <div key={card.id}
            ref={el=>{cardDivRefs.current[card.id]=el;}}
            onMouseDown={e=>{if(!card.locked)onElementMouseDown(card.id,"card",card.x,card.y,e);else e.stopPropagation();}}
            onClick={e=>handleElementClick(card.id,e)}

            onDoubleClick={e=>{e.stopPropagation();zCounter.current++;setElements(p=>p.map(e=>e.elementType==="card"&&e.id===card.id?{...e,zIndex:zCounter.current}:e));}}
            style={{position:"absolute",left:card.x,top:card.y,width:card.w,height:card.h,zIndex:card.zIndex+card.layer*100,cursor:card.locked?"default":dragging?.id===card.id?"grabbing":"grab",userSelect:"none",transform:`${ps.transform} rotate(${card.rotation}deg)`,willChange:"transform"}}>
            <div style={{position:"absolute",inset:0,borderRadius:card.borderRadius,border:isSel?`1px solid ${light?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.22)"}`:`1px solid ${light?"rgba(0,0,0,0.07)":"rgba(255,255,255,0.06)"}`,...(card.bgImage?bgImageStyle(card.bgImage,card.bgMode):{background:card.bgColor||"rgba(255,255,255,0.045)"}),backdropFilter:card.bgColor?"none":"blur(18px)",WebkitBackdropFilter:card.bgColor?"none":"blur(18px)",boxShadow:isNote?"0 8px 28px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)":"0 2px 14px rgba(0,0,0,0.18)",opacity:card.opacity}} />
            {isNote&&card.bgColor&&(<div style={{position:"absolute",top:-6,left:"50%",transform:"translateX(-50%)",width:32,height:10,borderRadius:3,background:"rgba(0,0,0,0.08)",backdropFilter:"blur(2px)",zIndex:2}} />)}
            {card.type!=="empty"&&(<div style={{position:"absolute",top:isNote&&card.bgColor?pad+6:pad,bottom:pad,left:pad,right:pad,overflow:"hidden",pointerEvents:isEdit?"auto":"none"}}>{renderContent(card,tc,isEdit,updateCard)}</div>)}
            {card.type==="empty"&&!isSel&&(<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.15}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={light?"#000":"#fff"} strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>)}
            <div onMouseDown={e=>{if(!card.locked)onElementMouseDown(card.id,"card",card.x,card.y,e);else e.stopPropagation();}} style={{position:"absolute",top:0,left:0,right:0,height:22,borderRadius:`${card.borderRadius}px ${card.borderRadius}px 0 0`,cursor:card.locked?"default":dragging?.id===card.id?"grabbing":"grab",zIndex:4}} />
            {isSel&&canInteract&&!multiSel&&(<div style={{position:"absolute",top:-22,left:0,display:"flex",gap:4,padding:4,background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,backdropFilter:"blur(6px)"}} onMouseDown={e=>e.stopPropagation()}>
              {([0,1,2] as const).map(l=>{const hk=`card_${card.id}_${l}`;return(<div key={l} onClick={e=>{e.stopPropagation();updateCard(card.id,{layer:l});}} onMouseEnter={()=>setHovLayerKey(hk)} onMouseLeave={()=>setHovLayerKey(null)} style={{padding:"4px 8px",borderRadius:4,fontFamily:MONO,fontSize:11,letterSpacing:"1px",cursor:"pointer",transition:"all 0.12s ease",background:card.layer===l?"white":"transparent",color:card.layer===l?"black":"rgba(255,255,255,0.4)",opacity:hovLayerKey===hk?1:undefined,transform:hovLayerKey===hk?"scale(1.05)":undefined}}>{LAYER_NAMES[l].slice(0,2).toUpperCase()}</div>);})}
            </div>)}
            {isSel&&canInteract&&!multiSel&&(card.type==="text"||card.type==="list"||card.type==="links")&&!isEdit&&(<div onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setEditingId(card.id);}} style={{position:"absolute",bottom:-12,left:"50%",transform:"translateX(-50%)",padding:"3px 10px",borderRadius:20,cursor:"pointer",zIndex:20,background:"rgba(10,10,12,0.94)",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:5,backdropFilter:"blur(8px)"}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg><span style={{fontFamily:MONO,fontSize:8,letterSpacing:1.5,color:"rgba(255,255,255,0.35)",textTransform:"uppercase"}}>edit</span></div>)}
            {isEdit&&canInteract&&(<div onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setEditingId(null);}} style={{position:"absolute",bottom:-12,left:"50%",transform:"translateX(-50%)",padding:"3px 10px",borderRadius:20,cursor:"pointer",zIndex:20,background:"rgba(212,240,196,0.12)",border:"1px solid rgba(212,240,196,0.25)",fontFamily:MONO,fontSize:8,letterSpacing:1.5,color:"rgba(212,240,196,0.8)",textTransform:"uppercase"}}>done ✓</div>)}
            {isSel&&canInteract&&!multiSel&&!isEdit&&(<div onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();if(showMenu){setCardMenuId(null);setCardMenuRect(null);}else{const el=cardDivRefs.current[card.id];if(el)setCardMenuRect(el.getBoundingClientRect());setCardMenuId(card.id);setCardMenuTab("type");};}} style={{position:"absolute",top:-10,left:-10,width:20,height:20,borderRadius:"50%",background:"rgba(12,12,14,0.96)",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.4)"}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>)}
            {isSel&&canInteract&&!multiSel&&(<LockBtn locked={!!card.locked} onClick={e=>{e.stopPropagation();updateCard(card.id,{locked:!card.locked});}} />)}
            {isSel&&canInteract&&!multiSel&&!isEdit&&!card.locked&&(<RotateHandle onMouseDown={e=>{e.stopPropagation();const el=e.currentTarget.parentElement;if(el){const r=el.getBoundingClientRect();startRotate(card.id,"card",e,r.left+r.width/2,r.top+r.height/2);}else{startRotate(card.id,"card",e,card.x+card.w/2,card.y+card.h/2);}}} />)}
            {isSel&&canInteract&&!multiSel&&!card.locked&&(<div onMouseDown={e=>startSingleResize(card.id,"card",e)} style={{position:"absolute",bottom:-5,right:-5,width:10,height:10,borderRadius:"50%",background:light?"rgba(20,20,20,0.5)":"rgba(255,255,255,0.65)",cursor:"nwse-resize",border:"1.5px solid rgba(0,0,0,0.2)",zIndex:10}} />)}
          </div>
        );
      })}

      {/* ── MEDIA CARDS ── */}
      {visMedias.map(media => {
        const ps = getParallaxStyle(media.layer, media.depth);
        return (
          <WidgetBoundary key={media.id} label="media">
            <MediaCardWidget
              media={media}
              isSel={selectedIds.has(media.id)}
              draggingId={dragging?.id ?? null}
              parallaxTransform={ps.transform as string}
              onMouseDown={media.locked ? e => e.stopPropagation() : e => onElementMouseDown(media.id, "media", media.x, media.y, e)}
              onClick={e => handleElementClick(media.id, e)}
              onResizeMD={media.locked ? e => e.stopPropagation() : e => startSingleResize(media.id, "media", e)}
              onRotateMD={media.locked ? e => e.stopPropagation() : e => startRotate(media.id, "media", e, media.x + media.w / 2, media.y + media.h / 2)}
              updateMedia={updateMedia}
              locked={!!media.locked}
              onToggleLock={() => setElements(p => p.map(e => e.elementType === "media" && e.id === media.id ? { ...e, locked: !e.locked } : e))}
              canInteract={canInteract}
            />
          </WidgetBoundary>
        );
      })}

      {/* ── GUESTBOOKS ── */}
      {visGuestbooks.map(gb => {
        const ps = getParallaxStyle(gb.layer, gb.depth);
        return (
          <WidgetBoundary key={gb.id} label="guestbook">
            <GuestbookWidget
              guestbook={gb}
              isSel={selectedIds.has(gb.id)}
              draggingId={dragging?.id ?? null}
              parallaxTransform={ps.transform as string}
              onMouseDown={gb.locked ? e => e.stopPropagation() : e => onElementMouseDown(gb.id, "guestbook", gb.x, gb.y, e)}
              onClick={e => handleElementClick(gb.id, e)}
              onResizeMD={gb.locked ? e => e.stopPropagation() : e => startSingleResize(gb.id, "guestbook", e)}
              onRotateMD={gb.locked ? e => e.stopPropagation() : e => startRotate(gb.id, "guestbook", e, gb.x + gb.w / 2, gb.y + gb.h / 2)}
              locked={!!gb.locked}
              canInteract={canInteract}
              ownerUserId={ownerUserId}
              currentUserId={currentUserId}
              currentUserHandle={userHandle}
              onToggleLock={() => enqueueOp({ type: "update_guestbook", id: gb.id, patch: { locked: !gb.locked } })}
            />
          </WidgetBoundary>
        );
      })}

      {view==="canvas"&&groupBounds&&!dragging&&!resizing&&!rotating&&(
        <div style={{position:"absolute",left:groupBounds.x-4,top:groupBounds.y-4,width:groupBounds.w+8,height:groupBounds.h+8,border:"1px dashed rgba(255,255,255,0.1)",borderRadius:6,pointerEvents:"none",zIndex:900}}>
          <div onMouseDown={e=>startGroupResize(e,groupBounds)} style={{position:"absolute",bottom:-5,right:-5,width:10,height:10,borderRadius:"50%",background:"rgba(255,255,255,0.6)",cursor:"nwse-resize",border:"1.5px solid rgba(0,0,0,0.2)",pointerEvents:"all"}} />
        </div>
      )}

      </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {showSignals && (
        <WidgetBoundary label="notifications">
          <NotificationsPanel
            notifications={notifications}
            loading={notifsLoading}
            onClose={() => setShowSignals(false)}
          />
        </WidgetBoundary>
      )}

      {/* ── SOCIAL PANELS ── */}
      {socialPanels.map(panel => (
        <WidgetBoundary key={panel.id} label="social-panel">
          <SocialPanelWindow
            id={panel.id}
            targetUserId={panel.targetUserId}
            targetHandle={panel.targetHandle}
            mode={panel.mode}
            x={panel.x}
            y={panel.y}
            z={panel.z}
            currentUserId={currentUserId}
            onClose={closeSocialPanel}
            onFocus={focusSocialPanel}
            onMove={moveSocialPanel}
          />
        </WidgetBoundary>
      ))}

      {/* ── CARD MENU — fuera de cualquier div con transform para que position:fixed funcione ── */}
      {view==="canvas"&&(()=>{
        if(!cardMenuId||!cardMenuRect)return null;
        const mc=cards.find(c=>c.id===cardMenuId);
        if(!mc)return null;
        return(<CardMenu card={mc} cardMenuTab={cardMenuTab} setCardMenuTab={setCardMenuTab} updateCard={updateCard} bgCardId={bgCardId} bgImageRef={bgImageRef} cardRect={cardMenuRect}/>);
      })()}

      {/* ── Social dock — persistent across all views ── */}
      {canEdit && (
        <WidgetBoundary label="social-dock">
          <SocialDock
            currentUserId={currentUserId}
            openWindow={openWindow}
            totalUnread={totalUnread}
          />
        </WidgetBoundary>
      )}

      {/* ── Trash FAB ── */}
      {!isReadOnly && view === "canvas" && (
      <div ref={trashRef} style={{position:"fixed",bottom:20,right:20,zIndex:1000}}>
        {isActive?(
          <div style={{width:38,height:38,borderRadius:"50%",border:overTrash?"1px solid rgba(255,80,60,0.5)":"1px solid rgba(255,255,255,0.08)",background:overTrash?"rgba(255,50,30,0.15)":"rgba(10,10,12,0.9)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(12px)"}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={overTrash?"rgba(255,100,80,0.9)":"rgba(255,255,255,0.3)"} strokeWidth="1.8" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
            </svg>
          </div>
        ):(
          <button onClick={e=>{e.stopPropagation();setMenuOpen(m=>{if(m)setWallpaperMenuOpen(false);return!m;});}} style={{width:38,height:38,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.08)",background:menuOpen?"rgba(212,240,196,0.1)":"rgba(10,10,12,0.9)",color:menuOpen?"rgba(212,240,196,0.8)":"rgba(255,255,255,0.5)",fontSize:18,cursor:"pointer",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:MONO,transition:"all 0.2s"}}>
            {menuOpen?"×":"+"}
          </button>
        )}
      </div>
      )}

      {!isReadOnly && view === "canvas" && menuOpen&&(
        <div onClick={e=>e.stopPropagation()} style={{position:"fixed",bottom:66,right:20,background:"rgba(10,10,12,0.97)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:6,padding:"4px",backdropFilter:"blur(40px)",zIndex:1000,minWidth:180,boxShadow:"0 16px 48px rgba(0,0,0,0.85)",fontFamily:MONO}}>
          {[
            {label:"New Card",      fn:()=>{setCreatingCard(true);    setMenuOpen(false);}},
            {label:"Free Text",     fn:()=>{setAddingText(true);      setMenuOpen(false);}},
            {label:"Gallery",       fn:()=>{addGallery();             setMenuOpen(false);}},
            {label:"Signal Card",   fn:()=>{addPostItBoard();         setMenuOpen(false);}},
            {label:"Image / GIF",   fn:()=>{imageRef.current?.click();setMenuOpen(false);}},
            {label:"Profile",       fn:()=>{addProfile();             setMenuOpen(false);}},
            {label:"Media",         fn:()=>{addMedia();               setMenuOpen(false);}},
            {label:"Guestbook",     fn:()=>{addGuestbook();           setMenuOpen(false);}},
          ].map(item=>(
            <button key={item.label} onClick={item.fn}
              style={{display:"block",width:"100%",padding:"7px 11px",borderRadius:4,border:"none",background:"transparent",color:"rgba(255,255,255,0.55)",fontSize:9,letterSpacing:1.5,cursor:"pointer",textAlign:"left",fontFamily:MONO,textTransform:"uppercase",transition:"background 0.08s ease, color 0.08s ease"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="rgba(255,255,255,0.88)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.55)";}}>
              {item.label}
            </button>
          ))}
          <div style={{width:"100%",height:1,background:"rgba(255,255,255,0.06)",margin:"3px 0"}} />
          <button onClick={e=>{e.stopPropagation();setWallpaperMenuOpen(o=>!o);}}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"7px 11px",borderRadius:4,border:"none",background:wallpaperMenuOpen?"rgba(255,255,255,0.06)":"transparent",color:wallpaperMenuOpen?"rgba(255,255,255,0.88)":"rgba(255,255,255,0.55)",fontSize:9,letterSpacing:1.5,cursor:"pointer",textAlign:"left",fontFamily:MONO,textTransform:"uppercase",transition:"background 0.08s ease, color 0.08s ease"}}
            onMouseEnter={e=>{if(!wallpaperMenuOpen){e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="rgba(255,255,255,0.88)";}}}
            onMouseLeave={e=>{if(!wallpaperMenuOpen){e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.55)";}}}
          >
            <span>WALLPAPER</span>
            <span style={{opacity:0.4}}>{wallpaperMenuOpen?"▲":"▶"}</span>
          </button>
        </div>
      )}

      {/* ── Wallpaper submenu ── */}
      {!isReadOnly && view === "canvas" && menuOpen && wallpaperMenuOpen && (
        <div onClick={e=>e.stopPropagation()} style={{position:"fixed",bottom:66,right:202,background:"rgba(10,10,12,0.97)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:6,padding:"10px 12px",backdropFilter:"blur(40px)",zIndex:1000,width:200,boxShadow:"0 16px 48px rgba(0,0,0,0.85)",fontFamily:MONO,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontFamily:MONO,fontSize:7,letterSpacing:2.5,color:"rgba(255,255,255,0.18)",textTransform:"uppercase",marginBottom:2}}>BACKGROUND</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div title="Background color" style={{width:26,height:26,borderRadius:5,overflow:"hidden",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",flexShrink:0}}>
              <input type="color" value={bgColor} onChange={e=>{enqueueOp({type:"set_bg",value:e.target.value});enqueueOp({type:"set_wallpaper",value:"" });}} style={{width:"100%",height:"100%",border:"none",cursor:"pointer",padding:2}} />
            </div>
            <span style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,0.3)",letterSpacing:1}}>BACKGROUND COLOR</span>
          </div>
          <WallpaperMenuBtn label="UPLOAD WALLPAPER" onClick={()=>wallpaperRef.current?.click()} />
          {wallpaper&&(<WallpaperMenuBtn label="REMOVE WALLPAPER" onClick={()=>enqueueOp({type:"set_wallpaper",value:""})} />)}
          {(wallpaper||bgColor!=="#0a0a0c")&&(<WallpaperMenuBtn label="RESET TO DEFAULT" onClick={()=>{enqueueOp({type:"set_wallpaper",value:""});enqueueOp({type:"set_bg",value:"#0a0a0c"});}} dim />)}
        </div>
      )}

      {isLoading && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#0a0a0c",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 12,
        }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9,
            letterSpacing: 4, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>
            LOADING
          </div>
        </div>
      )}

      {/* ── Mobile notice — canvas editing requires desktop ── */}
      {canEdit && isMobile && (
        <div style={{
          position:    "fixed",
          bottom:      20,
          left:        "50%",
          transform:   "translateX(-50%)",
          zIndex:      8000,
          background:  "rgba(7,7,9,0.96)",
          border:      "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6,
          padding:     "10px 18px",
          fontFamily:  "'Space Mono', monospace",
          fontSize:    8,
          letterSpacing: 1.8,
          color:       "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          whiteSpace:  "nowrap",
          pointerEvents: "none",
        }}>
          Canvas editing requires a desktop browser
        </div>
      )}

      {/* Global floating chat windows — always visible, no background */}
      {canEdit && (
        <WidgetBoundary label="chats">
          <div style={{ position: "fixed", inset: 0, zIndex: 5000, pointerEvents: "none" }}>
            <ChatsWorkspace
              currentUserId={currentUserId}
              windows={chatWindows}
              openWindow={openWindow}
              closeWindow={closeWindow}
              minimizeWindow={minimizeWindow}
              focusWindow={focusWindow}
              updateWindow={updateWindow}
              onUnreadChange={setTotalUnread}
            />
          </div>
        </WidgetBoundary>
      )}

      {/* ── First-visit onboarding ── */}
      {showOnboarding && (
        <OnboardingOverlay onDone={dismissOnboarding} />
      )}

      {/* Social hub view */}
      {view === "chats" && (
        <WidgetBoundary label="social-view">
          <div style={{
            position: "fixed", inset: 0, top: 44,
            zIndex: 490,
            backgroundColor: homeBg.color || "#0a0a0c",
            ...(homeBg.wallpaper && homeBg.wallpaperLoaded ? {
              backgroundImage: `url(${homeBg.wallpaper})`,
              backgroundRepeat: "repeat",
              backgroundSize: "auto",
            } : {}),
            display: "flex",
            flexDirection: "column",
          }}>
            <SocialView
              currentUserId={currentUserId}
              openWindow={openWindow}
              totalUnread={totalUnread}
            />
          </div>
        </WidgetBoundary>
      )}

    </div>
  );
}

function WallpaperMenuBtn({label,onClick,dim}:{label:string;onClick:()=>void;dim?:boolean}) {
  return (
    <button onClick={onClick}
      style={{display:"block",width:"100%",padding:"6px 0",border:"none",background:"transparent",color:dim?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.55)",fontSize:8,letterSpacing:1.5,cursor:"pointer",textAlign:"left",fontFamily:"'Space Mono',monospace",textTransform:"uppercase",transition:"color 0.08s"}}
      onMouseEnter={e=>{e.currentTarget.style.color=dim?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.88)";}}
      onMouseLeave={e=>{e.currentTarget.style.color=dim?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.55)";}}>
      {label}
    </button>
  );
}

function TBtn({children,onClick,active,title}:{children:React.ReactNode;onClick:()=>void;active?:boolean;title?:string}) {
  return (
    <button onClick={onClick} title={title} style={{width:30,height:30,borderRadius:8,border:"none",background:active?"rgba(212,240,196,0.1)":"transparent",color:active?"rgba(212,240,196,0.8)":"rgba(255,255,255,0.38)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s"}}
      onMouseEnter={e=>{if(!active){e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="rgba(255,255,255,0.75)";}}}
      onMouseLeave={e=>{e.currentTarget.style.background=active?"rgba(212,240,196,0.1)":"transparent";e.currentTarget.style.color=active?"rgba(212,240,196,0.8)":"rgba(255,255,255,0.38)";}}>
      {children}
    </button>
  );
}

function LockBtn({ locked, onClick }: { locked: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      onClick={onClick}
      style={{
        position: "absolute", top: -22, right: 0,
        width: 16, height: 16, borderRadius: 4, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: locked ? "rgba(255,180,60,0.15)" : "rgba(255,255,255,0.06)",
        border: locked ? "1px solid rgba(255,180,60,0.3)" : "1px solid rgba(255,255,255,0.07)",
        color: locked ? "rgba(255,180,60,0.9)" : "rgba(255,255,255,0.32)",
        transition: "all 0.12s",
        zIndex: 10,
      }}
      title={locked ? "destrabar" : "trabar"}
    >
      {locked ? (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ) : (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
      )}
    </div>
  );
}

function RotateHandle({onMouseDown}:{onMouseDown:(e:React.MouseEvent)=>void}) {
  return (
    <div onMouseDown={onMouseDown} style={{position:"absolute",top:-10,right:-10,width:20,height:20,borderRadius:"50%",background:"rgba(12,12,14,0.96)",border:"1px solid rgba(255,255,255,0.1)",cursor:"crosshair",zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.4)",transition:"border-color 0.15s, background 0.15s"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(212,240,196,0.4)";e.currentTarget.style.background="rgba(212,240,196,0.08)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.background="rgba(12,12,14,0.96)";}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/>
      </svg>
    </div>
  );
}