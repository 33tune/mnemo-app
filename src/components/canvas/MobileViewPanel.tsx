"use client";
import { useRef, useEffect } from "react";
import type { CanvasElement, CanvasImage as CanvasImageType, CanvasCard, CanvasText, CanvasGallery, CanvasMedia, GuestbookCardData, SocialCardData, MusicCardData, LinksCardData, StatsCardData, ProfileCardData } from "@/types";
import ProfileCard from "./ProfileCard";
import GalleryWidget from "./GalleryWidget";
import SocialCardWidget from "./SocialCardWidget";
import MusicCardWidget from "./MusicCardWidget";
import LinksCardWidget from "./LinksCardWidget";
import MediaCardWidget from "./MediaCardWidget";
import { bgImageStyle } from "@/lib/bgStyle";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const PANEL_W = 422;

const FONT_MAP: Record<string, string> = {
  "DM Sans":          SANS,
  "Space Mono":       MONO,
  "Impact":           "Impact, sans-serif",
  "Playfair Display": "'Playfair Display', serif",
  "Bebas Neue":       "'Bebas Neue', sans-serif",
  "Syne":             "'Syne', sans-serif",
};

type Props = {
  isOpen:              boolean;
  onClose:             () => void;
  elements:            CanvasElement[];
  onDragMobileLayout:  (id: string, mobileX: number, mobileY: number) => void;
  onCommitMobileLayout:(id: string, mobileX: number, mobileY: number) => void;
  bgColor:             string;
  wallpaper:           string;
  wallpaperBlur:       number;
  wallpaperBrightness: number;
  wallpaperVignette:   number;
};

