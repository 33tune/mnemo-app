"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CanvasImage as CanvasImageType, CanvasCard, CanvasText, CanvasGallery, ProfileCardData, CanvasMedia, GuestbookCardData, SocialCardData, MusicCardData, LinksCardData, TextFont, CanvasState, CanvasMode, CanvasElement, PublishState, ProfileCardVariant } from "@/types";
import GuestbookWidget from "./GuestbookWidget";
import GuestbookMenu from "./GuestbookMenu";
import SocialCardWidget from "./SocialCardWidget";
import MusicCardWidget from "./MusicCardWidget";
import LinksCardWidget from "./LinksCardWidget";
import MediaCardWidget from "./MediaCardWidget";
import ResizeHandles from "./ResizeHandles";
import { SocialDock } from "./SocialDock";
import Topbar from "./Topbar";
import CardMenu from "./CardMenu";
import GalleryWidget from "./GalleryWidget";
import ProfileCard from "./ProfileCard";
import { renderContent, textColor, isLight } from "./CardContent";
import { useParallax } from "@/hooks/useParallax";
import { useDragDrop } from "@/hooks/useDragDrop";
import type { ResizeHandle } from "@/hooks/useDragDrop";
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
import AnalyticsCanvas from "@/components/analytics/AnalyticsCanvas";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

