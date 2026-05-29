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

const GB_COOLDOWN_MS = 30_000;
function gbCdKey(pid: string)  { return `mnemo-gb-cd-${pid}`; }
function gbCdLeft(pid: string) {
  try { const v = localStorage.getItem(gbCdKey(pid)); if (!v) return 0; const d = GB_COOLDOWN_MS - (Date.now() - parseInt(v, 10)); return d > 0 ? d : 0; } catch { return 0; }
}
function gbSetCd(pid: string)  { try { localStorage.setItem(gbCdKey(pid), String(Date.now())); } catch {} }

function gbTimeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`; const m = Math.floor(s/60); if (m < 60) return `${m}m`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h`; return `${Math.floor(h/24)}d`;
}

const GB_SERIF = "'Playfair Display', serif";

function MobileGuestbookWidget({
  gb,
  profileId,
}: {
  gb: { id: string; x: number; y: number; w: number; h: number; zIndex: number; layer: 0|1|2; rotation?: number; borderRadius?: number; opacity?: number };
  profileId: string | undefined;
}) {
  const [messages,      setMessages]      = useState<GuestbookMessage[]>([]);
  const [draft,         setDraft]         = useState("");
  const [anonName,      setAnonName]      = useState("");
  const [sending,       setSending]       = useState(false);
  const [error,         setError]         = useState("");
  const [cooldownLeft,  setCooldownLeft]  = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewerName,    setViewerName]    = useState("");
  const [viewerAvatar,  setViewerAvatar]  = useState("");
  const channelRef  = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const cdTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      const uid = user?.id ?? null;
      setCurrentUserId(uid);
      if (uid) {
        sb.from("profiles").select("display_name, avatar_url").eq("user_id", uid).maybeSingle()
          .then(({ data }) => { setViewerName(data?.display_name ?? ""); setViewerAvatar(data?.avatar_url ?? ""); });
      }
    });
  }, []);

  useEffect(() => {
    if (!profileId) return;
    const sb = createClient();
    sb.from("guestbook_messages")
      .select("*").eq("profile_id", profileId)
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setMessages((data as GuestbookMessage[]) ?? []));

    channelRef.current = sb.channel(`gb_mobile:${profileId}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "guestbook_messages", filter: `profile_id=eq.${profileId}` }, payload => {
        if (payload.eventType === "INSERT") setMessages(p => [payload.new as GuestbookMessage, ...p]);
        else if (payload.eventType === "DELETE") setMessages(p => p.filter(m => m.id !== (payload.old as { id: string }).id));
      }).subscribe();

    // Cooldown tick
    const left = gbCdLeft(profileId);
    if (left > 0) setCooldownLeft(left);
    cdTimerRef.current = setInterval(() => {
      const l = gbCdLeft(profileId);
      setCooldownLeft(l);
      if (l === 0 && cdTimerRef.current) clearInterval(cdTimerRef.current);
    }, 500);

    return () => {
      if (channelRef.current) sb.removeChannel(channelRef.current);
      if (cdTimerRef.current) clearInterval(cdTimerRef.current);
    };
  }, [profileId]);

  const isLoggedIn = !!currentUserId;
  const sendName   = isLoggedIn ? (viewerName || "anon") : (anonName.trim() || "anon");
  const canSend    = draft.trim().length > 0 && draft.length <= 280 && !sending && !!profileId && cooldownLeft === 0;

  async function handleSend() {
    if (!canSend || !profileId) return;
    setSending(true);
    setError("");
    const sb = createClient();
    const { error: err } = await sb.from("guestbook_messages").insert({
      profile_id:    profileId,
      author_id:     currentUserId,
      author_name:   sendName,
      author_avatar: isLoggedIn ? viewerAvatar : "",
      message:       draft.trim(),
      anonymous:     !isLoggedIn,
    });
    setSending(false);
    if (err) { setError("couldn't send"); return; }
    setDraft("");
    gbSetCd(profileId);
    setCooldownLeft(GB_COOLDOWN_MS);
    if (listRef.current) listRef.current.scrollTop = 0;
  }

  const br = gb.borderRadius ?? 14;

  return (
    <div style={{
      position: "absolute", left: gb.x, top: gb.y, width: gb.w, height: gb.h,
      zIndex: gb.zIndex + gb.layer * 100,
      transform: `rotate(${gb.rotation ?? 0}deg)`,
      borderRadius: br, opacity: gb.opacity ?? 1,
      background: "rgba(14,13,18,0.96)",
      border: "1px solid rgba(232,224,212,0.08)",
      backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
      boxShadow: "0 12px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(232,224,212,0.06)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "10px 13px 8px", borderBottom: "1px solid rgba(232,224,212,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(232,224,212,0.8), rgba(180,160,130,0.4))", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }} />
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(232,224,212,0.4)", textTransform: "uppercase" }}>guestbook</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 6, color: "rgba(232,224,212,0.2)" }}>{messages.length} {messages.length === 1 ? "entry" : "entries"}</span>
      </div>

      {/* Messages */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "8px 11px 6px", display: "flex", flexDirection: "column", gap: 7, scrollbarWidth: "none" }}>
        {messages.length === 0 && (
          <div style={{ fontFamily: GB_SERIF, fontSize: 9, fontStyle: "italic", color: "rgba(232,224,212,0.2)", textAlign: "center", paddingTop: 20 }}>be the first to sign</div>
        )}
        {messages.map((msg, idx) => (
          <div key={msg.id} style={{ background: idx === 0 ? "rgba(232,224,212,0.05)" : "rgba(232,224,212,0.025)", border: `1px solid ${idx === 0 ? "rgba(232,224,212,0.10)" : "rgba(232,224,212,0.05)"}`, borderRadius: 7, padding: "8px 9px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {!msg.anonymous && msg.author_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={msg.author_avatar} alt="" style={{ width: 12, height: 12, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1px solid rgba(232,224,212,0.15)" }} />
                )}
                <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: "rgba(232,224,212,0.45)", textTransform: "lowercase" }}>
                  {msg.anonymous ? "anon" : (msg.author_name || "anon")}
                </span>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 6, color: "rgba(232,224,212,0.2)" }}>{gbTimeAgo(msg.created_at)}</span>
            </div>
            <p style={{ fontFamily: SANS, fontSize: 11, color: "rgba(232,224,212,0.78)", margin: 0, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
              {msg.message}
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ margin: "0 11px", height: 1, background: "linear-gradient(to right, transparent, rgba(232,224,212,0.10), transparent)", flexShrink: 0 }} />

      {/* Compose */}
      <div style={{ padding: "7px 11px 10px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        {!isLoggedIn && (
          <input
            type="text"
            value={anonName}
            onChange={e => setAnonName(e.target.value)}
            placeholder="your name (optional)"
            maxLength={40}
            style={{ width: "100%", background: "rgba(232,224,212,0.04)", border: "1px solid rgba(232,224,212,0.09)", borderRadius: 5, padding: "4px 8px", fontFamily: MONO, fontSize: 8, letterSpacing: 0.5, color: "rgba(232,224,212,0.55)", outline: "none", boxSizing: "border-box" }}
          />
        )}
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="leave a note..."
          rows={2}
          maxLength={280}
          style={{ width: "100%", background: "rgba(232,224,212,0.04)", border: "1px solid rgba(232,224,212,0.09)", borderRadius: 6, padding: "6px 8px", fontFamily: GB_SERIF, fontSize: 11, fontStyle: "italic", color: "rgba(232,224,212,0.8)", resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.5 }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(220,80,80,0.7)" }}>{error}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 7, color: 280 - draft.length < 40 ? "rgba(220,160,80,0.75)" : "rgba(232,224,212,0.18)" }}>{280 - draft.length}</span>
            {cooldownLeft > 0 ? (
              <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(232,224,212,0.22)" }}>{Math.ceil(cooldownLeft / 1000)}s</span>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                style={{ background: canSend ? "rgba(232,224,212,0.08)" : "transparent", border: `1px solid ${canSend ? "rgba(232,224,212,0.22)" : "rgba(232,224,212,0.06)"}`, borderRadius: 4, padding: "3px 10px", fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: canSend ? "rgba(232,224,212,0.75)" : "rgba(232,224,212,0.18)", cursor: canSend ? "pointer" : "default", textTransform: "uppercase" }}
              >
                {sending ? "…" : "sign"}
              </button>
            )}
          </div>
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
