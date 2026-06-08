"use client";
import { useRef, useEffect } from "react";
import type { CanvasElement, CanvasImage as CanvasImageType, CanvasCard, CanvasText, CanvasGallery, CanvasMedia, GuestbookCardData, SocialCardData, MusicCardData, LinksCardData, StatsCardData, ProfileCardData } from "@/types";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

const LOGICAL_W = 390;
const PANEL_W   = 422;
const INNER_W   = 390;

type Props = {
  isOpen:             boolean;
  onClose:            () => void;
  elements:           CanvasElement[];
  setElements:        (updater: (prev: CanvasElement[]) => CanvasElement[]) => void;
  bgColor:            string;
  wallpaper:          string;
  wallpaperBlur:      number;
  wallpaperBrightness: number;
  wallpaperVignette:  number;
  loaded:             boolean;
};

export default function MobileViewPanel({
  isOpen, onClose, elements, setElements,
  bgColor, wallpaper, wallpaperBlur, wallpaperBrightness, wallpaperVignette, loaded,
}: Props) {
  const panelScale = INNER_W / LOGICAL_W; // 1.0 — logical px = panel px
  const dragRef  = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Clean up drag state if panel closes mid-drag
  useEffect(() => {
    if (!isOpen) dragRef.current = null;
  }, [isOpen]);

  // Global pointer-up in case pointer leaves panel during drag
  useEffect(() => {
    const onUp = () => { dragRef.current = null; };
    document.addEventListener("pointerup", onUp);
    return () => document.removeEventListener("pointerup", onUp);
  }, []);

  if (!isOpen) return null;

  function beginDrag(id: string, e: React.MouseEvent | React.PointerEvent, origX: number, origY: number) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX, origY };
  }

  function onPanelPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / panelScale;
    const dy = (e.clientY - d.startY) / panelScale;
    const newX = Math.max(0, Math.round(d.origX + dx));
    const newY = Math.max(0, Math.round(d.origY + dy));
    setElements(prev => prev.map(el =>
      el.id === d.id ? { ...el, x: newX, y: newY } as CanvasElement : el,
    ));
  }

  function onPanelPointerUp() {
    dragRef.current = null;
  }

  const wpBlur       = wallpaperBlur ?? 0;
  const wpBrightness = wallpaperBrightness ?? 100;
  const wpVignette   = wallpaperVignette ?? 0;
  const wpFilter     = [
    wpBlur > 0           ? `blur(${wpBlur}px)`            : "",
    wpBrightness !== 100 ? `brightness(${wpBrightness}%)` : "",
  ].filter(Boolean).join(" ");
  const hasWp = !!(wallpaper && !wallpaper.startsWith("blob:"));

  // Sort by zIndex for rendering order
  const sorted = [...elements].sort((a, b) => (a.zIndex + (a.layer ?? 0) * 100) - (b.zIndex + (b.layer ?? 0) * 100));

  return (
    <div
      style={{
        position:        "fixed",
        top:             44,
        right:           0,
        bottom:          0,
        width:           PANEL_W,
        zIndex:          250,
        display:         "flex",
        flexDirection:   "column",
        background:      "rgba(8,8,10,0.96)",
        backdropFilter:  "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderLeft:      "1px solid rgba(255,255,255,0.08)",
        boxShadow:       "-8px 0 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "10px 16px",
        borderBottom:   "1px solid rgba(255,255,255,0.07)",
        flexShrink:     0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(212,240,196,0.7)" }} />
          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2.5, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
            Mobile View
          </span>
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.2)" }}>
            390px
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background:    "transparent",
            border:        "1px solid rgba(255,255,255,0.1)",
            borderRadius:  5,
            color:         "rgba(255,255,255,0.35)",
            fontFamily:    MONO,
            fontSize:      8,
            letterSpacing: 1.5,
            padding:       "3px 9px",
            cursor:        "pointer",
            textTransform: "uppercase",
          }}
        >
          Close
        </button>
      </div>

      {/* Phone chrome top — notch / status bar */}
      <div style={{
        flexShrink: 0,
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        height:     28,
        background: "rgba(0,0,0,0.4)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        paddingLeft: 16, paddingRight: 16,
      }}>
        <div style={{ width: 48, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.1)" }} />
      </div>

      {/* Scrollable canvas area */}
      <div
        ref={scrollRef}
        onPointerMove={onPanelPointerMove}
        onPointerUp={onPanelPointerUp}
        onPointerLeave={onPanelPointerUp}
        style={{
          flex:       1,
          overflowY:  "auto",
          overflowX:  "hidden",
          position:   "relative",
          background: bgColor || "#0a0a0c",
        }}
      >
        {/* Wallpaper */}
        {hasWp && (
          <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
            <div style={{
              position:            "absolute",
              inset:               wpBlur > 0 ? `-${wpBlur * 2}px` : 0,
              backgroundImage:     `url(${wallpaper})`,
              backgroundRepeat:    "repeat",
              backgroundSize:      "auto",
              backgroundPosition:  "top left",
              filter:              wpFilter || undefined,
            }} />
            {wpVignette > 0 && (
              <div style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(ellipse at center, transparent ${Math.max(0, 85 - wpVignette * 0.7)}%, rgba(0,0,0,${(wpVignette / 100) * 0.92}) 100%)`,
              }} />
            )}
          </div>
        )}

        {/* Loading state */}
        {!loaded && (
          <div style={{
            position:    "absolute",
            inset:       0,
            display:     "flex",
            alignItems:  "center",
            justifyContent: "center",
            zIndex:      10,
            pointerEvents: "none",
          }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
              Loading…
            </span>
          </div>
        )}

        {/* Grid dots */}
        <div style={{
          position:        "absolute",
          inset:           0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)",
          backgroundSize:  "32px 32px",
          pointerEvents:   "none",
          zIndex:          1,
          minHeight:       "100%",
        }} />

        {/* Canvas elements */}
        <div style={{ position: "relative", width: INNER_W, minHeight: "100%", zIndex: 2 }}>
          {sorted.map(el => <MobileEl key={el.id} el={el} onDragStart={beginDrag} />)}
        </div>

        {/* Empty state */}
        {loaded && elements.length === 0 && (
          <div style={{
            position:    "absolute",
            inset:       0,
            display:     "flex",
            flexDirection: "column",
            alignItems:  "center",
            justifyContent: "center",
            gap:         8,
            pointerEvents: "none",
            zIndex:      3,
          }}>
            <span style={{ fontSize: 24, opacity: 0.3 }}>📱</span>
            <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>
              Select an element and hit +
            </span>
          </div>
        )}
      </div>

      {/* Phone chrome bottom — home bar */}
      <div style={{
        flexShrink:    0,
        height:        28,
        display:       "flex",
        alignItems:    "center",
        justifyContent: "center",
        background:    "rgba(0,0,0,0.4)",
        borderTop:     "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
      </div>
    </div>
  );
}

// ── Per-element renderer ────────────────────────────────────────────────────────

type ElProps = {
  el:           CanvasElement;
  onDragStart:  (id: string, e: React.MouseEvent, origX: number, origY: number) => void;
};

function MobileEl({ el, onDragStart }: ElProps) {
  const z    = el.zIndex + (el.layer ?? 0) * 100;
  const rot  = el.rotation ?? 0;

  if (el.elementType === "text") {
    const txt = el as CanvasText & { elementType: "text" };
    const FONT_MAP: Record<string, string> = {
      "DM Sans":          SANS,
      "Space Mono":       MONO,
      "Impact":           "Impact, sans-serif",
      "Playfair Display": "'Playfair Display', serif",
      "Bebas Neue":       "'Bebas Neue', sans-serif",
      "Syne":             "'Syne', sans-serif",
    };
    return (
      <div
        onMouseDown={e => onDragStart(el.id, e, txt.x, txt.y)}
        style={{
          position:    "absolute",
          left:        txt.x,
          top:         txt.y,
          zIndex:      z,
          transform:   `rotate(${rot}deg)`,
          cursor:      "grab",
          maxWidth:    Math.max(60, LOGICAL_W - txt.x - 8),
          userSelect:  "none",
        }}
      >
        <div style={{
          fontFamily:    FONT_MAP[txt.font] ?? SANS,
          fontSize:      txt.size,
          color:         txt.color,
          opacity:       txt.opacity,
          letterSpacing: txt.letterSpacing,
          textTransform: txt.uppercase ? "uppercase" : "none",
          whiteSpace:    "pre-wrap",
          wordBreak:     "break-word",
          lineHeight:    1.15,
        }}>
          {txt.content}
        </div>
      </div>
    );
  }

  const w = (el as { w?: number }).w ?? 200;
  const h = (el as { h?: number }).h ?? 100;

  const wrapStyle: React.CSSProperties = {
    position:  "absolute",
    left:      el.x,
    top:       el.y,
    width:     w,
    height:    h,
    zIndex:    z,
    transform: `rotate(${rot}deg)`,
    cursor:    "grab",
  };

  if (el.elementType === "image") {
    const img = el as CanvasImageType & { elementType: "image" };
    if (img.src?.startsWith("blob:")) return null;
    return (
      <div onMouseDown={e => onDragStart(el.id, e, el.x, el.y)} style={wrapStyle}>
        <img
          src={img.src}
          draggable={false}
          alt=""
          style={{
            width:         "100%",
            height:        "100%",
            objectFit:     "contain",
            borderRadius:  img.isTransparent ? 0 : 8,
            pointerEvents: "none",
            userSelect:    "none",
          }}
        />
      </div>
    );
  }

  if (el.elementType === "card") {
    const card = el as CanvasCard & { elementType: "card" };
    const hasBg = card.bgImage && !card.bgImage.startsWith("blob:");
    return (
      <div
        onMouseDown={e => onDragStart(el.id, e, el.x, el.y)}
        style={{
          ...wrapStyle,
          borderRadius: card.borderRadius,
          opacity:      card.opacity,
          background:   hasBg ? undefined : (card.bgColor || "rgba(255,255,255,0.04)"),
          backgroundImage: hasBg ? `url(${card.bgImage})` : undefined,
          backgroundSize:  hasBg ? (card.bgMode === "repeat" ? "auto" : "cover") : undefined,
          backgroundRepeat: hasBg ? (card.bgMode === "repeat" ? "repeat" : "no-repeat") : undefined,
          border:       "1px solid rgba(255,255,255,0.06)",
        }}
      />
    );
  }

  if (el.elementType === "gallery") {
    const gal = el as CanvasGallery & { elementType: "gallery" };
    const imgs = gal.images.filter(i => !i.src.startsWith("blob:")).slice(0, 6);
    const cols = Math.min(imgs.length, 3);
    return (
      <div
        onMouseDown={e => onDragStart(el.id, e, el.x, el.y)}
        style={{
          ...wrapStyle,
          borderRadius: gal.borderRadius,
          opacity:      gal.opacity,
          background:   "rgba(255,255,255,0.04)",
          border:       "1px solid rgba(255,255,255,0.07)",
          overflow:     "hidden",
          display:      "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap:          2,
          padding:      2,
        }}
      >
        {imgs.map(img => (
          <img key={img.id} src={img.src} alt="" draggable={false}
            style={{ width: "100%", height: Math.round(h / Math.ceil(imgs.length / cols)) - 2, objectFit: "cover", borderRadius: 3 }}
          />
        ))}
      </div>
    );
  }

  if (el.elementType === "media") {
    const media = el as CanvasMedia & { elementType: "media" };
    const url = media.url?.trim();
    let embedUrl = "";
    let allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    try {
      if (url) {
        const u = new URL(url.startsWith("http") ? url : `https://${url}`);
        if (u.hostname === "open.spotify.com") {
          embedUrl = `https://open.spotify.com/embed${u.pathname}?utm_source=generator&theme=0`;
        } else if (u.hostname.includes("youtube.com")) {
          const id = u.searchParams.get("v");
          if (id) { embedUrl = `https://www.youtube.com/embed/${id}?playsinline=1`; allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"; }
        } else if (u.hostname === "youtu.be") {
          const id = u.pathname.slice(1);
          if (id) { embedUrl = `https://www.youtube.com/embed/${id}?playsinline=1`; allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"; }
        } else if (u.hostname.includes("soundcloud.com")) {
          embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23888888&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
          allow = "autoplay";
        }
      }
    } catch { /* invalid url */ }

    if (!embedUrl) return (
      <div onMouseDown={e => onDragStart(el.id, e, el.x, el.y)} style={{ ...wrapStyle, background: "#0b0b0d", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>MEDIA</span>
      </div>
    );

    return (
      <div onMouseDown={e => onDragStart(el.id, e, el.x, el.y)} style={{ ...wrapStyle, background: "#0b0b0d", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 4, overflow: "hidden" }}>
        <iframe src={embedUrl} width="100%" height="100%" style={{ border: "none", display: "block", pointerEvents: "none" }} allow={allow} loading="eager" referrerPolicy="no-referrer-when-downgrade" />
      </div>
    );
  }

  if (el.elementType === "profile") {
    const prof = el as ProfileCardData & { elementType: "profile" };
    const hasPhoto = prof.photo && !prof.photo.startsWith("blob:");
    const br = prof.borderRadius ?? 12;
    return (
      <div
        onMouseDown={e => onDragStart(el.id, e, el.x, el.y)}
        style={{
          ...wrapStyle,
          borderRadius: br,
          opacity:      prof.opacity ?? 1,
          background:   prof.bgColor || "rgba(255,255,255,0.04)",
          border:       "1px solid rgba(255,255,255,0.07)",
          display:      "flex",
          flexDirection: "column",
          alignItems:   "center",
          justifyContent: "center",
          gap:          6,
          padding:      16,
          overflow:     "hidden",
        }}
      >
        {hasPhoto && <img src={prof.photo} alt="" draggable={false} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />}
        {prof.name   && <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: prof.textColor || "rgba(255,255,255,0.88)" }}>{prof.name}</span>}
        {prof.handle && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.35)" }}>@{prof.handle}</span>}
        {prof.status && <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{prof.status}</span>}
        {prof.bio    && <span style={{ fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 1.4, maxWidth: "90%" }}>{prof.bio}</span>}
      </div>
    );
  }

  if (el.elementType === "guestbook") {
    const gb = el as GuestbookCardData & { elementType: "guestbook" };
    return (
      <div
        onMouseDown={e => onDragStart(el.id, e, el.x, el.y)}
        style={{
          ...wrapStyle,
          borderRadius: gb.borderRadius ?? 8,
          opacity:      gb.opacity ?? 1,
          background:   gb.bgColor || "rgba(255,255,255,0.04)",
          border:       "1px solid rgba(255,255,255,0.08)",
          display:      "flex",
          flexDirection: "column",
          alignItems:   "center",
          justifyContent: "center",
          gap:          6,
        }}
      >
        <span style={{ fontSize: 20, opacity: 0.6 }}>✉️</span>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Guestbook</span>
      </div>
    );
  }

  if (el.elementType === "social") {
    const sc = el as SocialCardData & { elementType: "social" };
    return (
      <div
        onMouseDown={e => onDragStart(el.id, e, el.x, el.y)}
        style={{
          ...wrapStyle,
          borderRadius: sc.borderRadius ?? 8,
          opacity:      sc.opacity ?? 1,
          background:   sc.bgColor || "rgba(255,255,255,0.04)",
          border:       "1px solid rgba(255,255,255,0.08)",
          display:      "flex",
          flexWrap:     "wrap",
          alignItems:   "center",
          justifyContent: "center",
          gap:          8,
          padding:      12,
          overflow:     "hidden",
        }}
      >
        {sc.socialLinks.slice(0, 8).map(sl => (
          <div key={sl.id} style={{
            fontFamily:    MONO,
            fontSize:      8,
            letterSpacing: 1,
            color:         sc.textColor || "rgba(255,255,255,0.5)",
            background:    "rgba(255,255,255,0.06)",
            borderRadius:  4,
            padding:       "3px 7px",
            textTransform: "uppercase",
          }}>
            {sl.platform}
          </div>
        ))}
        {sc.socialLinks.length === 0 && (
          <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: 1.5, textTransform: "uppercase" }}>Social Links</span>
        )}
      </div>
    );
  }

  if (el.elementType === "music") {
    const mc = el as MusicCardData & { elementType: "music" };
    return (
      <div
        onMouseDown={e => onDragStart(el.id, e, el.x, el.y)}
        style={{
          ...wrapStyle,
          borderRadius: mc.borderRadius ?? 8,
          opacity:      mc.opacity ?? 1,
          background:   mc.bgColor || "rgba(255,255,255,0.04)",
          border:       "1px solid rgba(255,255,255,0.08)",
          display:      "flex",
          flexDirection: "column",
          alignItems:   "center",
          justifyContent: "center",
          gap:          6,
          padding:      12,
        }}
      >
        <span style={{ fontSize: 18, opacity: 0.7 }}>🎵</span>
        {mc.mood && <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{mc.mood}</span>}
        {mc.musicUrl && <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.25)", maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mc.musicUrl}</span>}
        {!mc.musicUrl && !mc.mood && <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: 1.5, textTransform: "uppercase" }}>Now Playing</span>}
      </div>
    );
  }

  if (el.elementType === "links") {
    const lc = el as LinksCardData & { elementType: "links" };
    return (
      <div
        onMouseDown={e => onDragStart(el.id, e, el.x, el.y)}
        style={{
          ...wrapStyle,
          borderRadius: lc.borderRadius ?? 8,
          opacity:      lc.opacity ?? 1,
          background:   lc.bgColor || "rgba(255,255,255,0.04)",
          border:       "1px solid rgba(255,255,255,0.08)",
          display:      "flex",
          flexDirection: "column",
          gap:          4,
          padding:      12,
          overflow:     "hidden",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 4 }}>Links</span>
        {lc.links.slice(0, 4).map(l => (
          <div key={l.id} style={{
            fontFamily:    SANS,
            fontSize:      11,
            color:         lc.textColor || "rgba(255,255,255,0.65)",
            background:    "rgba(255,255,255,0.04)",
            borderRadius:  5,
            padding:       "4px 8px",
            overflow:      "hidden",
            textOverflow:  "ellipsis",
            whiteSpace:    "nowrap",
          }}>
            {l.label || l.url}
          </div>
        ))}
      </div>
    );
  }

  if (el.elementType === "stats") {
    const sc = el as StatsCardData & { elementType: "stats" };
    return (
      <div
        onMouseDown={e => onDragStart(el.id, e, el.x, el.y)}
        style={{
          ...wrapStyle,
          borderRadius: sc.borderRadius ?? 8,
          opacity:      sc.opacity ?? 1,
          background:   sc.bgColor || "rgba(255,255,255,0.04)",
          border:       "1px solid rgba(255,255,255,0.08)",
          display:      "flex",
          flexWrap:     "wrap",
          alignItems:   "center",
          justifyContent: "center",
          gap:          12,
          padding:      12,
          overflow:     "hidden",
        }}
      >
        {(sc.stats ?? []).filter(s => s.visible).slice(0, 4).map(s => (
          <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: sc.textColor || "rgba(255,255,255,0.85)" }}>—</span>
            <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{s.label}</span>
          </div>
        ))}
        {(!sc.stats || sc.stats.filter(s => s.visible).length === 0) && (
          <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: 1.5, textTransform: "uppercase" }}>Stats</span>
        )}
      </div>
    );
  }

  return null;
}