// Returns true when focus is inside an editable field — used to suppress
// keyboard shortcuts that would conflict with text input.
function isEditingInput(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per image
const LAYER_NAMES = ["Back", "Mid", "Front"] as const;

const CANVAS_H = 3000;
const MOBILE_CANVAS_W = 390;

function isSpaceCanvas(mode: CanvasMode): boolean {
  return mode === "space" || mode === "space_mobile";
}

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
  | { type: "add_media";          media:      CanvasMedia }
  | { type: "update_media";       id: string; patch: Partial<CanvasMedia> }
  | { type: "delete_media";       id: string }
  | { type: "add_guestbook";      guestbook:  GuestbookCardData }
  | { type: "update_guestbook";   id: string; patch: Partial<GuestbookCardData> }
  | { type: "delete_guestbook";   id: string }
  | { type: "add_social";       social:    SocialCardData }
  | { type: "update_social";    id: string; patch: Partial<SocialCardData> }
  | { type: "delete_social";    id: string }
  | { type: "add_music";        music:     MusicCardData }
  | { type: "update_music";     id: string; patch: Partial<MusicCardData> }
  | { type: "delete_music";     id: string }
  | { type: "add_links";        links:     LinksCardData }
  | { type: "update_links";     id: string; patch: Partial<LinksCardData> }
  | { type: "delete_links";     id: string }
  | { type: "set_bg";                    value: string }
  | { type: "set_wallpaper";            value: string }
  | { type: "set_wallpaper_blur";       value: number }
  | { type: "set_wallpaper_brightness"; value: number }
  | { type: "set_wallpaper_vignette";   value: number }
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
    case "add_media":          return [...els, { ...op.media,      elementType: "media"     as const }];
    case "update_media":       return els.map(e => e.elementType==="media"     && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_media":       return els.filter(e => !(e.elementType==="media"     && e.id===op.id));
    case "add_guestbook":      return els.some(e => e.id === op.guestbook.id) ? els : [...els, { ...op.guestbook, elementType: "guestbook" as const }];
    case "update_guestbook":   return els.map(e => e.elementType==="guestbook"  && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_guestbook":   return els.filter(e => !(e.elementType==="guestbook"  && e.id===op.id));
    case "add_social":         return els.some(e => e.id === op.social.id) ? els : [...els, { ...op.social, elementType: "social" as const }];
    case "update_social":      return els.map(e => e.elementType==="social"     && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_social":      return els.filter(e => !(e.elementType==="social"     && e.id===op.id));
    case "add_music":          return els.some(e => e.id === op.music.id) ? els : [...els, { ...op.music, elementType: "music" as const }];
    case "update_music":       return els.map(e => e.elementType==="music"      && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_music":       return els.filter(e => !(e.elementType==="music"      && e.id===op.id));
    case "add_links":          return els.some(e => e.id === op.links.id) ? els : [...els, { ...op.links, elementType: "links" as const }];
    case "update_links":       return els.map(e => e.elementType==="links"      && e.id===op.id ? { ...e, ...op.patch } : e);
    case "delete_links":       return els.filter(e => !(e.elementType==="links"      && e.id===op.id));
    case "move_elements":      return els.map(e => { const m = op.moves.find(m => m.id===e.id); return m ? { ...e, x: m.x, y: m.y } as CanvasElement : e; });
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
  const [wallpaper,            setWallpaper]            = useState("");
  const [wallpaperLoaded,      setWallpaperLoaded]      = useState(true);
  const [wallpaperBlur,        setWallpaperBlur]        = useState(0);
  const [wallpaperBrightness,  setWallpaperBrightness]  = useState(100);
  const [wallpaperVignette,    setWallpaperVignette]    = useState(0);
  const [bgColor,          setBgColor]          = useState("#0a0a0c");
  const [hovLayerKey,      setHovLayerKey]      = useState<string|null>(null);
  const [view,             setView]             = useState<"canvas" | "browse" | "chats" | "analytics">(canEdit ? "analytics" : "canvas");
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
  const [gbMenuId,      setGbMenuId]      = useState<string | null>(null);
  const [gbMenuRect,    setGbMenuRect]    = useState<DOMRect | null>(null);
  const gbBgFileRef   = useRef<HTMLInputElement>(null);
  const gbBgIdRef     = useRef<string | null>(null);
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
  const medias       = useMemo(() => elements.filter(e => e.elementType === "media")       as (CanvasMedia       & { elementType: "media" })[], [elements]);
  const guestbooks   = useMemo(() => elements.filter(e => e.elementType === "guestbook")   as (GuestbookCardData & { elementType: "guestbook" })[], [elements]);
  const socialCards  = useMemo(() => elements.filter(e => e.elementType === "social")      as (SocialCardData    & { elementType: "social" })[], [elements]);
  const musicCards   = useMemo(() => elements.filter(e => e.elementType === "music")       as (MusicCardData     & { elementType: "music" })[], [elements]);
  const linksCards   = useMemo(() => elements.filter(e => e.elementType === "links")       as (LinksCardData     & { elementType: "links" })[], [elements]);

  const trashRef          = useRef<HTMLDivElement>(null);
  const canvasWrapperRef  = useRef<HTMLDivElement>(null);
  const cardDivRefs    = useRef<Record<string, HTMLDivElement | null>>({});
  const bgImageRef     = useRef<HTMLInputElement>(null);
  const bgCardId       = useRef<string | null>(null);
  const wallpaperRef   = useRef<HTMLInputElement>(null);
  const imageRef       = useRef<HTMLInputElement>(null);
  const zCounter       = useRef(10);
  const textElRefs     = useRef<Record<string, HTMLDivElement | null>>({});
  const imgElRefs      = useRef<Map<string, HTMLDivElement>>(new Map());
  const selChangedRef  = useRef(false);
  // ── Keyboard / clipboard / drag ──────────────────────────────────────────────
  const internalClipboard = useRef<CanvasElement[]>([]);
  const undoStackRef      = useRef<Array<() => void>>([]);
  const lastMousePosRef   = useRef({ x: 0, y: 0 });
  const dragCounterRef    = useRef(0);
  // Live refs updated each render so [] effects always see current values
  const elementsRef       = useRef(elements);
  const selIdsRef         = useRef(selectedIds);
  const canInteractRef    = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enqueueOpRef      = useRef<(op: any) => void>(() => {});
  const canvasIdRef       = useRef<string | null>(null);
  const savingRef         = useRef(false);
  const lastSavedStateRef = useRef<CanvasState | null>(null);
  // ── Mode switching ───────────────────────────────────────────────────────────
  const canvasModeRef  = useRef<CanvasMode>("home");
  const canvasIds      = useRef<Record<CanvasMode, string | null>>({ home: null, space: null, space_mobile: null });
  const modeStates     = useRef<Record<CanvasMode, CanvasState | null>>({ home: null, space: null, space_mobile: null });
  // ── Ops queue ────────────────────────────────────────────────────────────────
  const hasLoadedRef       = useRef(false);
  const sessionIdRef       = useRef(0);
  const userInteractedRef  = useRef(false);
  const opsQueueRef  = useRef<QueuedOp[]>([]);
  const flushingRef  = useRef(false);
  const clientIdRef       = useRef(crypto.randomUUID());
  const logicalW          = useRef(typeof window !== "undefined" ? window.innerWidth : 1920);
  const firstEditRef = useRef(false); // fires analytics.canvasEdit once per session

  const isMobile     = useIsMobile();
  const isReadOnly   = !canEdit;
  // Block pointer interactions on touch-only devices — drag/resize/rotate require mouse
  const canInteract  = canEdit && !isMobile;
  const [isDragOver,  setIsDragOver]  = useState(false);
  const [linkEditId,  setLinkEditId]  = useState<string | null>(null);

  // Mobile canvas uses a fixed 390px logical width; desktop uses the screen width
  const effectiveW = canvasMode === "space_mobile" ? MOBILE_CANVAS_W : logicalW.current;

  // ── Viewer scale — fits horizontally-visible content without global zoom-out ──
  const [viewerScale,    setViewerScale]    = useState(1);
  const [viewerContentW, setViewerContentW] = useState(0);
  useEffect(() => {
    if (canEdit) return;
    const compute = () => {
      const vw = window.innerWidth;
      if (elements.length === 0) { setViewerScale(1); setViewerContentW(vw); return; }
      // Only account for elements whose LEFT edge is within the viewport.
      // Elements at x >= vw were placed off-screen (legacy screen.width sizing bug)
      // and should not force a global zoom-out — they stay hidden.
      const candidates = elements.filter(el => (el as any).x < vw);
      const maxRight = candidates.length > 0
        ? candidates.reduce((m, el) => Math.max(m, (el as any).x + ((el as any).w ?? 200)), 0)
        : vw;
      // Canvas is at least as wide as the viewport so nothing shifts left
      const contentW = Math.max(maxRight + 20, vw);
      setViewerContentW(contentW);
      setViewerScale(Math.min(vw / contentW, 1));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [canEdit, elements]);
  // The effective canvas width for edit mode and animation center calculations
  const viewerW = !canEdit && viewerContentW > 0 ? viewerContentW : effectiveW;

  // Live ref assignments — always current by the time any event handler fires
  elementsRef.current    = elements;
  selIdsRef.current      = selectedIds;
  canInteractRef.current = canInteract;

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
      x: Math.max(0, Math.min(effectiveW - w, x)),
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
    canvasBounds: { w: effectiveW, h: CANVAS_H, topOffset: 44 },
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
    if (v === "space") { setView("canvas"); handleModeChange("space"); }
    else if (v === "space_mobile") { setView("canvas"); handleModeChange("space_mobile"); }
    else if (v === "chats") setView("chats");
    else if (v === "analytics") setView("analytics");
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

  // ── Elementos visibles (en space/space_mobile, solo isPublic:true) ──────────
  const inSpace      = isSpaceCanvas(canvasMode);
  const visCards     = useMemo(() => inSpace ? cards.filter(c => c.isPublic)              : cards,        [inSpace, cards]);
  const visImages    = useMemo(() => (inSpace ? images.filter(i => i.isPublic) : images).filter(img => img.src && (img.src.startsWith("http") || img.src.startsWith("blob:"))), [inSpace, images]);
  const visTexts     = useMemo(() => inSpace ? texts.filter(t => t.isPublic)              : texts,        [inSpace, texts]);
  const visGalleries = useMemo(() => inSpace ? galleries.filter(g => g.isPublic)          : galleries,    [inSpace, galleries]);
  const visProfiles  = useMemo(() => inSpace ? profiles.filter(p => p.isPublic)           : profiles,     [inSpace, profiles]);
  const visMedias      = useMemo(() => inSpace ? medias.filter(m => m.isPublic)             : medias,       [inSpace, medias]);
  const visGuestbooks  = useMemo(() => inSpace ? guestbooks.filter(g => g.isPublic)         : guestbooks,   [inSpace, guestbooks]);
  const visSocialCards = useMemo(() => inSpace ? socialCards.filter(c => c.isPublic)        : socialCards,  [inSpace, socialCards]);
  const visMusicCards  = useMemo(() => inSpace ? musicCards.filter(c => c.isPublic)         : musicCards,   [inSpace, musicCards]);
  const visLinksCards  = useMemo(() => inSpace ? linksCards.filter(c => c.isPublic)         : linksCards,   [inSpace, linksCards]);

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
    const sCards       = snapshot.filter(e => e.elementType === "card")      as (CanvasCard        & { elementType: "card" })[];
    const sImages      = snapshot.filter(e => e.elementType === "image")     as (CanvasImageType   & { elementType: "image" })[];
    const sTexts       = snapshot.filter(e => e.elementType === "text")      as (CanvasText        & { elementType: "text" })[];
    const sGalleries   = snapshot.filter(e => e.elementType === "gallery")   as (CanvasGallery     & { elementType: "gallery" })[];
    const sProfiles    = snapshot.filter(e => e.elementType === "profile")   as (ProfileCardData   & { elementType: "profile" })[];
    const sMedias      = snapshot.filter(e => e.elementType === "media")     as (CanvasMedia       & { elementType: "media" })[];
    const sGuestbooks  = snapshot.filter(e => e.elementType === "guestbook") as (GuestbookCardData & { elementType: "guestbook" })[];
    const sSocialCards = snapshot.filter(e => e.elementType === "social")    as (SocialCardData    & { elementType: "social" })[];
    const sMusicCards  = snapshot.filter(e => e.elementType === "music")     as (MusicCardData     & { elementType: "music" })[];
    const sLinksCards  = snapshot.filter(e => e.elementType === "links")     as (LinksCardData     & { elementType: "links" })[];
    return {
      cards:       await Promise.all(sCards.map(async c => ({ ...c, bgImage: await safe(c.bgImage) }))),
      images:      await Promise.all(sImages.map(async i => ({ ...i, src: await safe(i.src) }))),
      texts:       sTexts,
      galleries:   await Promise.all(sGalleries.map(async g => ({ ...g, images: await Promise.all(g.images.map(async gi => ({ ...gi, src: await safe(gi.src) }))) }))),
      profiles:    await Promise.all(sProfiles.map(async p => ({ ...p, photo: await safe(p.photo), bgImage: await safe(p.bgImage) }))),
      medias:      sMedias,
      guestbooks:  sGuestbooks,
      socialCards: sSocialCards,
      musicCards:  sMusicCards,
      linksCards:  sLinksCards,
      bgColor,
      wallpaper:            await safe(wallpaper),
      wallpaperBlur,
      wallpaperBrightness,
      wallpaperVignette,
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
      case "delete_image": {
        console.log("[DELETE_IMAGE OP]", op.id, elements.find(e => e.elementType === "image" && e.id === op.id)?.elementType);
        setElements(p => p.filter(e => !(e.elementType === "image" && e.id === op.id))); break;
      }

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

      case "add_social":
        setElements(p => p.some(e => e.id === op.social.id) ? p : [...p, { ...op.social, elementType: "social" as const }]); break;
      case "update_social":
        setElements(p => p.map(e => e.elementType === "social" && e.id === op.id ? { ...e, ...op.patch } : e)); break;
      case "delete_social":
        setElements(p => p.filter(e => !(e.elementType === "social" && e.id === op.id))); break;

      case "add_music":
        setElements(p => p.some(e => e.id === op.music.id) ? p : [...p, { ...op.music, elementType: "music" as const }]); break;
      case "update_music":
        setElements(p => p.map(e => e.elementType === "music" && e.id === op.id ? { ...e, ...op.patch } : e)); break;
      case "delete_music":
        setElements(p => p.filter(e => !(e.elementType === "music" && e.id === op.id))); break;

      case "add_links":
        setElements(p => p.some(e => e.id === op.links.id) ? p : [...p, { ...op.links, elementType: "links" as const }]); break;
      case "update_links":
        setElements(p => p.map(e => e.elementType === "links" && e.id === op.id ? { ...e, ...op.patch } : e)); break;
      case "delete_links":
        setElements(p => p.filter(e => !(e.elementType === "links" && e.id === op.id))); break;

      case "set_bg":
        setBgColor(op.value);
        if (canvasModeRef.current === "home") setHomeBg(h => ({ ...h, color: op.value }));
        break;
      case "set_wallpaper":
        setWallpaper(op.value); setWallpaperLoaded(true);
        if (canvasModeRef.current === "home") setHomeBg(h => ({ ...h, wallpaper: op.value, wallpaperLoaded: true }));
        break;
      case "set_wallpaper_blur":       setWallpaperBlur(op.value);       break;
      case "set_wallpaper_brightness": setWallpaperBrightness(op.value); break;
      case "set_wallpaper_vignette":   setWallpaperVignette(op.value);   break;
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
    if (op.type === "delete_image") {
      const imgEl = elements.find(e => e.elementType === "image" && e.id === op.id);
      const storagePath = imgEl?.elementType === "image" ? imgEl.storage_path : undefined;
      console.log("[STORAGE DELETE ATTEMPT]", storagePath);
      if (storagePath) {
        createClient().storage.from("canvas-assets").remove([storagePath])
          .then(({ error, data }) => {
            console.log("[STORAGE DELETE RESULT]", { error, data });
          });
      }
    }
    applyOp(op);
    opsQueueRef.current.push({ op, canvas_type: canvasModeRef.current });
    if (isSpaceCanvas(canvasModeRef.current)) {
      setPublishState(s => (s === "publishing" ? s : "pending"));
    }
    markActive(op.type === "update_profile" || isSpaceCanvas(canvasModeRef.current));

    flushOps();
  }
  enqueueOpRef.current = enqueueOp;

  // Close link editor when its image is deselected
  useEffect(() => {
    if (linkEditId !== null && !selectedIds.has(linkEditId)) setLinkEditId(null);
  }, [selectedIds, linkEditId]);

  // ── Keyboard shortcuts (DELETE / Ctrl+C / Ctrl+V / Ctrl+D / Ctrl+Z) ──────────
  useEffect(() => {
    // Viewport → canvas coordinate conversion (accounts for scroll)
    function toCanvasPos(clientX: number, clientY: number) {
      const rect   = canvasWrapperRef.current?.getBoundingClientRect();
      const scroll = canvasWrapperRef.current?.parentElement?.scrollTop ?? 0;
      if (!rect) return null;
      return { x: clientX - rect.left, y: clientY - rect.top + scroll };
    }

    const MAX_UNDO = 50;

    function pushUndo(fn: () => void) {
      undoStackRef.current.push(fn);
      if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
    }

    // Paste items centered on mousePos (or +24px offset).
    // Pushes an undo entry that deletes the newly created elements.
    function pasteItems(items: CanvasElement[], mousePos: { x: number; y: number } | null) {
      if (!items.length) return;
      let dx = 24, dy = 24;
      if (mousePos) {
        const xs = items.map(el => (el as { x: number }).x);
        const ys = items.map(el => (el as { y: number }).y);
        const ws = items.map(el => (el as { w?: number }).w ?? 0);
        const hs = items.map(el => (el as { h?: number }).h ?? 0);
        const cx = (Math.min(...xs) + Math.max(...xs.map((x, i) => x + ws[i]))) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys.map((y, i) => y + hs[i]))) / 2;
        dx = mousePos.x - cx;
        dy = mousePos.y - cy;
      }
      const newIds: string[] = [];
      items.forEach(el => {
        const newId = crypto.randomUUID();
        newIds.push(newId);
        zCounter.current += 1;
        const base = {
          ...el, id: newId,
          x: (el as { x: number }).x + dx,
          y: (el as { y: number }).y + dy,
          zIndex: zCounter.current,
          // Don't inherit storage_path: pasted images share the src URL with the
          // original; if the copy is deleted we must not remove the shared file.
          ...(el.elementType === "image" ? { storage_path: undefined, isLocal: false } : {}),
        };
        if      (el.elementType === "card")    enqueueOpRef.current({ type: "add_card",    card:    base as CanvasCard });
        else if (el.elementType === "image")   enqueueOpRef.current({ type: "add_image",   image:   base as CanvasImageType });
        else if (el.elementType === "text")    enqueueOpRef.current({ type: "add_text",    text:    base as CanvasText });
        else if (el.elementType === "gallery") enqueueOpRef.current({ type: "add_gallery", gallery: base as CanvasGallery });
        else if (el.elementType === "media")   enqueueOpRef.current({ type: "add_media",   media:   base as CanvasMedia });
      });
      setSelectedIds(new Set(newIds));
      // Undo: delete everything we just added
      pushUndo(() => {
        newIds.forEach(id => {
          const el = elementsRef.current.find(e => e.id === id);
          if (!el) return;
          if      (el.elementType === "card")    enqueueOpRef.current({ type: "delete_card",    id });
          else if (el.elementType === "image")   enqueueOpRef.current({ type: "delete_image",   id });
          else if (el.elementType === "text")    enqueueOpRef.current({ type: "delete_text",    id });
          else if (el.elementType === "gallery") enqueueOpRef.current({ type: "delete_gallery", id });
          else if (el.elementType === "media")   enqueueOpRef.current({ type: "delete_media",   id });
        });
        setSelectedIds(new Set());
      });
    }

    function handler(e: KeyboardEvent) {
      if (!canInteractRef.current) return;
      if (isEditingInput()) return;

      // DELETE / BACKSPACE — same path as trash: enqueueOp handles storage + DB cleanup
      if (e.key === "Delete" || e.key === "Backspace") {
        const ids = selIdsRef.current;
        if (!ids.size) return;
        // Snapshot before deleting so the undo fn can re-add them
        const snapshot = structuredClone(elementsRef.current.filter(el => ids.has(el.id)));
        snapshot.forEach(el => {
          if      (el.elementType === "image")   enqueueOpRef.current({ type: "delete_image",   id: el.id });
          else if (el.elementType === "card")    enqueueOpRef.current({ type: "delete_card",    id: el.id });
          else if (el.elementType === "text")    enqueueOpRef.current({ type: "delete_text",    id: el.id });
          else if (el.elementType === "gallery") enqueueOpRef.current({ type: "delete_gallery", id: el.id });
          else if (el.elementType === "profile") enqueueOpRef.current({ type: "delete_profile", id: el.id });
          else if (el.elementType === "media")   enqueueOpRef.current({ type: "delete_media",   id: el.id });
        });
        setSelectedIds(new Set());
        // Undo: re-add everything that was deleted
        pushUndo(() => {
          snapshot.forEach(el => {
            if      (el.elementType === "card")    enqueueOpRef.current({ type: "add_card",    card:    el as CanvasCard });
            else if (el.elementType === "image")   enqueueOpRef.current({ type: "add_image",   image:   el as CanvasImageType });
            else if (el.elementType === "text")    enqueueOpRef.current({ type: "add_text",    text:    el as CanvasText });
            else if (el.elementType === "gallery") enqueueOpRef.current({ type: "add_gallery", gallery: el as CanvasGallery });
            else if (el.elementType === "profile") enqueueOpRef.current({ type: "add_profile", profile: el as ProfileCardData });
            else if (el.elementType === "media")   enqueueOpRef.current({ type: "add_media",   media:   el as CanvasMedia });
          });
          setSelectedIds(new Set(snapshot.map(e => e.id)));
        });
        return;
      }

      // Ctrl+C — deep-clone selection into internal clipboard (ProfileCards excluded)
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const ids = selIdsRef.current;
        if (!ids.size) return;
        internalClipboard.current = structuredClone(
          elementsRef.current.filter(el => ids.has(el.id) && el.elementType !== "profile")
        );
        return;
      }

      // Ctrl+V — paste clipboard elements centered at current mouse position
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        const items = internalClipboard.current;
        if (!items.length) return;
        e.preventDefault();
        const m = lastMousePosRef.current;
        pasteItems(items, m.x || m.y ? toCanvasPos(m.x, m.y) : null);
        return;
      }

      // Ctrl+D — duplicate selection centered at current mouse position
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        const ids = selIdsRef.current;
        if (!ids.size) return;
        const toDup = structuredClone(
          elementsRef.current.filter(el => ids.has(el.id) && el.elementType !== "profile")
        );
        if (!toDup.length) return;
        const m = lastMousePosRef.current;
        pasteItems(toDup, m.x || m.y ? toCanvasPos(m.x, m.y) : null);
        return;
      }

      // Ctrl+Z — undo last tracked action
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undoStackRef.current.pop()?.();
        return;
      }

      // Escape — clear selection
      if (e.key === "Escape") {
        setSelectedIds(new Set());
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Paste image from clipboard (screenshots, Discord, etc.) ──────────────────
  useEffect(() => {
    function handler(e: ClipboardEvent) {
      if (!canInteractRef.current) return;
      if (isEditingInput()) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageFiles = items
        .filter(item => item.kind === "file" && item.type.startsWith("image/"))
        .map(item => item.getAsFile())
        .filter((f): f is File => f !== null);
      if (!imageFiles.length) return;
      e.preventDefault();
      const { x, y } = lastMousePosRef.current;
      const pos = canvasWrapperRef.current
        ? { x: x - canvasWrapperRef.current.getBoundingClientRect().left, y: y - canvasWrapperRef.current.getBoundingClientRect().top + (canvasWrapperRef.current.parentElement?.scrollTop ?? 0) }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      processImageFiles(imageFiles, pos);
    }
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      opsQueueRef.current   = [];
      undoStackRef.current  = [];
      canvasIdRef.current   = null;
      setLinkEditId(null);

      // Read-only mode: load from initialState
      if (!canEdit) {
        if (initialState) {
          setElements([
            ...(initialState.cards        ?? []).map(c => ({ ...c, elementType: "card"      as const })),
            ...(initialState.images       ?? []).map(i => ({ ...i, elementType: "image"     as const })),
            ...(initialState.texts        ?? []).map(t => ({ ...t, elementType: "text"      as const })),
            ...(initialState.galleries    ?? []).map(g => ({ ...g, elementType: "gallery"   as const })),
            ...(initialState.profiles     ?? []).map(p => ({ ...p, elementType: "profile"   as const })),
            ...(initialState.medias       ?? []).map(m => ({ ...m, elementType: "media"     as const })),
            ...(initialState.guestbooks   ?? []).map(g => ({ ...g, elementType: "guestbook" as const })),
            ...(initialState.socialCards  ?? []).map(c => ({ ...c, elementType: "social"    as const })),
            ...(initialState.musicCards   ?? []).map(c => ({ ...c, elementType: "music"     as const })),
            ...(initialState.linksCards   ?? []).map(c => ({ ...c, elementType: "links"     as const })),
          ]);
          if (initialState.bgColor)   setBgColor(initialState.bgColor);
          if (initialState.wallpaper) { setWallpaper(initialState.wallpaper); setWallpaperLoaded(true); }
          if (initialState.wallpaperBlur       != null) setWallpaperBlur(initialState.wallpaperBlur);
          if (initialState.wallpaperBrightness != null) setWallpaperBrightness(initialState.wallpaperBrightness);
          if (initialState.wallpaperVignette   != null) setWallpaperVignette(initialState.wallpaperVignette);
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
          ...(s.cards        ?? []).map(c => ({ ...c, elementType: "card"      as const })),
          ...(s.images       ?? []).map(i => ({ ...i, elementType: "image"     as const })),
          ...(s.texts        ?? []).map(t => ({ ...t, elementType: "text"      as const })),
          ...(s.galleries    ?? []).map(g => ({ ...g, elementType: "gallery"   as const })),
          ...(s.profiles     ?? []).map(p => ({ ...p, elementType: "profile"   as const })),
          ...(s.medias       ?? []).map(m => ({ ...m, elementType: "media"     as const })),
          ...(s.guestbooks   ?? []).map(g => ({ ...g, elementType: "guestbook" as const })),
          ...(s.socialCards  ?? []).map(c => ({ ...c, elementType: "social"    as const })),
          ...(s.musicCards   ?? []).map(c => ({ ...c, elementType: "music"     as const })),
          ...(s.linksCards   ?? []).map(c => ({ ...c, elementType: "links"     as const })),
        ].filter(el => el.elementType !== "image" || ((el as { src?: string }).src && (el as { src?: string }).src !== ""));
        newElements = newElements.map(e => {
          if (e.elementType === "image" && e.src?.includes("/canvas-assets/") && !e.storage_path) {
            return { ...e, storage_path: e.src.split("/canvas-assets/")[1]?.split("?")[0] };
          }
          return e;
        });
        if (s.bgColor)   setBgColor(s.bgColor);
        if (s.wallpaper) { setWallpaper(s.wallpaper); setWallpaperLoaded(true); }
        if (s.wallpaperBlur       != null) setWallpaperBlur(s.wallpaperBlur);
        if (s.wallpaperBrightness != null) setWallpaperBrightness(s.wallpaperBrightness);
        if (s.wallpaperVignette   != null) setWallpaperVignette(s.wallpaperVignette);
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
    setGbMenuId(null);   setGbMenuRect(null);
    setEditingId(null);  setEditingTextId(null);
    setCreatingCard(false); setAddingText(false);

    // El useEffect([canvasMode]) se encarga del flush + reset + load
    setCanvasMode(newMode);
  }

  // Wrapper: exiting browse/chats mode when switching HOME/MY LAND
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
    hits.sort((a, b) => b.z - a.z);
    return hits;
  }

  function findElementById(id: string): { id: string; type: "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook"; x: number; y: number } | null {
    const img = images.find(i => i.id === id); if (img) return { id: img.id, type: "image", x: img.x, y: img.y };
    const card = cards.find(c => c.id === id); if (card) return { id: card.id, type: "card", x: card.x, y: card.y };
    const txt = texts.find(t => t.id === id); if (txt) return { id: txt.id, type: "text", x: txt.x, y: txt.y };
    const gal = galleries.find(g => g.id === id); if (gal) return { id: gal.id, type: "gallery", x: gal.x, y: gal.y };
    const prof = profiles.find(p => p.id === id); if (prof) return { id: prof.id, type: "profile", x: prof.x, y: prof.y };
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
  function updateMedia(id: string, patch: Partial<CanvasMedia>) { enqueueOp({ type: "update_media", id, patch }); }
  function updateGuestbook(id: string, patch: Partial<GuestbookCardData>) { enqueueOp({ type: "update_guestbook", id, patch }); }
  function updateSocialCard(id: string, patch: Partial<SocialCardData>) { enqueueOp({ type: "update_social", id, patch }); }
  function updateMusicCard(id: string, patch: Partial<MusicCardData>) { enqueueOp({ type: "update_music", id, patch }); }
  function updateLinksCard(id: string, patch: Partial<LinksCardData>) { enqueueOp({ type: "update_links", id, patch }); }

  function resolveModuleStyle<T extends { stackId?: string; bgColor?: string; bgImage?: string; bgMode?: "cover" | "repeat"; borderRadius?: number; variant?: ProfileCardVariant; opacity?: number; effects?: import("@/types").CardEffects }>(card: T): T {
    if (!card.stackId) return card;
    const anchor = profiles.find(p => p.stackId === card.stackId && p.isStackAnchor);
    if (!anchor) return card;

    // If module has own effects, keep them. Otherwise inherit from anchor (minus interactions/animations).
    const inheritedEffects: import("@/types").CardEffects | undefined = card.effects
      ? card.effects
      : anchor.effects
        ? {
            bg:       anchor.effects.bg,
            border:   anchor.effects.border,
            gradient: anchor.effects.gradient,
            glow:     anchor.effects.glow
              ? { ...anchor.effects.glow, intensity: (anchor.effects.glow.intensity ?? 0) * 0.6 }
              : undefined,
            shadow:   anchor.effects.shadow,
          }
        : undefined;

    return {
      ...card,
      effects:      inheritedEffects,
      bgColor:      card.bgColor      !== undefined ? card.bgColor      : anchor.bgColor,
      bgImage:      card.bgImage      !== undefined ? card.bgImage      : anchor.bgImage,
      bgMode:       card.bgMode       !== undefined ? card.bgMode       : anchor.bgMode,
      borderRadius: card.borderRadius !== undefined ? card.borderRadius : anchor.borderRadius,
      variant:      card.variant      !== undefined ? card.variant      : anchor.variant,
      opacity:      card.opacity      !== undefined ? card.opacity      : anchor.opacity,
    };
  }

  function handleAddModule(profileId: string, moduleType: "social" | "music" | "links") {
    if (!canInteract) return;
    const prof = elements.find(e => e.elementType === "profile" && e.id === profileId) as (ProfileCardData & { elementType: "profile" }) | undefined;
    if (!prof) return;

    // Ensure ProfileCard has a stackId and isStackAnchor
    const stackId = prof.stackId ?? crypto.randomUUID();
    if (!prof.stackId) enqueueOp({ type: "update_profile", id: profileId, patch: { stackId, isStackAnchor: true } });

    // Find lowest Y among existing stack members to position new card below all
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stackEls = elements.filter(e => (e as any).stackId === stackId);
    const bottomY = stackEls.reduce((acc, e) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const elH = (e as any).h ?? 0;
      return Math.max(acc, e.y + elH);
    }, prof.y + prof.h);

    zCounter.current += 1;
    const newX = prof.x;
    const newY = bottomY + 14;
    const base = {
      id: crypto.randomUUID(), x: newX, y: newY,
      w: prof.w, zIndex: zCounter.current, layer: prof.layer, depth: prof.depth, rotation: 0,
      stackId,
      bgColor: prof.bgColor, bgImage: prof.bgImage, bgMode: prof.bgMode,
      borderRadius: prof.borderRadius, opacity: prof.opacity, variant: prof.variant,
      isPublic: prof.isPublic,
    };

    if (moduleType === "social") {
      const s: SocialCardData = { ...base, h: 80, socialLinks: [] };
      enqueueOp({ type: "add_social", social: s });
      setSelectedIds(new Set([s.id]));
    } else if (moduleType === "music") {
      const m: MusicCardData = { ...base, h: 72, musicUrl: "" };
      enqueueOp({ type: "add_music", music: m });
      setSelectedIds(new Set([m.id]));
    } else {
      const l: LinksCardData = { ...base, h: 120, links: [] };
      enqueueOp({ type: "add_links", links: l });
      setSelectedIds(new Set([l.id]));
    }
  }

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

  function addGuestbook() {
    if (!canInteract) return;
    if (guestbooks.length > 0) return;
    zCounter.current += 1;
    const vc = viewCenter();
    const { x: gx, y: gy } = clampToViewport(vc.x + (Math.random() - 0.5) * 300, vc.y + (Math.random() - 0.5) * 200, 300, 420);
    const g: GuestbookCardData = {
      id: crypto.randomUUID(), x: gx, y: gy,
      w: 300, h: 420, zIndex: zCounter.current, layer: 1, depth: 0.5, rotation: 0,
      borderRadius: 16, opacity: 1,
      isPublic: inSpace ? true : undefined,
    };
    enqueueOp({ type: "add_guestbook", guestbook: g });
    setSelectedIds(new Set([g.id]));
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

  function onElementMouseDown(id: string, type: "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook"|"social"|"music"|"links", x: number, y: number, e: React.MouseEvent) {
    if (!canInteract) return;
    userInteractedRef.current = true;
    if (creatingCard||addingText) return;
    e.preventDefault(); e.stopPropagation();
    setSelRect(null); setCardMenuId(null); setCardMenuRect(null); setGbMenuId(null); setGbMenuRect(null); setEditingId(null);
    selChangedRef.current = false;

    // Helper: gather follower IDs for a stack anchor
    function getFollowerIds(dragId: string, dragType: string): string[] | undefined {
      if (dragType !== "profile") return undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profEl = elements.find(e => e.elementType === "profile" && e.id === dragId) as any;
      if (profEl?.isStackAnchor && profEl.stackId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return elements.filter(e => (e as any).stackId === profEl.stackId && e.id !== dragId).map(e => e.id);
      }
      return undefined;
    }

    if (e.shiftKey) {
      const cur=new Set(selectedIds);
      if(cur.has(id))cur.delete(id);else cur.add(id);
      setSelectedIds(cur);
      startDrag(id,type,x,y,e,cur,getFollowerIds(id,type));
      return;
    }

    // If a selected element exists at the click point, drag it — don't change selection
    if (selectedIds.size > 0) {
      const hits = getElementsAtPoint(e.clientX, e.clientY);
      const selHit = hits.find(h => selectedIds.has(h.id));
      if (selHit) {
        const sel = findElementById(selHit.id);
        if (sel) { startDrag(sel.id, sel.type, sel.x, sel.y, e, selectedIds, getFollowerIds(sel.id, sel.type)); return; }
      }
    }

    // No selected element at point → select topmost (id) and drag it
    const newSel = new Set([id]);
    setSelectedIds(newSel);
    selChangedRef.current = true;
    startDrag(id, type, x, y, e, newSel, getFollowerIds(id, type));
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
    if (!canInteract) {
      const imgEl = elements.find(el => el.id === id && el.elementType === "image");
      if (imgEl?.elementType === "image") {
        const link = imgEl.linkUrl;
        if (link && (link.startsWith("https://") || link.startsWith("http://"))) {
          window.open(link, "_blank", "noopener,noreferrer");
        }
      }
      return;
    }
    if (e.shiftKey) {
      selChangedRef.current = true;
      setSelectedIds(prev => { const ns = new Set(prev); if (ns.has(id)) ns.delete(id); else ns.add(id); return ns; });
      return;
    }
    if (selChangedRef.current) { selChangedRef.current = false; return; }
    if (!clickThrough(id, e)) setSelectedIds(new Set([id]));
  }

  function onGlobalMouseMove(e: React.MouseEvent) {
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
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
        visProfiles.forEach(p    => { if(hit(p.x,p.y,p.w,p.h)) ns.add(p.id); });
        visMedias.forEach(m      => { if(hit(m.x,m.y,m.w,m.h)) ns.add(m.id); });
        visGuestbooks.forEach(g  => { if(hit(g.x,g.y,g.w,g.h)) ns.add(g.id); });
        setSelectedIds(ns);
      } else setSelectedIds(new Set());
      setSelRect(null);
      return;
    }

    // Capture what's about to be deleted before handleDragUp removes them
    const toDelete: Array<{ id: string; type: "image"|"card"|"text"|"gallery"|"profile"|"media"|"guestbook"|"social"|"music"|"links" }> = [];
    if (dragging && overTrash) {
      images.forEach(i      => { if (selectedIds.has(i.id))  toDelete.push({ id: i.id,  type: "image"     }); });
      cards.forEach(c       => { if (selectedIds.has(c.id))  toDelete.push({ id: c.id,  type: "card"      }); });
      texts.forEach(t       => { if (selectedIds.has(t.id))  toDelete.push({ id: t.id,  type: "text"      }); });
      galleries.forEach(g   => { if (selectedIds.has(g.id)) toDelete.push({ id: g.id,  type: "gallery"   }); });
      profiles.forEach(p    => { if (selectedIds.has(p.id)) toDelete.push({ id: p.id,  type: "profile"   }); });
      medias.forEach(m      => { if (selectedIds.has(m.id))  toDelete.push({ id: m.id,  type: "media"     }); });
      guestbooks.forEach(g  => { if (selectedIds.has(g.id)) toDelete.push({ id: g.id,  type: "guestbook" }); });
      socialCards.forEach(s => { if (selectedIds.has(s.id)) toDelete.push({ id: s.id,  type: "social"    }); });
      musicCards.forEach(m  => { if (selectedIds.has(m.id)) toDelete.push({ id: m.id,  type: "music"     }); });
      linksCards.forEach(l  => { if (selectedIds.has(l.id)) toDelete.push({ id: l.id,  type: "links"     }); });
    }

    if (dragging && overTrash) setSelectedIds(new Set());
    const result = handleDragUp(selectedIds);

    if (canEdit) {
      if (result.wasDeleted) {
        toDelete.forEach(({ id, type }) => {
          if (type === "image") {
            console.log("[ENQUEUE DELETE_IMAGE]", id);
            enqueueOp({ type: "delete_image", id });
          }
          else if (type === "card")    enqueueOp({ type: "delete_card",    id });
          else if (type === "text")    enqueueOp({ type: "delete_text",    id });
          else if (type === "gallery") enqueueOp({ type: "delete_gallery", id });
          else if (type === "profile") enqueueOp({ type: "delete_profile", id });
          else if (type === "media")      enqueueOp({ type: "delete_media",     id });
          else if (type === "guestbook") enqueueOp({ type: "delete_guestbook", id });
          else if (type === "social")    enqueueOp({ type: "delete_social",    id });
          else if (type === "music")     enqueueOp({ type: "delete_music",     id });
          else if (type === "links")     enqueueOp({ type: "delete_links",     id });
        });
      } else if (result.moved.length === 1) {
        const { id, type, x, y, startX, startY } = result.moved[0];
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
        if (type === "image")        enqueueOp({ type: "update_image",      id, patch });
        else if (type === "card")    enqueueOp({ type: "update_card",       id, patch });
        else if (type === "text")    enqueueOp({ type: "update_text",       id, patch });
        else if (type === "gallery") enqueueOp({ type: "update_gallery",    id, patch });
        else if (type === "profile") enqueueOp({ type: "update_profile",    id, patch });
        else if (type === "media")      enqueueOp({ type: "update_media",     id, patch });
        else if (type === "guestbook") enqueueOp({ type: "update_guestbook", id, patch });
        else if (type === "social")    enqueueOp({ type: "update_social",    id, patch });
        else if (type === "music")     enqueueOp({ type: "update_music",     id, patch });
        else if (type === "links")     enqueueOp({ type: "update_links",     id, patch });
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
            const xPatch = safeNum(dims.x, -100_000);
            const yPatch = safeNum(dims.y, -100_000);
            const posPatch = (xPatch !== undefined && yPatch !== undefined) ? { x: xPatch, y: yPatch } : {};
            if (type === "image")        enqueueOp({ type: "update_image",      id, patch: { w, h, ...posPatch } });
            else if (type === "card")    enqueueOp({ type: "update_card",       id, patch: { w, h, ...posPatch } });
            else if (type === "gallery") enqueueOp({ type: "update_gallery",    id, patch: { w, h, ...posPatch } });
            else if (type === "profile") enqueueOp({ type: "update_profile",    id, patch: { w, h, ...posPatch } });
            else if (type === "media")   enqueueOp({ type: "update_media",      id, patch: { w, h, ...posPatch } });
            else if (type === "guestbook") enqueueOp({ type: "update_guestbook", id, patch: { w, h, ...posPatch } });
            else if (type === "social")    enqueueOp({ type: "update_social",    id, patch: { w, h, ...posPatch } });
            else if (type === "music")     enqueueOp({ type: "update_music",     id, patch: { w, h, ...posPatch } });
            else if (type === "links")     enqueueOp({ type: "update_links",     id, patch: { w, h, ...posPatch } });
          }
        }
      }

      // Snap-to-stack magnetism: after any drag, align consecutive stack members with gap < 60px to 14px
      if (!result.wasDeleted && result.moved.length > 0) {
        // Find all affected stackIds
        const affectedStackIds = new Set<string>();
        result.moved.forEach(m => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const el = elements.find(e => e.id === m.id) as any;
          if (el?.stackId) affectedStackIds.add(el.stackId);
        });

        affectedStackIds.forEach(stackId => {
          // Gather all elements in this stack, sorted by Y
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stackEls = elements.filter(e => (e as any).stackId === stackId)
            .sort((a, b) => a.y - b.y)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map(e => ({ id: e.id, elementType: e.elementType, x: e.x, y: e.y, h: (e as any).h ?? 0 }));

          const snaps: Array<{ id: string; elementType: string; x: number; y: number }> = [];
          for (let i = 0; i < stackEls.length - 1; i++) {
            const curr = stackEls[i];
            const next = stackEls[i + 1];
            const gap = next.y - (curr.y + curr.h);
            if (gap >= 0 && gap < 60) {
              const targetY = curr.y + curr.h + 14;
              const shift = targetY - next.y;
              // Cascade: shift all subsequent elements
              for (let j = i + 1; j < stackEls.length; j++) {
                stackEls[j] = { ...stackEls[j], y: stackEls[j].y + shift };
                const existing = snaps.find(s => s.id === stackEls[j].id);
                if (existing) existing.y = stackEls[j].y;
                else snaps.push({ id: stackEls[j].id, elementType: stackEls[j].elementType, y: stackEls[j].y, x: stackEls[j].x });
              }
            }
          }

          if (snaps.length > 0) {
            setElements(p => p.map(el => {
              const s = snaps.find(snap => snap.id === el.id);
              return s ? { ...el, y: s.y } as CanvasElement : el;
            }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            enqueueOp({ type: "move_elements", moves: snaps.map(s => ({ id: s.id, elementType: s.elementType as any, x: s.x, y: s.y })) });
          }
        });
      }
    }
  }

  function processImageFiles(files: File[], dropPos?: { x: number; y: number }) {
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) continue;
      const localUrl = URL.createObjectURL(f);
      const id = crypto.randomUUID();
      const isGif = f.type === "image/gif";
      const el = new Image();
      el.onload = () => {
        const maxW = Math.min(el.naturalWidth, 420), ratio = el.naturalHeight / el.naturalWidth;
        const cx = dropPos?.x ?? (window.innerWidth / 2 + (Math.random() - 0.5) * 400);
        const cy = dropPos?.y ?? (window.innerHeight / 2 + (Math.random() - 0.5) * 200);
        zCounter.current += 1;
        const newImg: CanvasImageType = {
          id, src: localUrl, isLocal: true,
          ...clampToViewport(cx - maxW / 2, cy - Math.round(maxW * ratio) / 2, maxW, Math.round(maxW * ratio)),
          w: maxW, h: Math.round(maxW * ratio),
          naturalW: el.naturalWidth, naturalH: el.naturalHeight,
          isTransparent: f.type !== "image/jpeg",
          zIndex: zCounter.current, layer: isGif ? 1 : 0,
          depth: 0.5, rotation: 0,
          isPublic: isSpaceCanvas(canvasModeRef.current) ? true : undefined,
        };
        enqueueOpRef.current({ type: "add_image", image: newImg });
        const uploadSession = sessionIdRef.current;
        uploadToStorage(f)
          .then(({ publicUrl, storagePath }) => {
            if (!publicUrl) { enqueueOpRef.current({ type: "delete_image", id }); return; }
            if (uploadSession !== sessionIdRef.current) { URL.revokeObjectURL(localUrl); return; }
            enqueueOpRef.current({ type: "update_image", id, patch: { src: publicUrl, isLocal: false, storage_path: storagePath } });
            URL.revokeObjectURL(localUrl);
          })
          .catch(() => { enqueueOpRef.current({ type: "delete_image", id }); URL.revokeObjectURL(localUrl); });
      };
      el.src = localUrl;
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!canInteract) return;
    if (!canvasIdRef.current) return;
    processImageFiles(Array.from(e.target.files || []));
    setMenuOpen(false);
    if (imageRef.current) imageRef.current.value = "";
  }

  async function handleBgImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0];
    if(!f||!bgCardId.current)return;
    const { publicUrl: src } = await uploadToStorage(f);
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
  const wallpaperFilter = [
    wallpaperBlur > 0        ? `blur(${wallpaperBlur}px)`             : "",
    wallpaperBrightness !== 100 ? `brightness(${wallpaperBrightness}%)` : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="grain" style={{
      position: "relative",
      minHeight: "100vh",
      width: "100%",
      overflowX: "hidden",
      display: "flex", alignItems: "flex-start",
      cursor: addingText?"text":rotating?"crosshair":creatingCard?"crosshair":dragging?"grabbing":"default",
      fontFamily: SANS,
    }}
      onMouseMove={onGlobalMouseMove} onMouseUp={onGlobalMouseUp} onClick={onCanvasClick}>
      {/* ── Fixed background layers ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundColor: bgColor }}>
        {wallpaper && wallpaperLoaded && (
          <div style={{
            position: "absolute",
            inset: wallpaperBlur > 0 ? `-${wallpaperBlur * 2}px` : 0,
            backgroundImage: `url(${wallpaper})`,
            backgroundSize: "auto",
            backgroundRepeat: "repeat",
            filter: wallpaperFilter || undefined,
            transition: "background-image 0.2s ease",
          }} />
        )}
        {wallpaperVignette > 0 && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `radial-gradient(ellipse at center, transparent ${Math.max(0, 85 - wallpaperVignette * 0.7)}%, rgba(0,0,0,${(wallpaperVignette / 100) * 0.92}) 100%)`,
          }} />
        )}
      </div>
      <Topbar
        wallpaper={wallpaper}
        handle={userHandle}
        onLogout={canEdit ? handleLogout : undefined}
        canvasMode={canEdit ? canvasMode : (viewerLoggedIn ? "space" : undefined)}
        onModeChange={canEdit
          ? async (mode: CanvasMode) => { setView("canvas"); await handleModeChange(mode); }
          : (viewerLoggedIn ? async (mode: CanvasMode) => { router.push(isSpaceCanvas(mode) ? `/dashboard?view=${mode}` : "/dashboard"); } : undefined)}
        publishState={canEdit && isSpaceCanvas(canvasMode) && view === "canvas" ? publishState : undefined}
        onPublish={canEdit && isSpaceCanvas(canvasMode) && view === "canvas" ? publishSpace : undefined}
        isChats={view === "chats"}
        onChats={canEdit ? () => setView("chats") : (viewerLoggedIn ? () => router.push("/dashboard?view=chats") : undefined)}
        unreadChats={totalUnread}
        unreadSignals={canEdit ? unreadCount : undefined}
        onSignals={canEdit ? () => { if (!showSignals) markAllRead(); setShowSignals(s => !s); } : undefined}
        isAnalytics={view === "analytics"}
        onAnalytics={canEdit ? () => setView("analytics") : undefined}
      />

      {view==="canvas"&&(creatingCard||rotating||addingText)&&(
        <div style={{position:"fixed",top:58,left:"50%",transform:"translateX(-50%)",background:"rgba(10,10,12,0.92)",color:"rgba(255,255,255,0.4)",padding:"5px 14px",borderRadius:6,zIndex:700,fontFamily:MONO,fontSize:9,letterSpacing:2,textTransform:"uppercase",border:"1px solid rgba(255,255,255,0.06)",pointerEvents:"none"}}>
          {addingText?"click to place text":rotating?"rotating":"draw the area"}
        </div>
      )}

      <input ref={wallpaperRef} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files?.[0];if(f){const {publicUrl}=await uploadToStorage(f);enqueueOp({type:"set_wallpaper",value:publicUrl});}}} />
      <input ref={imageRef} type="file" accept="image/*,image/gif" multiple style={{display:"none"}} onChange={handleImageUpload} />
      <input ref={bgImageRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleBgImage} />

      {/* ── Canvas content wrapper ── */}
      {!canEdit && (
        <style>{`
          @keyframes el-reveal {
            from { opacity: 0; translate: var(--from-x, 0px) var(--from-y, 0px); scale: 0.78; }
            to   { opacity: 1; translate: 0px 0px; scale: 1; }
          }
          @keyframes land-reveal {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes el-reveal   { from { opacity: 0; } to { opacity: 1; } }
            @keyframes land-reveal { from { opacity: 0; } to { opacity: 1; } }
          }
        `}</style>
      )}
      {view === "canvas" && (
      <div suppressHydrationWarning style={{
        position: "relative", zIndex: 1, flexShrink: 0,
        ...(canvasMode === "space_mobile" ? {
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 16,
          width: "100%",
        } : {}),
      }}>
      {/* Phone chrome shown in space_mobile editor */}
      {canvasMode === "space_mobile" && canEdit && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: MOBILE_CANVAS_W, padding: "6px 12px", marginBottom: 0,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none", borderRadius: "16px 16px 0 0",
          fontFamily: MONO, fontSize: 8, letterSpacing: 1.5, color: "rgba(255,255,255,0.3)",
        }}>
          <span>390px</span>
          <span style={{ width: 32, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", display: "block", margin: "0 auto" }} />
          <span>MOBILE</span>
        </div>
      )}
      {/* ── Viewer scale wrapper: reserves correct document-flow dimensions while canvas is CSS-scaled ── */}
      <div suppressHydrationWarning style={!canEdit ? {
        width: viewerContentW > 0 ? viewerW * viewerScale : "100%",
        minHeight: CANVAS_H * viewerScale,
        position: "relative",
        flexShrink: 0,
        overflow: "visible",
      } : { display: "contents" }}>
      <div ref={canvasWrapperRef} suppressHydrationWarning style={{
        position: !canEdit ? "absolute" : "relative",
        top: 0, left: 0,
        width: !canEdit ? viewerW : effectiveW,
        minHeight: CANVAS_H,
        zIndex: 1,
        overflow: "hidden",
        flexShrink: 0,
        transform: !canEdit ? `scale(${viewerScale})` : undefined,
        transformOrigin: "top left",
        ...(canvasMode === "space_mobile" && canEdit ? { border: "1px solid rgba(255,255,255,0.08)", borderTop: "none", borderRadius: "0 0 16px 16px" } : {}),
        ...(!canEdit ? { animation: "land-reveal 0.18s ease both" } : {}),
      }}
        onDragEnter={e => {
          if (!canInteract) return;
          e.preventDefault();
          dragCounterRef.current += 1;
          setIsDragOver(true);
        }}
        onDragOver={e => {
          if (!canInteract) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          if (!canInteract) return;
          dragCounterRef.current -= 1;
          if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setIsDragOver(false); }
        }}
        onDrop={e => {
          if (!canInteract) return;
          e.preventDefault();
          dragCounterRef.current = 0;
          setIsDragOver(false);
          const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
          if (!files.length) return;
          const rect = canvasWrapperRef.current?.getBoundingClientRect();
          const pos = rect
            ? { x: e.clientX - rect.left, y: e.clientY - rect.top + (canvasWrapperRef.current?.parentElement?.scrollTop ?? 0) }
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          processImageFiles(files, pos);
        }}
      >

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
          setSelectedIds(new Set());setMenuOpen(false);setCardMenuId(null);setCardMenuRect(null);setGbMenuId(null);setGbMenuRect(null);setEditingId(null);setEditingTextId(null);
          setSelRect({startX:e.clientX,startY:e.clientY,currentX:e.clientX,currentY:e.clientY});
        }} />


      {view==="canvas"&&drawRectVis&&drawRectVis.w>0&&(<div style={{position:"absolute",left:drawRectVis.x,top:drawRectVis.y,width:drawRectVis.w,height:drawRectVis.h,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.02)",borderRadius:4,pointerEvents:"none",zIndex:600}} />)}
      {view==="canvas"&&selRectVis&&selRectVis.w>5&&selRectVis.h>5&&(<div style={{position:"absolute",left:selRectVis.x,top:selRectVis.y,width:selRectVis.w,height:selRectVis.h,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.02)",borderRadius:3,pointerEvents:"none",zIndex:600}} />)}

      {/* ── IMAGES ── */}
      {visImages.map((img,i)=>{
        const isSel=selectedIds.has(img.id);
        const ps=getParallaxStyle(img.layer,img.depth);
        const _cx=viewerW/2,_cy=500;
        const _fx=!canEdit?Math.round((_cx-(img.x+img.w/2))*0.40):0;
        const _fy=!canEdit?Math.round((_cy-(img.y+img.h/2))*0.40):0;
        const _fd=!canEdit?Math.min(i*22,200):0;
        return (
          <div key={img.id} ref={el=>{if(el)imgElRefs.current.set(img.id,el);else imgElRefs.current.delete(img.id);}} style={{position:"absolute",left:img.x,top:img.y,width:img.w,height:img.h,zIndex:img.zIndex+img.layer*100,cursor:img.locked?"default":!canInteract&&img.linkUrl?"pointer":dragging?.id===img.id?"grabbing":"grab",userSelect:"none",transform:`${ps.transform} rotate(${img.rotation??0}deg)`,willChange:"transform",...(!canEdit?{'--from-x':`${_fx}px`,'--from-y':`${_fy}px`,animation:`el-reveal 0.45s cubic-bezier(0.16,1,0.3,1) ${_fd}ms both`}as object:{})}}
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
            {isSel&&canInteract&&!multiSel&&!img.locked&&(<ResizeHandles onResizeMD={(h,e)=>startSingleResize(img.id,"image",h,e)} />)}
            {isSel&&canInteract&&!multiSel&&!img.locked&&(<RotateHandle onMouseDown={e=>{e.stopPropagation();startRotate(img.id,"image",e);}} />)}
            {isSel&&canInteract&&!multiSel&&(<>
              {/* Link toggle button */}
              <div
                onMouseDown={e=>e.stopPropagation()}
                onClick={e=>{e.stopPropagation();setLinkEditId(id=>id===img.id?null:img.id);}}
                title={img.linkUrl?"Edit link":"Add link"}
                style={{position:"absolute",bottom:-22,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,cursor:"pointer",zIndex:20,background:linkEditId===img.id?"rgba(212,240,196,0.1)":"rgba(10,10,12,0.94)",border:`1px solid ${linkEditId===img.id?"rgba(212,240,196,0.3)":img.linkUrl?"rgba(255,255,255,0.22)":"rgba(255,255,255,0.1)"}`,backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={img.linkUrl||linkEditId===img.id?"rgba(212,240,196,0.8)":"rgba(255,255,255,0.35)"} strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <span style={{fontFamily:MONO,fontSize:8,letterSpacing:1.5,color:img.linkUrl||linkEditId===img.id?"rgba(212,240,196,0.8)":"rgba(255,255,255,0.35)",textTransform:"uppercase" as const}}>LINK</span>
              </div>
              {linkEditId===img.id&&(
                <ImageLinkPortal
                  imgEl={imgElRefs.current.get(img.id)??null}
                  linkUrl={img.linkUrl}
                  onChange={v=>enqueueOp({type:"update_image",id:img.id,patch:{linkUrl:v||undefined}})}
                  onClose={()=>setLinkEditId(null)}
                />
              )}
            </>)}
          </div>
        );
      })}

      {/* ── TEXTS ── */}
      {visTexts.map((txt,i)=>{
        const isSel=selectedIds.has(txt.id);
        const isEdit=editingTextId===txt.id;
        const ps=getParallaxStyle(txt.layer,txt.depth);
        const _cx=viewerW/2,_cy=500;
        const _fx=!canEdit?Math.round((_cx-(txt.x+50))*0.40):0;
        const _fy=!canEdit?Math.round((_cy-(txt.y+20))*0.40):0;
        const _fd=!canEdit?Math.min(i*22,200):0;
        return (
          <div key={txt.id} ref={el=>{textElRefs.current[txt.id]=el;}}
            style={{position:"absolute",left:txt.x,top:txt.y,zIndex:txt.zIndex+txt.layer*100,transform:`${ps.transform} rotate(${txt.rotation}deg)`,willChange:"transform",userSelect:isEdit?"text":"none",cursor:txt.locked?"default":dragging?.id===txt.id?"grabbing":isEdit?"text":"grab",display:"inline-block",maxWidth:Math.max(80,viewerW-txt.x-8),...(!canEdit?{'--from-x':`${_fx}px`,'--from-y':`${_fy}px`,animation:`el-reveal 0.45s cubic-bezier(0.16,1,0.3,1) ${_fd}ms both`}as object:{})}}
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
              style={{fontFamily:getFontStyle(txt.font),fontSize:txt.size,color:txt.color,opacity:txt.opacity,letterSpacing:txt.letterSpacing,textTransform:txt.uppercase?"uppercase":"none",lineHeight:1.15,whiteSpace:"pre-wrap",wordBreak:"break-word",overflowWrap:"break-word",outline:isEdit?"1px dashed rgba(255,255,255,0.2)":"none",outlineOffset:6,padding:"2px 0",cursor:isEdit?"text":"grab",minWidth:4} as React.CSSProperties}
              dangerouslySetInnerHTML={isEdit ? undefined : { __html: txt.content }}
              ref={el=>{if(el&&isEdit&&el.innerText!==txt.content){el.innerText=txt.content;}}}
            />
            {isSel&&canInteract&&!isEdit&&(<div style={{position:"absolute",top:-22,left:0,display:"flex",gap:4,padding:4,background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,backdropFilter:"blur(6px)"}} onMouseDown={e=>e.stopPropagation()}>
              {([0,1,2] as const).map(l=>{const hk=`txt_${txt.id}_${l}`;return(<div key={l} onClick={e=>{e.stopPropagation();updateText(txt.id,{layer:l});}} onMouseEnter={()=>setHovLayerKey(hk)} onMouseLeave={()=>setHovLayerKey(null)} style={{padding:"4px 8px",borderRadius:4,fontFamily:MONO,fontSize:11,letterSpacing:"1px",cursor:"pointer",transition:"all 0.12s ease",background:txt.layer===l?"white":"transparent",color:txt.layer===l?"black":"rgba(255,255,255,0.4)",opacity:hovLayerKey===hk?1:undefined,transform:hovLayerKey===hk?"scale(1.05)":undefined}}>{LAYER_NAMES[l].slice(0,2).toUpperCase()}</div>);})}
            </div>)}
            {isSel&&canInteract&&!isEdit&&(<LockBtn locked={!!txt.locked} onClick={e=>{e.stopPropagation();updateText(txt.id,{locked:!txt.locked});}} />)}
            {isSel&&canInteract&&!isEdit&&!txt.locked&&(<RotateHandle onMouseDown={e=>onRotateText(txt.id,e)} />)}
            {isSel&&canInteract&&!isEdit&&!txt.locked&&(<div onMouseDown={e=>{e.stopPropagation();startSingleResize(txt.id,"text","se",e);}} style={{position:"absolute",bottom:-5,right:-5,width:10,height:10,borderRadius:"50%",background:"rgba(255,255,255,0.65)",cursor:"nwse-resize",border:"1.5px solid rgba(0,0,0,0.2)",zIndex:10}} />)}
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
      {visGalleries.map((gallery,i)=>{
        const ps=getParallaxStyle(gallery.layer,gallery.depth);
        const _cx=viewerW/2,_cy=500;
        const _fx=!canEdit?Math.round((_cx-(gallery.x+(gallery.w??300)/2))*0.40):0;
        const _fy=!canEdit?Math.round((_cy-(gallery.y+125))*0.40):0;
        const _fd=!canEdit?Math.min(80+i*22,240):0;
        const _entry=!canEdit?{'--from-x':`${_fx}px`,'--from-y':`${_fy}px`,animation:`el-reveal 0.45s cubic-bezier(0.16,1,0.3,1) ${_fd}ms both`} as any:undefined;
        return (
          <WidgetBoundary key={gallery.id} label="gallery">
            <GalleryWidget gallery={gallery} isSel={selectedIds.has(gallery.id)} multiSel={multiSel} draggingId={dragging?.id??null} locked={!!gallery.locked} onMouseDown={gallery.locked?(id,t,x,y,e)=>e.stopPropagation():onElementMouseDown} onClick={e=>handleElementClick(gallery.id,e)}
 onResizeMD={gallery.locked?(h,e)=>e.stopPropagation():(h,e)=>startSingleResize(gallery.id,"gallery",h,e)} onRotateMD={gallery.locked?(id,t,e)=>e.stopPropagation():startRotate} updateGallery={updateGallery} onDropToCanvas={addGalleryImageToCanvas} parallaxTransform={ps.transform as string} onToggleLock={()=>updateGallery(gallery.id,{locked:!gallery.locked} as any)} canInteract={canInteract} entryAnimStyle={_entry} />
          </WidgetBoundary>
        );
      })}

      {/* ── PROFILES ── */}
      {visProfiles.map((prof,i)=>{
        const ps=getParallaxStyle(prof.layer,prof.depth);
        const _cx=viewerW/2,_cy=500;
        const _fx=!canEdit?Math.round((_cx-(prof.x+prof.w/2))*0.40):0;
        const _fy=!canEdit?Math.round((_cy-(prof.y+prof.h/2))*0.40):0;
        const _fd=!canEdit?Math.min(80+i*22,240):0;
        const _entry=!canEdit?{'--from-x':`${_fx}px`,'--from-y':`${_fy}px`,animation:`el-reveal 0.45s cubic-bezier(0.16,1,0.3,1) ${_fd}ms both`} as any:undefined;
        return (<ProfileCard key={prof.id} card={prof} isSel={selectedIds.has(prof.id)} draggingId={dragging?.id??null} parallaxTransform={ps.transform as string} entryAnimStyle={_entry}
          locked={!!prof.locked}
          onMouseDown={prof.locked?e=>e.stopPropagation():e=>onElementMouseDown(prof.id,"profile",prof.x,prof.y,e)}
          onClick={e=>handleElementClick(prof.id,e)}

          onResizeMD={prof.locked?(_h:ResizeHandle,e:React.MouseEvent)=>e.stopPropagation():(h,e)=>startSingleResize(prof.id,"profile",h,e)}
          onRotateMD={prof.locked?e=>e.stopPropagation():e=>{const el=document.querySelector(`[data-profile-id="${prof.id}"]`) as HTMLElement;if(el){const r=el.getBoundingClientRect();startRotate(prof.id,"profile",e,r.left+r.width/2,r.top+r.height/2);}else startRotate(prof.id,"profile",e,prof.x+prof.w/2,prof.y+prof.h/2);}}
          updateProfile={updateProfile}
          onToggleLock={()=>setElements(p=>p.map(e=>e.elementType==="profile"&&e.id===prof.id?{...e,locked:!e.locked}:e))}
          canInteract={canInteract}
          currentUserId={currentUserId}
          ownerUserId={ownerUserId}
          authResolved={authResolved}
          onMessage={(handle) => handleMessage(handle)}
          onAddModule={(moduleType) => handleAddModule(prof.id, moduleType)}
          onOpenSocialPanel={(mode) => {
            const uid = prof.userId ?? ownerUserId;
            if (uid) openSocialPanel(uid, prof.handle || userHandle, mode);
          }} />);
      })}


      {/* ── GUESTBOOK ── */}
      {visGuestbooks.map((gb, i) => {
        const ps = getParallaxStyle(gb.layer, gb.depth);
        const _cx=viewerW/2,_cy=500;
        const _fx=!canEdit?Math.round((_cx-(gb.x+gb.w/2))*0.40):0;
        const _fy=!canEdit?Math.round((_cy-(gb.y+gb.h/2))*0.40):0;
        const _fd=!canEdit?Math.min(160+i*22,280):0;
        const _entry=!canEdit?{'--from-x':`${_fx}px`,'--from-y':`${_fy}px`,animation:`el-reveal 0.45s cubic-bezier(0.16,1,0.3,1) ${_fd}ms both`} as any:undefined;
        return (
          <WidgetBoundary key={gb.id} label="guestbook">
            <GuestbookWidget
              guestbook={gb}
              isSel={selectedIds.has(gb.id)}
              draggingId={dragging?.id ?? null}
              parallaxTransform={ps.transform as string}
              entryAnimStyle={_entry}
              locked={!!gb.locked}
              onMouseDown={gb.locked ? e => e.stopPropagation() : e => onElementMouseDown(gb.id, "guestbook", gb.x, gb.y, e)}
              onClick={e => handleElementClick(gb.id, e)}
              onResizeMD={gb.locked ? (_h:ResizeHandle,e:React.MouseEvent)=>e.stopPropagation() : (h,e)=>startSingleResize(gb.id,"guestbook",h,e)}
              onRotateMD={gb.locked ? e => e.stopPropagation() : e => startRotate(gb.id, "guestbook", e, gb.x + gb.w / 2, gb.y + gb.h / 2)}
              updateGuestbook={updateGuestbook}
              onToggleLock={() => setElements(p => p.map(e => e.elementType === "guestbook" && e.id === gb.id ? { ...e, locked: !e.locked } : e))}
              canInteract={canInteract}
              ownerUserId={ownerUserId ?? currentUserId}
              currentUserId={currentUserId}
              onOpenMenu={rect => { setGbMenuId(gb.id); setGbMenuRect(rect); }}
            />
          </WidgetBoundary>
        );
      })}

      {/* ── SOCIAL CARDS ── */}
      {visSocialCards.map((sc, i) => {
        const ps = getParallaxStyle(sc.layer, sc.depth);
        const _entry = !canEdit ? { animation: `el-reveal 0.45s cubic-bezier(0.16,1,0.3,1) ${Math.min(180+i*22,300)}ms both` } as React.CSSProperties : undefined;
        const scEff = resolveModuleStyle(sc);
        return (
          <WidgetBoundary key={sc.id} label="social-card">
            <SocialCardWidget
              card={scEff}
              isSel={selectedIds.has(sc.id)}
              draggingId={dragging?.id ?? null}
              parallaxTransform={ps.transform as string}
              entryAnimStyle={_entry}
              locked={!!sc.locked}
              onMouseDown={sc.locked ? e => e.stopPropagation() : e => onElementMouseDown(sc.id, "social", sc.x, sc.y, e)}
              onClick={e => handleElementClick(sc.id, e)}
              onResizeMD={sc.locked ? (_h: ResizeHandle, e: React.MouseEvent) => e.stopPropagation() : (h, e) => startSingleResize(sc.id, "social", h, e)}
              onRotateMD={sc.locked ? e => e.stopPropagation() : e => startRotate(sc.id, "social", e, sc.x + sc.w / 2, sc.y + sc.h / 2)}
              updateCard={updateSocialCard}
              onToggleLock={() => setElements(p => p.map(e => e.elementType === "social" && e.id === sc.id ? { ...e, locked: !e.locked } : e))}
              canInteract={canInteract}
            />
          </WidgetBoundary>
        );
      })}

      {/* ── MUSIC CARDS ── */}
      {visMusicCards.map((mc, i) => {
        const ps = getParallaxStyle(mc.layer, mc.depth);
        const _entry = !canEdit ? { animation: `el-reveal 0.45s cubic-bezier(0.16,1,0.3,1) ${Math.min(200+i*22,320)}ms both` } as React.CSSProperties : undefined;
        const mcEff = resolveModuleStyle(mc);
        return (
          <WidgetBoundary key={mc.id} label="music-card">
            <MusicCardWidget
              card={mcEff}
              isSel={selectedIds.has(mc.id)}
              draggingId={dragging?.id ?? null}
              parallaxTransform={ps.transform as string}
              entryAnimStyle={_entry}
              locked={!!mc.locked}
              onMouseDown={mc.locked ? e => e.stopPropagation() : e => onElementMouseDown(mc.id, "music", mc.x, mc.y, e)}
              onClick={e => handleElementClick(mc.id, e)}
              onResizeMD={mc.locked ? (_h: ResizeHandle, e: React.MouseEvent) => e.stopPropagation() : (h, e) => startSingleResize(mc.id, "music", h, e)}
              onRotateMD={mc.locked ? e => e.stopPropagation() : e => startRotate(mc.id, "music", e, mc.x + mc.w / 2, mc.y + mc.h / 2)}
              updateCard={updateMusicCard}
              onToggleLock={() => setElements(p => p.map(e => e.elementType === "music" && e.id === mc.id ? { ...e, locked: !e.locked } : e))}
              canInteract={canInteract}
            />
          </WidgetBoundary>
        );
      })}

      {/* ── LINKS CARDS ── */}
      {visLinksCards.map((lc, i) => {
        const ps = getParallaxStyle(lc.layer, lc.depth);
        const _entry = !canEdit ? { animation: `el-reveal 0.45s cubic-bezier(0.16,1,0.3,1) ${Math.min(220+i*22,340)}ms both` } as React.CSSProperties : undefined;
        const lcEff = resolveModuleStyle(lc);
        return (
          <WidgetBoundary key={lc.id} label="links-card">
            <LinksCardWidget
              card={lcEff}
              isSel={selectedIds.has(lc.id)}
              draggingId={dragging?.id ?? null}
              parallaxTransform={ps.transform as string}
              entryAnimStyle={_entry}
              locked={!!lc.locked}
              onMouseDown={lc.locked ? e => e.stopPropagation() : e => onElementMouseDown(lc.id, "links", lc.x, lc.y, e)}
              onClick={e => handleElementClick(lc.id, e)}
              onResizeMD={lc.locked ? (_h: ResizeHandle, e: React.MouseEvent) => e.stopPropagation() : (h, e) => startSingleResize(lc.id, "links", h, e)}
              onRotateMD={lc.locked ? e => e.stopPropagation() : e => startRotate(lc.id, "links", e, lc.x + lc.w / 2, lc.y + lc.h / 2)}
              updateCard={updateLinksCard}
              onToggleLock={() => setElements(p => p.map(e => e.elementType === "links" && e.id === lc.id ? { ...e, locked: !e.locked } : e))}
              canInteract={canInteract}
              ownerUserId={ownerUserId ?? currentUserId}
            />
          </WidgetBoundary>
        );
      })}

      {/* ── CARDS ── */}
      {visCards.map((card,i)=>{
        const isSel=selectedIds.has(card.id);
        const showMenu=cardMenuId===card.id;
        const isEdit=editingId===card.id;
        const isNote=card.type==="text"||card.type==="list";
        const tc=card.textColor||textColor(card.bgColor);
        const light=isLight(card.bgColor);
        const pad=adaptivePad(card.borderRadius);
        const ps=getParallaxStyle(card.layer,card.depth);
        const _cx=viewerW/2,_cy=500;
        const _fx=!canEdit?Math.round((_cx-(card.x+card.w/2))*0.40):0;
        const _fy=!canEdit?Math.round((_cy-(card.y+card.h/2))*0.40):0;
        const _fd=!canEdit?Math.min(25+i*22,220):0;
        return (
          <div key={card.id}
            ref={el=>{cardDivRefs.current[card.id]=el;}}
            onMouseDown={e=>{if(!card.locked)onElementMouseDown(card.id,"card",card.x,card.y,e);else e.stopPropagation();}}
            onClick={e=>handleElementClick(card.id,e)}

            onDoubleClick={e=>{e.stopPropagation();zCounter.current++;setElements(p=>p.map(e=>e.elementType==="card"&&e.id===card.id?{...e,zIndex:zCounter.current}:e));}}
            style={{position:"absolute",left:card.x,top:card.y,width:card.w,height:card.h,zIndex:card.zIndex+card.layer*100,cursor:card.locked?"default":dragging?.id===card.id?"grabbing":"grab",userSelect:"none",transform:`${ps.transform} rotate(${card.rotation}deg)`,willChange:"transform",...(!canEdit?{'--from-x':`${_fx}px`,'--from-y':`${_fy}px`,animation:`el-reveal 0.45s cubic-bezier(0.16,1,0.3,1) ${_fd}ms both`}as object:{})}}>
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
            {isSel&&canInteract&&!multiSel&&!card.locked&&(<ResizeHandles onResizeMD={(h,e)=>startSingleResize(card.id,"card",h,e)} light={light} />)}
          </div>
        );
      })}

      {/* ── MEDIA CARDS ── */}
      {visMedias.map((media, i) => {
        const ps = getParallaxStyle(media.layer, media.depth);
        const _cx=viewerW/2,_cy=500;
        const _fx=!canEdit?Math.round((_cx-(media.x+media.w/2))*0.40):0;
        const _fy=!canEdit?Math.round((_cy-(media.y+media.h/2))*0.40):0;
        const _fd=!canEdit?Math.min(80+i*22,240):0;
        const _entry=!canEdit?{'--from-x':`${_fx}px`,'--from-y':`${_fy}px`,animation:`el-reveal 0.45s cubic-bezier(0.16,1,0.3,1) ${_fd}ms both`} as any:undefined;
        return (
          <WidgetBoundary key={media.id} label="media">
            <MediaCardWidget
              media={media}
              isSel={selectedIds.has(media.id)}
              draggingId={dragging?.id ?? null}
              parallaxTransform={ps.transform as string}
              entryAnimStyle={_entry}
              onMouseDown={media.locked ? e => e.stopPropagation() : e => onElementMouseDown(media.id, "media", media.x, media.y, e)}
              onClick={e => handleElementClick(media.id, e)}
              onResizeMD={media.locked ? (_h:ResizeHandle,e:React.MouseEvent)=>e.stopPropagation() : (h,e)=>startSingleResize(media.id,"media",h,e)}
              onRotateMD={media.locked ? e => e.stopPropagation() : e => startRotate(media.id, "media", e, media.x + media.w / 2, media.y + media.h / 2)}
              updateMedia={updateMedia}
              locked={!!media.locked}
              onToggleLock={() => setElements(p => p.map(e => e.elementType === "media" && e.id === media.id ? { ...e, locked: !e.locked } : e))}
              canInteract={canInteract}
            />
          </WidgetBoundary>
        );
      })}


      {view==="canvas"&&groupBounds&&!dragging&&!resizing&&!rotating&&(
        <div style={{position:"absolute",left:groupBounds.x-4,top:groupBounds.y-4,width:groupBounds.w+8,height:groupBounds.h+8,border:"1px dashed rgba(255,255,255,0.1)",borderRadius:6,pointerEvents:"none",zIndex:900}}>
          <div onMouseDown={e=>startGroupResize(e,groupBounds)} style={{position:"absolute",bottom:-5,right:-5,width:10,height:10,borderRadius:"50%",background:"rgba(255,255,255,0.6)",cursor:"nwse-resize",border:"1.5px solid rgba(0,0,0,0.2)",pointerEvents:"all"}} />
        </div>
      )}

      {/* Drop overlay */}
      {isDragOver && (
        <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,background:"rgba(8,8,10,0.82)",backdropFilter:"blur(8px)",pointerEvents:"none"}}>
          <div style={{width:72,height:72,borderRadius:20,border:"2px dashed rgba(212,240,196,0.5)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 40px rgba(212,240,196,0.12)"}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(212,240,196,0.7)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,letterSpacing:3,color:"rgba(212,240,196,0.6)",textTransform:"uppercase"}}>DROP IMAGES</span>
        </div>
      )}

      </div>
      </div>{/* end viewer scale wrapper */}
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

      {/* ── CARD MENU ── */}
      {view==="canvas"&&(()=>{
        if(!cardMenuId||!cardMenuRect)return null;
        const mc=cards.find(c=>c.id===cardMenuId);
        if(!mc)return null;
        return(<CardMenu card={mc} cardMenuTab={cardMenuTab} setCardMenuTab={setCardMenuTab} updateCard={updateCard} bgCardId={bgCardId} bgImageRef={bgImageRef} cardRect={cardMenuRect}/>);
      })()}

      {/* ── GUESTBOOK MENU ── */}
      {view==="canvas"&&(()=>{
        if(!gbMenuId||!gbMenuRect)return null;
        const gb=guestbooks.find(g=>g.id===gbMenuId);
        if(!gb)return null;
        return(
          <GuestbookMenu
            guestbook={gb}
            menuRect={gbMenuRect}
            updateGuestbook={updateGuestbook}
            onUploadBg={()=>{ gbBgIdRef.current=gb.id; gbBgFileRef.current?.click(); }}
            onClose={()=>{ setGbMenuId(null); setGbMenuRect(null); }}
          />
        );
      })()}

      {/* Hidden file input for guestbook bg image */}
      <input
        ref={gbBgFileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async e => {
          const f = e.target.files?.[0];
          if (!f || !gbBgIdRef.current) return;
          const { uploadToStorage } = await import("@/lib/storage");
          const { publicUrl } = await uploadToStorage(f);
          updateGuestbook(gbBgIdRef.current, { bgImage: publicUrl, bgMode: "cover" });
          e.target.value = "";
        }}
      />

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
          {(wallpaper||bgColor!=="#0a0a0c")&&(<WallpaperMenuBtn label="RESET TO DEFAULT" onClick={()=>{enqueueOp({type:"set_wallpaper",value:""});enqueueOp({type:"set_bg",value:"#0a0a0c"});enqueueOp({type:"set_wallpaper_blur",value:0});enqueueOp({type:"set_wallpaper_brightness",value:100});enqueueOp({type:"set_wallpaper_vignette",value:0});}} dim />)}
          <div style={{height:1,background:"rgba(255,255,255,0.06)",margin:"4px 0"}}/>
          <WallpaperSlider label="BLUR" value={wallpaperBlur} min={0} max={40} unit="px" onChange={v=>enqueueOp({type:"set_wallpaper_blur",value:v})} />
          <WallpaperSlider label="BRILLO" value={wallpaperBrightness} min={0} max={200} unit="%" onChange={v=>enqueueOp({type:"set_wallpaper_brightness",value:v})} />
          <WallpaperSlider label="VIÑETADO" value={wallpaperVignette} min={0} max={100} unit="" onChange={v=>enqueueOp({type:"set_wallpaper_vignette",value:v})} />
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

      {/* Analytics view */}
      {view === "analytics" && canEdit && (
        <WidgetBoundary label="analytics-view">
          <AnalyticsCanvas
            userId={currentUserId}
            bgColor={homeBg.color || "#0a0a0c"}
            wallpaper={homeBg.wallpaper && homeBg.wallpaperLoaded ? homeBg.wallpaper : undefined}
          />
        </WidgetBoundary>
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

function WallpaperSlider({label,value,min,max,unit,onChange}:{label:string;value:number;min:number;max:number;unit:string;onChange:(v:number)=>void}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"'Space Mono',monospace",fontSize:7,letterSpacing:1.5,color:"rgba(255,255,255,0.35)",textTransform:"uppercase"}}>{label}</span>
        <span style={{fontFamily:"'Space Mono',monospace",fontSize:7,color:"rgba(255,255,255,0.25)"}}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))} onMouseDown={e=>e.stopPropagation()}
        style={{width:"100%",accentColor:"rgba(232,224,212,0.6)",cursor:"pointer",height:3}} />
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

// ── ImageLinkPortal ────────────────────────────────────────────────────────────
// Portals the image link editor to document.body so it escapes the canvas
// overflow:hidden wrapper and the canvas transform stacking context.
function ImageLinkPortal({
  imgEl, linkUrl, onChange, onClose,
}: {
  imgEl: HTMLDivElement | null;
  linkUrl: string | undefined;
  onChange: (v: string) => void;
  onClose?: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const MONO_L = "'Space Mono', monospace";

  useEffect(() => {
    if (!imgEl) return;
    const compute = () => {
      const r   = imgEl.getBoundingClientRect();
      const w   = 200;
      const top = Math.min(r.bottom + 8, window.innerHeight - 80);
      const left = Math.max(4, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 4));
      setPos({ top, left });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [imgEl]);

  if (!pos) return null;

  return createPortal(
    <div
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        position:      "fixed",
        top:           pos.top,
        left:          pos.left,
        width:         200,
        background:    "rgba(8,8,10,0.96)",
        border:        "1px solid rgba(255,255,255,0.1)",
        borderRadius:  7,
        padding:       "8px 10px",
        backdropFilter:"blur(32px)",
        WebkitBackdropFilter:"blur(32px)",
        zIndex:        999999,
        display:       "flex",
        flexDirection: "column",
        gap:           5,
        boxShadow:     "0 8px 32px rgba(0,0,0,0.65)",
      }}
    >
      <span style={{fontFamily:MONO_L,fontSize:7,letterSpacing:2.5,color:"rgba(255,255,255,0.22)",textTransform:"uppercase" as const}}>LINK</span>
      <input
        type="url"
        value={linkUrl ?? ""}
        placeholder="https://example.com"
        onChange={e => onChange(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={e => { e.stopPropagation(); if (e.key === "Escape") onClose?.(); }}
        autoFocus
        style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:5,padding:"5px 8px",fontFamily:MONO_L,fontSize:9,letterSpacing:0.5,color:"rgba(255,255,255,0.75)",outline:"none",width:"100%",boxSizing:"border-box" as const,caretColor:"rgba(255,255,255,0.8)"}}
      />
    </div>,
    document.body
  );
}