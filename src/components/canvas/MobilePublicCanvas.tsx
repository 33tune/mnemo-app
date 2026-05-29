"use client";
import { useState, useEffect, useRef } from "react";
import type React from "react";
import type { CanvasState, TextFont, GuestbookMessage } from "@/types";
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
  profiles: [], medias: [], guestbooks: [], bgColor: "#0a0a0c", wallpaper: "",
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

          {/* Guestbooks */}
          {(state.guestbooks ?? []).map(gb => (
            <MobileGuestbookWidget
              key={gb.id}
              gb={gb}
              profileId={userId}
            />
          ))}

          {/* Profiles — use stored % positions, same as ProfileCard desktop */}
          {(state.profiles ?? []).map(profile => {
            const hasPhoto = profile.photo && !profile.photo.startsWith("blob:");
            const hasBgImg = profile.bgImage && !profile.bgImage.startsWith("blob:");
            const links    = (profile.links ?? []).filter(l => l.url);

            // Replicate ProfileCard's position/scale defaults exactly
            const photoX  = profile.photoX ?? 50;
            const photoY  = profile.photoY ?? 34;
            const _textX  = profile.textX  ?? 50;
            const _textY  = profile.textY  ?? 72;
            const nameX   = profile.nameX   ?? _textX;
            const nameY   = profile.nameY   ?? _textY;
            const statusX = profile.statusX ?? _textX;
            const statusY = profile.statusY ?? (_textY + 8);
            const handleX = profile.handleX ?? _textX;
            const handleY = profile.handleY ?? (_textY + 13);
            const bioX    = profile.bioX    ?? _textX;
            const bioY    = profile.bioY    ?? (_textY + 19);
            const linksX  = profile.linksX  ?? 50;
            const linksY  = profile.linksY  ?? 78;

            const photoScale  = profile.photoScale  ?? 1;
            const nameScale   = profile.nameScale   ?? (profile.textScale ?? 1);
            const statusScale = profile.statusScale ?? 1;
            const handleScale = profile.handleScale ?? 1;
            const bioScale    = profile.bioScale    ?? 1;
            const linksScale  = profile.linksScale  ?? 1;

            const PHOTO_SIZES: Record<string, number> = { sm: 52, md: 80, lg: 112 };
            const photoSizePx = PHOTO_SIZES[profile.photoSize ?? "md"] ?? 80;

            const nameFontSize   = profile.nameFontSize   ?? 18;
            const statusFontSize = profile.statusFontSize ?? 10;

            const textColor = profile.textColor ?? "rgba(255,255,255,0.92)";

            return (
              <div key={profile.id} style={{
                position: "absolute", left: profile.x, top: profile.y,
                width: profile.w, height: profile.h,
                zIndex: profile.zIndex + profile.layer * 100,
                transform: `rotate(${profile.rotation ?? 0}deg)`,
                borderRadius: profile.borderRadius, opacity: profile.opacity,
                ...(hasBgImg
                  ? bgImageStyle(profile.bgImage, profile.bgMode)
                  : { background: profile.bgColor || "rgba(255,255,255,0.04)" }),
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}>
                {/* Photo */}
                {hasPhoto && (
                  <div style={{
                    position: "absolute",
                    left: `${photoX}%`, top: `${photoY}%`,
                    transform: `translate(-50%, -50%) scale(${photoScale})`,
                  }}>
                    <div style={{ width: photoSizePx, height: photoSizePx, borderRadius: "50%", overflow: "hidden" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={profile.photo} alt="" draggable={false}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  </div>
                )}

                {/* Name */}
                {profile.name && (
                  <div style={{
                    position: "absolute",
                    left: `${nameX}%`, top: `${nameY}%`,
                    transform: `translate(-50%, -50%) scale(${nameScale})`,
                    textAlign: "center", whiteSpace: "nowrap",
                  }}>
                    <span style={{ fontFamily: SANS, fontSize: nameFontSize, fontWeight: 700, color: textColor }}>
                      {profile.name}
                    </span>
                  </div>
                )}

                {/* Status */}
                {profile.status && (
                  <div style={{
                    position: "absolute",
                    left: `${statusX}%`, top: `${statusY}%`,
                    transform: `translate(-50%, -50%) scale(${statusScale})`,
                    textAlign: "center", whiteSpace: "nowrap",
                  }}>
                    <span style={{ fontFamily: SANS, fontSize: statusFontSize, fontWeight: 500, color: textColor, opacity: 0.82 }}>
                      {profile.status}
                    </span>
                  </div>
                )}

                {/* Handle */}
                {profile.handle && (
                  <div style={{
                    position: "absolute",
                    left: `${handleX}%`, top: `${handleY}%`,
                    transform: `translate(-50%, -50%) scale(${handleScale})`,
                    textAlign: "center", whiteSpace: "nowrap",
                  }}>
                    <span style={{ fontFamily: SANS, fontSize: 9, color: textColor, opacity: 0.65 }}>
                      @{profile.handle}
                    </span>
                  </div>
                )}

                {/* Bio */}
                {profile.bio && (
                  <div style={{
                    position: "absolute",
                    left: `${bioX}%`, top: `${bioY}%`,
                    transform: `translate(-50%, -50%) scale(${bioScale})`,
                    textAlign: "center",
                  }}>
                    <span style={{ fontFamily: MONO, fontSize: 7.5, color: textColor, opacity: 0.42,
                      maxWidth: 110, display: "block", wordBreak: "break-word", lineHeight: 1.55 }}>
                      {profile.bio}
                    </span>
                  </div>
                )}

                {/* Links — each individually positioned */}
                {links.map((link, idx) => {
                  const lx = link.x ?? linksX;
                  const ly = link.y ?? (linksY + idx * 8);
                  const ls = link.scale ?? linksScale;
                  const safeUrl = link.url.startsWith("http") ? link.url : `https://${link.url}`;
                  return (
                    <div key={link.id} style={{
                      position: "absolute",
                      left: `${lx}%`, top: `${ly}%`,
                      transform: `translate(-50%, -50%) scale(${ls})`,
                    }}>
                      <MobileLinkButton label={link.label} icon={link.icon} href={safeUrl} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MobileGuestbookWidget({
  gb,
  profileId,
}: {
  gb: { id: string; x: number; y: number; w: number; h: number; zIndex: number; layer: 0|1|2; rotation?: number; borderRadius?: number; opacity?: number };
  profileId: string | undefined;
}) {
  const [messages,    setMessages]    = useState<GuestbookMessage[]>([]);
  const [draft,       setDraft]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
    if (!profileId) return;
    sb.from("guestbook_messages")
      .select("*").eq("profile_id", profileId)
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setMessages((data as GuestbookMessage[]) ?? []));

    channelRef.current = sb.channel(`gb_mobile:${profileId}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "guestbook_messages", filter: `profile_id=eq.${profileId}` }, payload => {
        if (payload.eventType === "INSERT") setMessages(p => [payload.new as GuestbookMessage, ...p]);
        else if (payload.eventType === "DELETE") setMessages(p => p.filter(m => m.id !== (payload.old as { id: string }).id));
      }).subscribe();

    return () => { if (channelRef.current) sb.removeChannel(channelRef.current); };
  }, [profileId]);

  async function handleSend() {
    if (!draft.trim() || draft.length > 280 || !profileId) return;
    setSending(true);
    const sb = createClient();
    await sb.from("guestbook_messages").insert({
      profile_id:   profileId,
      author_id:    currentUserId,
      author_name:  "anon",
      author_avatar: "",
      message:      draft.trim(),
      anonymous:    true,
    });
    setDraft("");
    setSending(false);
  }

  return (
    <div style={{
      position: "absolute", left: gb.x, top: gb.y, width: gb.w, height: gb.h,
      zIndex: gb.zIndex + gb.layer * 100,
      transform: `rotate(${gb.rotation ?? 0}deg)`,
      borderRadius: gb.borderRadius ?? 16, opacity: gb.opacity ?? 1,
      background: "rgba(12,12,16,0.92)",
      border: "1px solid rgba(255,255,255,0.07)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>GUESTBOOK</span>
        <span style={{ fontFamily: MONO, fontSize: 6, color: "rgba(255,255,255,0.18)" }}>{messages.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px", display: "flex", flexDirection: "column", gap: 6, scrollbarWidth: "none" }}>
        {messages.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.2)", textAlign: "center", paddingTop: 16 }}>no entries yet</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, padding: "6px 8px" }}>
            <div style={{ fontFamily: MONO, fontSize: 6, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>
              {msg.anonymous ? "anon" : (msg.author_name || "anon")}
            </div>
            <p style={{ fontFamily: SANS, fontSize: 10, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.4, wordBreak: "break-word" }}>
              {msg.message}
            </p>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "6px 10px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="leave a note..."
          rows={2}
          maxLength={280}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "5px 7px", fontFamily: SANS, fontSize: 10, color: "rgba(255,255,255,0.75)", resize: "none", outline: "none", boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleSend}
            disabled={!draft.trim() || draft.length > 280 || sending || !profileId}
            style={{ background: "rgba(232,224,212,0.1)", border: "1px solid rgba(232,224,212,0.25)", borderRadius: 4, padding: "3px 10px", fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(232,224,212,0.8)", cursor: "pointer", textTransform: "uppercase" }}
          >
            {sending ? "..." : "send"}
          </button>
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
