"use client";
import { useState, memo } from "react";
import { trackRender } from "@/lib/perfDebug";
import type { CanvasMedia, MediaType } from "@/types";

const MONO = "'Space Mono', monospace";
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

// ── URL parsing ────────────────────────────────────────────────────────────────

type ParsedMedia = {
  embedUrl:  string;
  mediaType: MediaType;
  label:     string;
  defaultW:  number;
  defaultH:  number;
};

function parseMediaUrl(raw: string): ParsedMedia | null {
  const url = raw.trim();
  if (!url) return null;
  try {
    const full = url.startsWith("http") ? url : `https://${url}`;
    const u    = new URL(full);

    if (u.hostname === "open.spotify.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      const kind  = parts[0] ?? "track";
      const isLong = kind === "playlist" || kind === "album";
      return {
        embedUrl:  `https://open.spotify.com/embed${u.pathname}?utm_source=generator&theme=0`,
        mediaType: "spotify",
        label:     `SPOTIFY / ${kind.toUpperCase()}`,
        defaultW:  280,
        defaultH:  isLong ? 380 : 80,
      };
    }

    if (u.hostname === "youtube.com" || u.hostname === "www.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return { embedUrl: `https://www.youtube.com/embed/${id}?playsinline=1`, mediaType: "youtube", label: "YOUTUBE", defaultW: 320, defaultH: 180 };
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { embedUrl: `https://www.youtube.com/embed/${id}?playsinline=1`, mediaType: "youtube", label: "YOUTUBE", defaultW: 320, defaultH: 180 };
    }
    if (u.hostname.includes("soundcloud.com")) {
      return {
        embedUrl:  `https://w.soundcloud.com/player/?url=${encodeURIComponent(full)}&color=%23888888&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
        mediaType: "soundcloud",
        label:     "SOUNDCLOUD",
        defaultW:  280,
        defaultH:  166,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function iframeAllow(type: MediaType): string {
  if (type === "youtube")    return "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  if (type === "soundcloud") return "autoplay";
  return "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
}

function dotColor(type: MediaType): string {
  if (type === "spotify")    return "rgba(30,215,96,0.75)";
  if (type === "youtube")    return "rgba(255,50,50,0.75)";
  return                            "rgba(255,90,20,0.75)";   // soundcloud
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  media:             CanvasMedia & { elementType: "media" };
  isSel:             boolean;
  draggingId:        string | null;
  parallaxTransform: string;
  onMouseDown:       (e: React.MouseEvent) => void;
  onClick:           (e: React.MouseEvent) => void;
  onResizeMD:        (e: React.MouseEvent) => void;
  onRotateMD:        (e: React.MouseEvent) => void;
  updateMedia:       (id: string, patch: Partial<CanvasMedia>) => void;
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:      boolean;
}

function MediaCardWidget({
  media, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateMedia, locked, onToggleLock, canInteract,
}: Props) {
  if (process.env.NODE_ENV !== "production") trackRender("MediaCardWidget");
  const [inputVal,   setInputVal]   = useState("");
  const [inputError, setInputError] = useState(false);

  const parsed    = media.url ? parseMediaUrl(media.url) : null;
  const hasMedia  = !!parsed;
  const isDragging = draggingId === media.id;

  function handleSubmit() {
    const p = parseMediaUrl(inputVal);
    if (!p) {
      setInputError(true);
      setTimeout(() => setInputError(false), 1200);
      return;
    }
    updateMedia(media.id, {
      url:       inputVal.trim(),
      mediaType: p.mediaType,
      w:         p.defaultW,
      h:         p.defaultH + 32,
    });
    setInputVal("");
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{
        position:   "absolute",
        left:       media.x,
        top:        media.y,
        width:      media.w,
        height:     media.h,
        zIndex:     media.zIndex + media.layer * 100,
        transform:  `${parallaxTransform} rotate(${media.rotation}deg)`,
        willChange: "transform",
        userSelect: "none",
        cursor:     isDragging ? "grabbing" : (canInteract && !locked) ? "grab" : "default",
      }}
    >
      {/* ── Frame ── */}
      <div style={{
        position:      "absolute",
        inset:         0,
        borderRadius:  4,
        background:    "#0b0b0d",
        border:        `1px solid ${isSel ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.09)"}`,
        boxShadow:     isSel
          ? "0 12px 40px rgba(0,0,0,0.88), 0 0 0 1px rgba(255,255,255,0.05)"
          : "0 4px 18px rgba(0,0,0,0.6)",
        display:       "flex",
        flexDirection: "column",
        overflow:      "hidden",
        transition:    `border-color 0.12s ${EASE}, box-shadow 0.12s ${EASE}`,
      }}>

        {/* ── Header ── */}
        <div style={{
          height:       32,
          flexShrink:   0,
          display:      "flex",
          alignItems:   "center",
          padding:      "0 8px 0 10px",
          background:   "#07070a",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          cursor:       isDragging ? "grabbing" : (canInteract && !locked) ? "grab" : "default",
          gap:          8,
        }}>
          <div style={{
            width:        4,
            height:       4,
            borderRadius: "50%",
            background:   hasMedia ? dotColor(parsed!.mediaType) : "rgba(255,255,255,0.2)",
            flexShrink:   0,
            transition:   "background 0.2s ease",
          }} />

          <span style={{
            fontFamily:    MONO,
            fontSize:      8,
            letterSpacing: 2,
            color:         hasMedia ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.28)",
            textTransform: "uppercase",
            flex:          1,
            overflow:      "hidden",
            textOverflow:  "ellipsis",
            whiteSpace:    "nowrap",
            transition:    "color 0.12s ease",
          }}>
            {hasMedia ? parsed!.label : "MEDIA"}
          </span>

          {canInteract && hasMedia && (
            <HeaderBtn
              onClick={() => { updateMedia(media.id, { url: "", mediaType: "spotify" }); setInputVal(""); }}
              title="Change link"
            >
              ×
            </HeaderBtn>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {hasMedia ? (
            <iframe
              src={parsed!.embedUrl}
              width="100%"
              height="100%"
              style={{ border: "none", display: "block" }}
              allow={iframeAllow(parsed!.mediaType)}
              allowFullScreen
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
              onMouseDown={e => e.stopPropagation()}
            />
          ) : canInteract ? (
            <InputState
              value={inputVal}
              onChange={v => { setInputVal(v); setInputError(false); }}
              onSubmit={handleSubmit}
              error={inputError}
            />
          ) : (
            <div style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              height:         "100%",
              fontFamily:     MONO,
              fontSize:       7,
              letterSpacing:  2,
              color:          "rgba(255,255,255,0.1)",
              textTransform:  "uppercase",
            }}>
              NO SIGNAL
            </div>
          )}
        </div>
      </div>

      {/* ── Resize handle ── */}
      {isSel && canInteract && !locked && (
        <div
          onMouseDown={e => { e.stopPropagation(); onResizeMD(e); }}
          style={{
            position:   "absolute", bottom: -5, right: -5,
            width: 10, height: 10, borderRadius: "50%",
            background: "rgba(255,255,255,0.65)", cursor: "nwse-resize",
            border: "1.5px solid rgba(0,0,0,0.2)", zIndex: 10,
            transition: `transform 0.1s ${EASE}`,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.3)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        />
      )}

      {/* ── Rotate handle ── */}
      {isSel && canInteract && !locked && (
        <div
          onMouseDown={e => { e.stopPropagation(); onRotateMD(e); }}
          style={{
            position:  "absolute", top: -10, right: -10,
            width: 20, height: 20, borderRadius: "50%",
            background: "rgba(12,12,14,0.96)", border: "1px solid rgba(255,255,255,0.1)",
            cursor: "crosshair", zIndex: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            transition: `all 0.12s ${EASE}`,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,240,196,0.4)"; e.currentTarget.style.background = "rgba(212,240,196,0.08)"; e.currentTarget.style.transform = "scale(1.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";  e.currentTarget.style.background = "rgba(12,12,14,0.96)";   e.currentTarget.style.transform = "scale(1)"; }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6" /><path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
          </svg>
        </div>
      )}

      {/* ── Lock toggle ── */}
      {isSel && canInteract && onToggleLock && (
        <div
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onToggleLock(); }}
          style={{
            position:  "absolute", top: -22, right: 0,
            width: 16, height: 16, borderRadius: 4, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: locked ? "rgba(255,180,60,0.15)" : "rgba(255,255,255,0.06)",
            border:     locked ? "1px solid rgba(255,180,60,0.3)" : "1px solid rgba(255,255,255,0.07)",
            color:      locked ? "rgba(255,180,60,0.9)" : "rgba(255,255,255,0.32)",
            zIndex:     20,
            transition: `all 0.12s ${EASE}`,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {locked ? (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          ) : (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
          )}
        </div>
      )}
    </div>
  );
}

// ── URL input state ────────────────────────────────────────────────────────────

function InputState({
  value, onChange, onSubmit, error,
}: {
  value:    string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  error:    boolean;
}) {
  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        height:         "100%",
        padding:        "10px 14px",
        gap:            7,
      }}
    >
      <div style={{
        fontFamily:    MONO,
        fontSize:      7,
        letterSpacing: 2,
        color:         "rgba(255,255,255,0.2)",
        textTransform: "uppercase",
      }}>
        PASTE LINK
      </div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSubmit(); } }}
        placeholder="spotify · youtube · soundcloud"
        autoFocus
        style={{
          width:         "100%",
          background:    error ? "rgba(255,60,60,0.07)" : "rgba(255,255,255,0.04)",
          border:        `1px solid ${error ? "rgba(255,80,80,0.4)" : "rgba(255,255,255,0.1)"}`,
          borderRadius:  3,
          padding:       "6px 10px",
          color:         "rgba(255,255,255,0.75)",
          fontFamily:    MONO,
          fontSize:      9,
          letterSpacing: 0.3,
          outline:       "none",
          textAlign:     "center",
          transition:    "border-color 0.1s ease, background 0.1s ease",
          boxSizing:     "border-box" as const,
        }}
      />
      {error && (
        <div style={{
          fontFamily:    MONO,
          fontSize:      7,
          letterSpacing: 1,
          color:         "rgba(255,100,80,0.7)",
          textTransform: "uppercase",
        }}>
          UNRECOGNIZED URL
        </div>
      )}
    </div>
  );
}

// ── Header button ──────────────────────────────────────────────────────────────

function HeaderBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseDown={e => e.stopPropagation()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   hov ? "rgba(255,255,255,0.09)" : "transparent",
        border:       `1px solid ${hov ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}`,
        color:        hov ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.28)",
        cursor:       "pointer",
        fontFamily:   MONO,
        fontSize:     10,
        padding:      "0 4px",
        lineHeight:   "19px",
        borderRadius: 2,
        transition:   "all 0.1s ease",
        minWidth:     20,
        textAlign:    "center" as const,
        userSelect:   "none",
      }}
    >
      {children}
    </button>
  );
}

function areMediaPropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.media             === next.media &&
    prev.isSel             === next.isSel &&
    prev.draggingId        === next.draggingId &&
    prev.locked            === next.locked &&
    prev.canInteract       === next.canInteract &&
    prev.parallaxTransform === next.parallaxTransform
  );
}
export default memo(MediaCardWidget, areMediaPropsEqual);
