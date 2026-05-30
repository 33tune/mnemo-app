"use client";
import { useState, useEffect } from "react";
import type React from "react";
import type { CanvasState, TextFont } from "@/types";
import { bgImageStyle } from "@/lib/bgStyle";
import { useParallax } from "@/hooks/useParallax";
import { createClient } from "@/lib/supabase/client";
import { useElementPins } from "@/hooks/useElementPins";
import AnonymousMessageWidget from "./AnonymousMessageWidget";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

const FONT_MAP: Record<TextFont, string> = {
  "DM Sans":          "'DM Sans', sans-serif",
  "Space Mono":       "'Space Mono', monospace",
  "Impact":           "Impact, sans-serif",
  "Playfair Display": "'Playfair Display', serif",
  "Bebas Neue":       "'Bebas Neue', sans-serif",
  "Syne":             "'Syne', sans-serif",
};

const LOGICAL_WIDTH  = 1920;
const LOGICAL_HEIGHT = 3000;

const EMPTY: CanvasState = {
  cards: [], images: [], texts: [], galleries: [],
  profiles: [], medias: [], guestbooks: [], bgColor: "#0a0a0c", wallpaper: "",
};

export default function PublicCanvas({
  state: propState,
  handle = "",
  name = "",
  toUserId,
  preview = false,
  readOnly = false,
  userId,
}: {
  state?: CanvasState;
  handle?: string;
  name?: string;
  toUserId?: string;
  preview?: boolean;
  readOnly?: boolean;
  userId?: string;
}) {
  const isPreview = preview || readOnly;
  const [fetchedState,   setFetchedState]   = useState<CanvasState | null>(null);
  const [currentUserId,  setCurrentUserId]  = useState<string | undefined>(undefined);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? undefined));
  }, []);

  useEffect(() => {
    if (!userId) return;
    const sb = createClient();
    sb.from("canvases")
      .select("data")
      .eq("user_id", userId)
      .eq("type", "space")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.data) setFetchedState(data.data as CanvasState);
        else setFetchedState(EMPTY);
      });
  }, [userId]);

  const state: CanvasState = propState ?? fetchedState ?? (userId ? EMPTY : EMPTY);

  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      setScale(Math.min(window.innerWidth / LOGICAL_WIDTH, 1));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { handleMouseMoveParallax, getParallaxStyle } = useParallax();
  const ownerUserId = userId ?? state.profiles?.[0]?.userId ?? undefined;
  const { pinnedIds, pinCounts, togglePin } = useElementPins(
    !isPreview ? ownerUserId : undefined,
    !isPreview ? currentUserId : undefined,
  );

  const hasWallpaper = !!(state.wallpaper && !state.wallpaper.startsWith("blob:"));
  const wpBlur       = state.wallpaperBlur       ?? 0;
  const wpBrightness = state.wallpaperBrightness ?? 100;
  const wpVignette   = state.wallpaperVignette   ?? 0;
  const wpFilter     = [
    wpBlur > 0          ? `blur(${wpBlur}px)`             : "",
    wpBrightness !== 100 ? `brightness(${wpBrightness}%)` : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      id="public-canvas-root"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        overflowX: "hidden",
        overflowY: "auto",
        fontFamily: SANS,
        backgroundColor: state.bgColor || "#0a0a0c",
      }}
    >
      {/* Background layers — wallpaper + effects */}
      {hasWallpaper && (
        <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{
            position: "absolute",
            inset: wpBlur > 0 ? `-${wpBlur * 2}px` : 0,
            backgroundImage: `url(${state.wallpaper})`,
            backgroundRepeat: "repeat",
            backgroundSize: "auto",
            backgroundPosition: "top left",
            filter: wpFilter || undefined,
          }} />
          {wpVignette > 0 && (
            <div style={{
              position: "absolute", inset: 0,
              background: `radial-gradient(ellipse at center, transparent ${Math.max(0, 85 - wpVignette * 0.7)}%, rgba(0,0,0,${(wpVignette / 100) * 0.92}) 100%)`,
            }} />
          )}
        </div>
      )}
      {/* Topbar */}
      {!isPreview && (
      <div style={{
        position: "sticky", top: 0, left: 0, right: 0, height: 44, zIndex: 800,
        display: "flex", alignItems: "center", padding: "0 20px", gap: 16,
        background: state.wallpaper ? "rgba(0,0,0,0.35)" : "rgba(8,8,8,0.85)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(232,224,212,0.9)", boxShadow: "0 0 8px rgba(232,224,212,0.4)" }} />
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: "rgba(255,255,255,0.5)" }}>myLand</span>
        </div>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.07)" }} />
        <span style={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{name}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>@{handle}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 100, border: "1px solid rgba(212,240,196,0.15)" }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(212,240,196,0.5)" }} />
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: "rgba(212,240,196,0.45)", textTransform: "uppercase" }}>público</span>
        </div>
      </div>
      )}

      {/* Scaled world wrapper */}
      <div style={{
        position: "relative",
        width: LOGICAL_WIDTH * scale,
        height: LOGICAL_HEIGHT * scale,
        margin: "0 auto",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {/* Logical fixed world */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: LOGICAL_WIDTH,
          height: LOGICAL_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}>

            {/* Cards */}
            {(state.cards ?? []).map(card => {
              const ps = getParallaxStyle(card.layer, card.depth);
              const hasBgImg = card.bgImage && !card.bgImage.startsWith("blob:");
              return (
                <div key={card.id} style={{
                  position: "absolute",
                  left: card.x, top: card.y, width: card.w, height: card.h,
                  zIndex: card.zIndex + card.layer * 100,
                  transform: `${ps.transform} rotate(${card.rotation ?? 0}deg)`,
                  borderRadius: card.borderRadius, opacity: card.opacity, cursor: "default",
                  ...(hasBgImg ? bgImageStyle(card.bgImage, card.bgMode) : { background: card.bgColor || "rgba(255,255,255,0.04)" }),
                  border: "1px solid rgba(255,255,255,0.06)", willChange: "transform",
                }} />
              );
            })}

            {/* Texts */}
            {(state.texts ?? []).map(txt => {
              const ps       = getParallaxStyle(txt.layer, txt.depth);
              const isPinned = pinnedIds.has(txt.id);
              const count    = pinCounts.get(txt.id) ?? 0;
              return (
                <div key={txt.id} style={{
                  position: "absolute", left: txt.x, top: txt.y,
                  zIndex: txt.zIndex + txt.layer * 100,
                  transform: `${ps.transform} rotate(${txt.rotation ?? 0}deg)`,
                  willChange: "transform",
                  maxWidth: Math.max(80, LOGICAL_WIDTH - txt.x - 8),
                }}>
                  <div style={{
                    fontFamily: FONT_MAP[txt.font] ?? SANS, fontSize: txt.size, color: txt.color,
                    opacity: txt.opacity, letterSpacing: txt.letterSpacing,
                    textTransform: txt.uppercase ? "uppercase" : "none",
                    cursor: "default", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word", userSelect: "none",
                  }}>
                    {txt.content}
                  </div>
                  {!isPreview && (
                    <PinOverlay
                      isPinned={isPinned}
                      count={count}
                      onToggle={() => {
                        if (!currentUserId) { window.location.href = "/login"; return; }
                        togglePin(txt.id, "text", { content: txt.content, font: txt.font, size: txt.size, color: txt.color });
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Media embeds */}
            {(state.medias ?? []).map(media => {
              const url = media.url?.trim();
              if (!url) return null;
              let embedUrl = "";
              let allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
              try {
                const u = new URL(url.startsWith("http") ? url : `https://${url}`);
                if (u.hostname === "open.spotify.com") {
                  embedUrl = `https://open.spotify.com/embed${u.pathname}?utm_source=generator&theme=0`;
                } else if (u.hostname === "youtube.com" || u.hostname === "www.youtube.com") {
                  const id = u.searchParams.get("v");
                  if (id) { embedUrl = `https://www.youtube.com/embed/${id}?playsinline=1`; allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"; }
                } else if (u.hostname === "youtu.be") {
                  const id = u.pathname.slice(1);
                  if (id) { embedUrl = `https://www.youtube.com/embed/${id}?playsinline=1`; allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"; }
                } else if (u.hostname.includes("soundcloud.com")) {
                  embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23888888&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
                  allow = "autoplay";
                }
              } catch { return null; }
              if (!embedUrl) return null;
              const ps = getParallaxStyle(media.layer, media.depth);
              return (
                <div key={media.id} style={{
                  position: "absolute", left: media.x, top: media.y, width: media.w, height: media.h,
                  zIndex: media.zIndex + media.layer * 100,
                  transform: `${ps.transform} rotate(${media.rotation ?? 0}deg)`, willChange: "transform",
                  borderRadius: 4, overflow: "hidden",
                  background: "#0b0b0d", border: "1px solid rgba(255,255,255,0.09)",
                }}>
                  <iframe
                    src={embedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: "none", display: "block" }}
                    allow={allow}
                    allowFullScreen
                    loading="eager"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              );
            })}

            {/* Images */}
            {(state.images ?? []).filter(img => !img.src?.startsWith("blob:")).map(img => {
              const ps       = getParallaxStyle(img.layer, img.depth);
              const isPinned = pinnedIds.has(img.id);
              const count    = pinCounts.get(img.id) ?? 0;
              const safeLink = img.linkUrl && (img.linkUrl.startsWith("https://") || img.linkUrl.startsWith("http://"))
                ? img.linkUrl : null;
              return (
                <div key={img.id}
                  style={{
                    position: "absolute", left: img.x, top: img.y, width: img.w, height: img.h,
                    zIndex: img.zIndex + img.layer * 100,
                    transform: `${ps.transform} rotate(${img.rotation ?? 0}deg)`, willChange: "transform",
                    cursor: safeLink ? "pointer" : "default",
                    pointerEvents: safeLink ? "auto" : "none",
                  }}
                  onClick={safeLink ? () => window.open(safeLink, "_blank", "noopener,noreferrer") : undefined}
                >
                  <img src={img.src} draggable={false} alt=""
                    style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: img.isTransparent ? 0 : 8 }} />
                  {safeLink && (
                    <div style={{
                      position: "absolute", bottom: 6, right: 6,
                      fontFamily: "'Space Mono', monospace", fontSize: 9,
                      color: "rgba(255,255,255,0.28)", lineHeight: 1,
                      pointerEvents: "none", userSelect: "none",
                    }}>↗</div>
                  )}
                  {!isPreview && (
                    <PinOverlay
                      isPinned={isPinned}
                      count={count}
                      onToggle={() => {
                        if (!currentUserId) { window.location.href = "/login"; return; }
                        togglePin(img.id, "image", { src: img.src, w: img.w, h: img.h });
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Profiles */}
            {(state.profiles ?? []).map(profile => {
              const ps = getParallaxStyle(profile.layer, profile.depth);
              const hasPhoto = profile.photo && !profile.photo.startsWith("blob:");
              const links = (profile.links ?? []).filter(l => l.url);
              return (
                <div key={profile.id} style={{
                  position: "absolute", left: profile.x, top: profile.y, width: profile.w, height: profile.h,
                  zIndex: profile.zIndex + profile.layer * 100,
                  transform: `${ps.transform} rotate(${profile.rotation ?? 0}deg)`,
                  borderRadius: profile.borderRadius, opacity: profile.opacity, cursor: "default",
                  background: profile.bgColor || "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: 16, willChange: "transform",
                }}>
                  {hasPhoto && <img src={profile.photo} alt="" draggable={false} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />}
                  {profile.name && <span style={{ fontFamily: SANS, fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{profile.name}</span>}
                  {profile.status && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{profile.status}</span>}
                  {links.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", marginTop: 2 }}>
                      {links.map(link => {
                        const safeUrl = link.url.startsWith("http") ? link.url : `https://${link.url}`;
                        return (
                          <PublicLinkButton key={link.id} label={link.label} icon={link.icon} href={safeUrl} />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}


        </div>
      </div>

      {toUserId && <AnonymousMessageWidget toUserId={toUserId} />}
    </div>
  );
}

function PublicLinkButton({ label, icon, href }: { label: string; icon?: string; href: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={e => { e.stopPropagation(); window.open(href, "_blank", "noopener,noreferrer"); }}
      style={{
        display:              "flex",
        alignItems:           "center",
        justifyContent:       "center",
        gap:                  5,
        padding:              "5px 14px",
        borderRadius:         100,
        background:           hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
        border:               `1px solid ${hov ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"}`,
        cursor:               "pointer",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        transition:           "all 0.15s ease",
        minWidth:             80,
        maxWidth:             160,
        userSelect:           "none",
        transform:            hov ? "translateY(-1px)" : "translateY(0)",
        boxShadow:            hov ? "0 4px 16px rgba(0,0,0,0.18)" : "none",
      }}
    >
      {icon && <span style={{ fontSize: 11, lineHeight: 1, flexShrink: 0 }}>{icon}</span>}
      <span style={{
        fontFamily:    SANS,
        fontSize:      9,
        fontWeight:    600,
        color:         hov ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.55)",
        letterSpacing: 1.2,
        textTransform: "uppercase" as const,
        whiteSpace:    "nowrap",
        overflow:      "hidden",
        textOverflow:  "ellipsis",
        maxWidth:      110,
        transition:    "color 0.15s ease",
      }}>
        {label || href}
      </span>
    </div>
  );
}

const MONO_PIN = "'Space Mono', monospace";

function PinOverlay({ isPinned, count, onToggle }: { isPinned: boolean; count: number; onToggle: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "absolute", top: 6, right: 6,
        opacity: hov || isPinned || count > 0 ? 1 : 0,
        transition: "opacity 0.15s",
        display: "flex", alignItems: "center", gap: 3,
      }}
    >
      {count > 0 && (
        <span style={{ fontFamily: MONO_PIN, fontSize: 8, color: "rgba(255,255,255,0.5)", background: "rgba(0,0,0,0.6)", borderRadius: 3, padding: "1px 4px" }}>
          {count}
        </span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onToggle(); }}
        title={isPinned ? "Unpin" : "Pin"}
        style={{
          width: 22, height: 22,
          borderRadius: "50%",
          border: `1px solid ${isPinned ? "rgba(212,240,196,0.5)" : "rgba(255,255,255,0.25)"}`,
          background: isPinned ? "rgba(212,240,196,0.15)" : "rgba(0,0,0,0.55)",
          color: isPinned ? "rgba(212,240,196,0.9)" : "rgba(255,255,255,0.6)",
          fontSize: 10,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(6px)",
          transition: "all 0.1s",
          flexShrink: 0,
        }}
      >
        {isPinned ? "★" : "☆"}
      </button>
    </div>
  );
}
