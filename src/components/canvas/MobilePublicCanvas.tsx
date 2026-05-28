"use client";
import { useState, useEffect } from "react";
import type React from "react";
import type { CanvasState, TextFont } from "@/types";
import { bgImageStyle } from "@/lib/bgStyle";
import { createClient } from "@/lib/supabase/client";

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

const LOGICAL_WIDTH  = 390;
const LOGICAL_HEIGHT = 3000;

const EMPTY: CanvasState = {
  cards: [], images: [], texts: [], galleries: [],
  profiles: [], medias: [], bgColor: "#0a0a0c", wallpaper: "",
};

export default function MobilePublicCanvas({
  state: propState,
  handle = "",
  name = "",
  userId,
  preview = false,
  readOnly = false,
}: {
  state?: CanvasState;
  handle?: string;
  name?: string;
  userId?: string;
  preview?: boolean;
  readOnly?: boolean;
}) {
  const isPreview = preview || readOnly;
  const [fetchedState, setFetchedState] = useState<CanvasState | null>(null);

  useEffect(() => {
    if (!userId) return;
    const sb = createClient();
    sb.from("canvases")
      .select("data")
      .eq("user_id", userId)
      .eq("type", "space_mobile")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.data) setFetchedState(data.data as CanvasState);
        else setFetchedState(EMPTY);
      });
  }, [userId]);

  const state: CanvasState = propState ?? fetchedState ?? EMPTY;

  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      setScale(window.innerWidth / LOGICAL_WIDTH);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const hasWallpaper = !!(state.wallpaper && !state.wallpaper.startsWith("blob:"));
  const bgStyle: React.CSSProperties = {
    backgroundColor: state.bgColor || "#0a0a0c",
    ...(hasWallpaper ? {
      backgroundImage: `url(${state.wallpaper})`,
      backgroundRepeat: "repeat",
      backgroundSize: "auto",
      backgroundPosition: "top left",
    } : {}),
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        overflowX: "hidden",
        overflowY: "auto",
        fontFamily: SANS,
        ...bgStyle,
      }}
    >
      {/* Topbar */}
      {!isPreview && (
        <div style={{
          position: "sticky", top: 0, left: 0, right: 0, height: 40, zIndex: 800,
          display: "flex", alignItems: "center", padding: "0 14px", gap: 10,
          background: state.wallpaper ? "rgba(0,0,0,0.35)" : "rgba(8,8,8,0.85)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(232,224,212,0.9)" }} />
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2.5, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>MNEMO</span>
          </div>
          <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.07)" }} />
          <span style={{ fontFamily: SANS, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{name}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>@{handle}</span>
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
            const hasBgImg = card.bgImage && !card.bgImage.startsWith("blob:");
            return (
              <div key={card.id} style={{
                position: "absolute",
                left: card.x, top: card.y, width: card.w, height: card.h,
                zIndex: card.zIndex + card.layer * 100,
                transform: `rotate(${card.rotation ?? 0}deg)`,
                borderRadius: card.borderRadius, opacity: card.opacity, cursor: "default",
                ...(hasBgImg ? bgImageStyle(card.bgImage, card.bgMode) : { background: card.bgColor || "rgba(255,255,255,0.04)" }),
                border: "1px solid rgba(255,255,255,0.06)",
              }} />
            );
          })}

          {/* Texts */}
          {(state.texts ?? []).map(txt => (
            <div key={txt.id} style={{
              position: "absolute", left: txt.x, top: txt.y,
              zIndex: txt.zIndex + txt.layer * 100,
              transform: `rotate(${txt.rotation ?? 0}deg)`,
            }}>
              <div style={{
                fontFamily: FONT_MAP[txt.font] ?? SANS, fontSize: txt.size, color: txt.color,
                opacity: txt.opacity, letterSpacing: txt.letterSpacing,
                textTransform: txt.uppercase ? "uppercase" : "none",
                cursor: "default", whiteSpace: "pre-wrap", userSelect: "none",
              }}>
                {txt.content}
              </div>
            </div>
          ))}

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
            return (
              <div key={media.id} style={{
                position: "absolute", left: media.x, top: media.y, width: media.w, height: media.h,
                zIndex: media.zIndex + media.layer * 100,
                transform: `rotate(${media.rotation ?? 0}deg)`,
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
            const safeLink = img.linkUrl && (img.linkUrl.startsWith("https://") || img.linkUrl.startsWith("http://"))
              ? img.linkUrl : null;
            return (
              <div key={img.id} style={{
                position: "absolute", left: img.x, top: img.y, width: img.w, height: img.h,
                zIndex: img.zIndex + img.layer * 100,
                transform: `rotate(${img.rotation ?? 0}deg)`,
                cursor: safeLink ? "pointer" : "default",
              }}
                onClick={safeLink ? () => window.open(safeLink, "_blank", "noopener,noreferrer") : undefined}
              >
                <img src={img.src} draggable={false} alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: img.isTransparent ? 0 : 8 }} />
              </div>
            );
          })}

          {/* Profiles */}
          {(state.profiles ?? []).map(profile => {
            const hasPhoto = profile.photo && !profile.photo.startsWith("blob:");
            const links = (profile.links ?? []).filter(l => l.url);
            return (
              <div key={profile.id} style={{
                position: "absolute", left: profile.x, top: profile.y, width: profile.w, height: profile.h,
                zIndex: profile.zIndex + profile.layer * 100,
                transform: `rotate(${profile.rotation ?? 0}deg)`,
                borderRadius: profile.borderRadius, opacity: profile.opacity, cursor: "default",
                background: profile.bgColor || "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: 16,
              }}>
                {hasPhoto && <img src={profile.photo} alt="" draggable={false} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />}
                {profile.name && <span style={{ fontFamily: SANS, fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{profile.name}</span>}
                {profile.status && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{profile.status}</span>}
                {links.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", marginTop: 2 }}>
                    {links.map(link => {
                      const safeUrl = link.url.startsWith("http") ? link.url : `https://${link.url}`;
                      return (
                        <MobileLinkButton key={link.id} label={link.label} icon={link.icon} href={safeUrl} />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MobileLinkButton({ label, icon, href }: { label: string; icon?: string; href: string }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); window.open(href, "_blank", "noopener,noreferrer"); }}
      style={{
        display:              "flex",
        alignItems:           "center",
        justifyContent:       "center",
        gap:                  5,
        padding:              "6px 16px",
        borderRadius:         100,
        background:           "rgba(255,255,255,0.06)",
        border:               "1px solid rgba(255,255,255,0.1)",
        cursor:               "pointer",
        minWidth:             80,
        maxWidth:             160,
        userSelect:           "none",
      }}
    >
      {icon && <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{icon}</span>}
      <span style={{
        fontFamily:    SANS,
        fontSize:      11,
        fontWeight:    600,
        color:         "rgba(255,255,255,0.55)",
        letterSpacing: 1.2,
        textTransform: "uppercase" as const,
        whiteSpace:    "nowrap",
        overflow:      "hidden",
        textOverflow:  "ellipsis",
        maxWidth:      110,
      }}>
        {label || href}
      </span>
    </div>
  );
}