export default function MobileViewPanel({
  isOpen, onClose, elements,
  onDragMobileLayout, onCommitMobileLayout,
  bgColor, wallpaper, wallpaperBlur, wallpaperBrightness, wallpaperVignette,
}: Props) {
  const dragRef = useRef<{
    id: string; startX: number; startY: number; origX: number; origY: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) dragRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    const onUp = () => {
      if (dragRef.current) {
        // no-op; committed in onPanelPointerUp
      }
      dragRef.current = null;
    };
    document.addEventListener("pointerup", onUp);
    return () => document.removeEventListener("pointerup", onUp);
  }, []);

  if (!isOpen) return null;

  // Elements that have been registered on Mobile (have a mobileX placement)
  const mobileEls = elements.filter(e => e.mobileX != null);
  const sorted = [...mobileEls].sort((a, b) =>
    (a.zIndex + (a.layer ?? 0) * 100) - (b.zIndex + (b.layer ?? 0) * 100),
  );

  function beginDrag(id: string, e: React.PointerEvent | React.MouseEvent, origX: number, origY: number) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX, origY };
  }

  function onPanelPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const newX = Math.max(0, Math.round(d.origX + dx));
    const newY = Math.max(0, Math.round(d.origY + dy));
    onDragMobileLayout(d.id, newX, newY);
  }

  function onPanelPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const newX = Math.max(0, Math.round(d.origX + dx));
    const newY = Math.max(0, Math.round(d.origY + dy));
    onCommitMobileLayout(d.id, newX, newY);
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

  return (
    <div style={{
      position:            "fixed",
      top:                 44,
      right:               0,
      bottom:              0,
      width:               PANEL_W,
      zIndex:              250,
      display:             "flex",
      flexDirection:       "column",
      background:          "rgba(8,8,10,0.96)",
      backdropFilter:      "blur(24px)",
      WebkitBackdropFilter:"blur(24px)",
      borderLeft:          "1px solid rgba(255,255,255,0.08)",
      boxShadow:           "-8px 0 32px rgba(0,0,0,0.4)",
    }}>
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

      {/* Phone notch */}
      <div style={{
        flexShrink:     0,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        height:         28,
        background:     "rgba(0,0,0,0.4)",
        borderBottom:   "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ width: 48, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.1)" }} />
      </div>

      {/* Scrollable canvas */}
      <div
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
              position:           "absolute",
              inset:              wpBlur > 0 ? `-${wpBlur * 2}px` : 0,
              backgroundImage:    `url(${wallpaper})`,
              backgroundRepeat:   "repeat",
              backgroundSize:     "auto",
              backgroundPosition: "top left",
              filter:             wpFilter || undefined,
            }} />
            {wpVignette > 0 && (
              <div style={{
                position:   "absolute", inset: 0,
                background: `radial-gradient(ellipse at center, transparent ${Math.max(0, 85 - wpVignette * 0.7)}%, rgba(0,0,0,${(wpVignette / 100) * 0.92}) 100%)`,
              }} />
            )}
          </div>
        )}

        {/* Grid */}
        <div style={{
          position:        "absolute",
          inset:           0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)",
          backgroundSize:  "32px 32px",
          pointerEvents:   "none",
          zIndex:          1,
          minHeight:       "100%",
        }} />

        {/* Canvas world — 390px logical width, same coordinate system as Desktop */}
        <div style={{ position: "relative", width: 390, minHeight: "100%", zIndex: 2 }}>

          {sorted.map(el => (
            <MobilePanelElement
              key={el.id}
              el={el}
              onDragStart={beginDrag}
            />
          ))}

          {mobileEls.length === 0 && (
            <div style={{
              position:       "absolute",
              top:            60,
              left:           0,
              right:          0,
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              gap:            8,
              pointerEvents:  "none",
            }}>
              <span style={{ fontSize: 24, opacity: 0.25 }}>📱</span>
              <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
                Select an element · hit + Send to Mobile
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Home bar */}
      <div style={{
        flexShrink:     0,
        height:         28,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        background:     "rgba(0,0,0,0.4)",
        borderTop:      "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
      </div>
    </div>
  );
}

// ── Per-element renderer ────────────────────────────────────────────────────────
// Uses real widget components with mobile placement (mobileX/Y/W/H) and canInteract=false.
// A transparent drag overlay sits above each element to intercept repositioning.

type ElProps = {
  el:          CanvasElement;
  onDragStart: (id: string, e: React.MouseEvent, origX: number, origY: number) => void;
};

function MobilePanelElement({ el, onDragStart }: ElProps) {
  const mx  = el.mobileX!;
  const my  = el.mobileY!;
  const elA = el as { mobileW?: number; mobileH?: number; w?: number; h?: number };
  const mw  = elA.mobileW ?? elA.w ?? 200;
  const mh  = elA.mobileH ?? elA.h ?? 100;
  const z   = el.zIndex + (el.layer ?? 0) * 100;
  const rot = el.rotation ?? 0;

  const dragOverlay = (
    <div
      onMouseDown={e => onDragStart(el.id, e, mx, my)}
      style={{
        position:  "absolute",
        left:      mx,
        top:       my,
        width:     mw,
        height:    el.elementType === "text" ? (el as CanvasText & { elementType: "text" }).size * 1.5 : mh,
        zIndex:    z + 500,
        cursor:    "grab",
        background:"transparent",
      }}
    />
  );

  // ── Text ──────────────────────────────────────────────────────────────────────
  if (el.elementType === "text") {
    const txt = el as CanvasText & { elementType: "text" };
    return (
      <>
        <div style={{
          position:    "absolute",
          left:        mx,
          top:         my,
          zIndex:      z,
          transform:   `rotate(${rot}deg)`,
          maxWidth:    Math.max(60, 390 - mx - 8),
          pointerEvents: "none",
          userSelect:  "none",
        }}>
          <span style={{
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
          </span>
        </div>
        {dragOverlay}
      </>
    );
  }

  // ── Image ─────────────────────────────────────────────────────────────────────
  if (el.elementType === "image") {
    const img = el as CanvasImageType & { elementType: "image" };
    if (img.src?.startsWith("blob:")) return null;
    return (
      <>
        <div style={{
          position:  "absolute",
          left:      mx,
          top:       my,
          width:     mw,
          height:    mh,
          zIndex:    z,
          transform: `rotate(${rot}deg)`,
          pointerEvents: "none",
        }}>
          <img
            src={img.src}
            draggable={false}
            alt=""
            style={{
              width:         "100%",
              height:        "100%",
              objectFit:     "contain",
              borderRadius:  img.isTransparent ? 0 : (img.borderRadius ?? 8),
              userSelect:    "none",
            }}
          />
        </div>
        {dragOverlay}
      </>
    );
  }

  // ── Card ──────────────────────────────────────────────────────────────────────
  if (el.elementType === "card") {
    const card = el as CanvasCard & { elementType: "card" };
    const hasBg = card.bgImage && !card.bgImage.startsWith("blob:");
    return (
      <>
        <div
          style={{
            position:   "absolute",
            left:       mx,
            top:        my,
            width:      mw,
            height:     mh,
            zIndex:     z,
            transform:  `rotate(${rot}deg)`,
            borderRadius: card.borderRadius,
            opacity:    card.opacity,
            border:     "1px solid rgba(255,255,255,0.06)",
            pointerEvents: "none",
            ...(hasBg
              ? bgImageStyle(card.bgImage, card.bgMode)
              : { background: card.bgColor || "rgba(255,255,255,0.04)" }),
          }}
        />
        {dragOverlay}
      </>
    );
  }

  // ── Media embed ──────────────────────────────────────────────────────────────
  if (el.elementType === "media") {
    const proxy = { ...el, x: mx, y: my, w: mw, h: mh } as CanvasMedia & { elementType: "media" };
    return (
      <>
        <MediaCardWidget
          media={proxy}
          isSel={false}
          draggingId={null}
          parallaxTransform=""
          onMouseDown={() => {}}
          onClick={() => {}}
          onResizeMD={() => {}}
          onRotateMD={() => {}}
          updateMedia={() => {}}
          canInteract={false}
        />
        {dragOverlay}
      </>
    );
  }

  // ── Gallery ──────────────────────────────────────────────────────────────────
  if (el.elementType === "gallery") {
    const proxy = { ...el, x: mx, y: my, w: mw, h: mh } as CanvasGallery & { elementType: "gallery" };
    const cleanImages = proxy.images.filter(i => !i.src.startsWith("blob:"));
    if (cleanImages.length === 0) return null;
    const proxyClean = { ...proxy, images: cleanImages };
    return (
      <>
        <GalleryWidget
          gallery={proxyClean}
          isSel={false}
          multiSel={false}
          draggingId={null}
          parallaxTransform=""
          locked={false}
          onMouseDown={() => {}}
          onClick={() => {}}
          onResizeMD={() => {}}
          onRotateMD={() => {}}
          updateGallery={() => {}}
          onDropToCanvas={() => {}}
          canInteract={false}
        />
        {dragOverlay}
      </>
    );
  }

  // ── Profile Card — renders real ProfileCard with mobile placement ─────────────
  if (el.elementType === "profile") {
    const proxy = { ...el, x: mx, y: my, w: mw, h: mh } as ProfileCardData & { elementType: "profile" };
    return (
      <>
        <ProfileCard
          card={proxy}
          isSel={false}
          draggingId={null}
          parallaxTransform=""
          onMouseDown={() => {}}
          onClick={() => {}}
          onResizeMD={() => {}}
          onRotateMD={() => {}}
          updateProfile={() => {}}
          canInteract={false}
        />
        {dragOverlay}
      </>
    );
  }

  // ── Social Card ───────────────────────────────────────────────────────────────
  if (el.elementType === "social") {
    const proxy = { ...el, x: mx, y: my, w: mw, h: mh } as SocialCardData & { elementType: "social" };
    return (
      <>
        <SocialCardWidget
          card={proxy}
          isSel={false}
          draggingId={null}
          parallaxTransform=""
          onMouseDown={() => {}}
          onClick={() => {}}
          onResizeMD={() => {}}
          onRotateMD={() => {}}
          updateCard={() => {}}
          canInteract={false}
        />
        {dragOverlay}
      </>
    );
  }

  // ── Music Card ────────────────────────────────────────────────────────────────
  if (el.elementType === "music") {
    const proxy = { ...el, x: mx, y: my, w: mw, h: mh } as MusicCardData & { elementType: "music" };
    return (
      <>
        <MusicCardWidget
          card={proxy}
          isSel={false}
          draggingId={null}
          parallaxTransform=""
          onMouseDown={() => {}}
          onClick={() => {}}
          onResizeMD={() => {}}
          onRotateMD={() => {}}
          updateCard={() => {}}
          canInteract={false}
        />
        {dragOverlay}
      </>
    );
  }

  // ── Links Card ────────────────────────────────────────────────────────────────
  if (el.elementType === "links") {
    const proxy = { ...el, x: mx, y: my, w: mw, h: mh } as LinksCardData & { elementType: "links" };
    return (
      <>
        <LinksCardWidget
          card={proxy}
          isSel={false}
          draggingId={null}
          parallaxTransform=""
          onMouseDown={() => {}}
          onClick={() => {}}
          onResizeMD={() => {}}
          onRotateMD={() => {}}
          updateCard={() => {}}
          canInteract={false}
        />
        {dragOverlay}
      </>
    );
  }

  // ── Guestbook — static chrome only (avoids useGuestbook Supabase queries) ─────
  if (el.elementType === "guestbook") {
    const gb = el as GuestbookCardData & { elementType: "guestbook" };
    return (
      <>
        <div style={{
          position:     "absolute",
          left:         mx,
          top:          my,
          width:        mw,
          height:       mh,
          zIndex:       z,
          transform:    `rotate(${rot}deg)`,
          borderRadius: gb.borderRadius ?? 8,
          opacity:      gb.opacity ?? 1,
          background:   gb.bgColor || "rgba(255,255,255,0.04)",
          border:       "1px solid rgba(255,255,255,0.08)",
          display:      "flex",
          flexDirection:"column",
          alignItems:   "center",
          justifyContent: "center",
          gap:          6,
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: 20, opacity: 0.5 }}>✉️</span>
          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Guestbook</span>
        </div>
        {dragOverlay}
      </>
    );
  }

  // ── Stats — static chrome only (avoids useProfileViews Supabase queries) ──────
  if (el.elementType === "stats") {
    const sc = el as StatsCardData & { elementType: "stats" };
    return (
      <>
        <div style={{
          position:     "absolute",
          left:         mx,
          top:          my,
          width:        mw,
          height:       mh,
          zIndex:       z,
          transform:    `rotate(${rot}deg)`,
          borderRadius: sc.borderRadius ?? 8,
          opacity:      sc.opacity ?? 1,
          background:   sc.bgColor || "rgba(255,255,255,0.04)",
          border:       "1px solid rgba(255,255,255,0.08)",
          display:      "flex",
          flexWrap:     "wrap",
          alignItems:   "center",
          justifyContent: "center",
          gap:          16,
          padding:      12,
          pointerEvents: "none",
        }}>
          {(sc.stats ?? []).filter(s => s.visible).map(s => (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: sc.textColor || "rgba(255,255,255,0.85)" }}>—</span>
              <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{s.label}</span>
            </div>
          ))}
        </div>
        {dragOverlay}
      </>
    );
  }

  return null;
}
