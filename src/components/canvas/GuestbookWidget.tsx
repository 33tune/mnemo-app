"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGuestbook } from "@/hooks/useGuestbook";
import { bgImageStyle } from "@/lib/bgStyle";
import type { GuestbookCardData, GuestbookPreset } from "@/types";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";

const MAX_CHARS   = 280;
const COOLDOWN_MS = 30_000;

// ── Preset themes ─────────────────────────────────────────────────────────────

interface Theme {
  headerLabel:  string;
  headerCount:  string;
  sealBg:       string;
  bodyText:     string;
  mutedText:    string;
  dimText:      string;
  bubbleBg:     string;
  bubbleBg0:    string;
  bubbleBorder: string;
  bubbleBorder0:string;
  inputBg:      string;
  inputBorder:  string;
  inputText:    string;
  accentBtn:    string;
  accentBorder: string;
  accentText:   string;
  divider:      string;
  msgFont:      string;
  msgFontStyle: React.CSSProperties["fontStyle"];
  labelFont:    string;
  placeholderColor: string;
}

const SANS  = "'DM Sans', sans-serif";
const MONO  = "'Space Mono', monospace";
const SERIF = "'Playfair Display', serif";

const THEMES: Record<GuestbookPreset, Theme> = {
  default: {
    headerLabel:  "rgba(232,224,212,0.45)",
    headerCount:  "rgba(232,224,212,0.2)",
    sealBg:       "radial-gradient(circle at 35% 35%, rgba(232,224,212,0.8), rgba(180,160,130,0.4))",
    bodyText:     "rgba(232,224,212,0.80)",
    mutedText:    "rgba(232,224,212,0.50)",
    dimText:      "rgba(232,224,212,0.22)",
    bubbleBg:     "rgba(232,224,212,0.025)",
    bubbleBg0:    "rgba(232,224,212,0.05)",
    bubbleBorder: "rgba(232,224,212,0.05)",
    bubbleBorder0:"rgba(232,224,212,0.10)",
    inputBg:      "rgba(232,224,212,0.04)",
    inputBorder:  "rgba(232,224,212,0.09)",
    inputText:    "rgba(232,224,212,0.82)",
    accentBtn:    "rgba(232,224,212,0.08)",
    accentBorder: "rgba(232,224,212,0.22)",
    accentText:   "rgba(232,224,212,0.75)",
    divider:      "linear-gradient(to right, transparent, rgba(232,224,212,0.12), transparent)",
    msgFont:      SERIF,
    msgFontStyle: "italic",
    labelFont:    MONO,
    placeholderColor: "rgba(232,224,212,0.25)",
  },
  notebook: {
    headerLabel:  "rgba(80,60,40,0.55)",
    headerCount:  "rgba(80,60,40,0.3)",
    sealBg:       "radial-gradient(circle at 35% 35%, rgba(160,100,40,0.9), rgba(120,70,20,0.5))",
    bodyText:     "rgba(35,25,15,0.88)",
    mutedText:    "rgba(80,60,40,0.65)",
    dimText:      "rgba(80,60,40,0.3)",
    bubbleBg:     "rgba(0,0,0,0.04)",
    bubbleBg0:    "rgba(0,0,0,0.07)",
    bubbleBorder: "rgba(120,80,40,0.1)",
    bubbleBorder0:"rgba(120,80,40,0.2)",
    inputBg:      "rgba(0,0,0,0.04)",
    inputBorder:  "rgba(120,80,40,0.18)",
    inputText:    "rgba(35,25,15,0.85)",
    accentBtn:    "rgba(120,80,40,0.1)",
    accentBorder: "rgba(120,80,40,0.28)",
    accentText:   "rgba(80,50,20,0.85)",
    divider:      "linear-gradient(to right, transparent, rgba(120,80,40,0.18), transparent)",
    msgFont:      SERIF,
    msgFontStyle: "italic",
    labelFont:    MONO,
    placeholderColor: "rgba(80,60,40,0.3)",
  },
  ambient: {
    headerLabel:  "rgba(180,160,255,0.45)",
    headerCount:  "rgba(180,160,255,0.2)",
    sealBg:       "radial-gradient(circle at 35% 35%, rgba(200,180,255,0.8), rgba(140,100,255,0.3))",
    bodyText:     "rgba(220,210,255,0.78)",
    mutedText:    "rgba(180,160,255,0.55)",
    dimText:      "rgba(180,160,255,0.22)",
    bubbleBg:     "rgba(180,160,255,0.04)",
    bubbleBg0:    "rgba(180,160,255,0.07)",
    bubbleBorder: "rgba(180,160,255,0.08)",
    bubbleBorder0:"rgba(180,160,255,0.14)",
    inputBg:      "rgba(180,160,255,0.04)",
    inputBorder:  "rgba(180,160,255,0.12)",
    inputText:    "rgba(220,210,255,0.80)",
    accentBtn:    "rgba(180,160,255,0.08)",
    accentBorder: "rgba(180,160,255,0.25)",
    accentText:   "rgba(200,185,255,0.78)",
    divider:      "linear-gradient(to right, transparent, rgba(180,160,255,0.15), transparent)",
    msgFont:      SERIF,
    msgFontStyle: "italic",
    labelFont:    MONO,
    placeholderColor: "rgba(180,160,255,0.28)",
  },
  minimal: {
    headerLabel:  "rgba(255,255,255,0.28)",
    headerCount:  "rgba(255,255,255,0.14)",
    sealBg:       "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.45), rgba(255,255,255,0.15))",
    bodyText:     "rgba(255,255,255,0.65)",
    mutedText:    "rgba(255,255,255,0.38)",
    dimText:      "rgba(255,255,255,0.16)",
    bubbleBg:     "rgba(255,255,255,0.02)",
    bubbleBg0:    "rgba(255,255,255,0.04)",
    bubbleBorder: "rgba(255,255,255,0.04)",
    bubbleBorder0:"rgba(255,255,255,0.08)",
    inputBg:      "rgba(255,255,255,0.02)",
    inputBorder:  "rgba(255,255,255,0.07)",
    inputText:    "rgba(255,255,255,0.65)",
    accentBtn:    "transparent",
    accentBorder: "rgba(255,255,255,0.14)",
    accentText:   "rgba(255,255,255,0.45)",
    divider:      "linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)",
    msgFont:      SANS,
    msgFontStyle: "normal",
    labelFont:    MONO,
    placeholderColor: "rgba(255,255,255,0.2)",
  },
  "old-internet": {
    headerLabel:  "rgba(0,255,80,0.65)",
    headerCount:  "rgba(0,255,80,0.3)",
    sealBg:       "radial-gradient(circle at 35% 35%, rgba(0,255,80,0.8), rgba(0,180,60,0.4))",
    bodyText:     "rgba(0,255,80,0.88)",
    mutedText:    "rgba(0,255,80,0.5)",
    dimText:      "rgba(0,255,80,0.25)",
    bubbleBg:     "rgba(0,255,80,0.03)",
    bubbleBg0:    "rgba(0,255,80,0.06)",
    bubbleBorder: "rgba(0,255,80,0.12)",
    bubbleBorder0:"rgba(0,255,80,0.22)",
    inputBg:      "rgba(0,255,80,0.03)",
    inputBorder:  "rgba(0,255,80,0.18)",
    inputText:    "rgba(0,255,80,0.9)",
    accentBtn:    "rgba(0,255,80,0.07)",
    accentBorder: "rgba(0,255,80,0.3)",
    accentText:   "rgba(0,255,80,0.85)",
    divider:      "linear-gradient(to right, transparent, rgba(0,255,80,0.2), transparent)",
    msgFont:      MONO,
    msgFontStyle: "normal",
    labelFont:    MONO,
    placeholderColor: "rgba(0,255,80,0.25)",
  },
  sticky: {
    headerLabel:  "rgba(80,60,10,0.6)",
    headerCount:  "rgba(80,60,10,0.3)",
    sealBg:       "radial-gradient(circle at 35% 35%, rgba(160,120,20,0.9), rgba(120,80,10,0.5))",
    bodyText:     "rgba(40,28,5,0.88)",
    mutedText:    "rgba(80,60,10,0.65)",
    dimText:      "rgba(80,60,10,0.3)",
    bubbleBg:     "rgba(255,220,60,0.1)",
    bubbleBg0:    "rgba(255,220,60,0.18)",
    bubbleBorder: "rgba(160,120,20,0.12)",
    bubbleBorder0:"rgba(160,120,20,0.25)",
    inputBg:      "rgba(255,255,255,0.2)",
    inputBorder:  "rgba(160,120,20,0.2)",
    inputText:    "rgba(40,28,5,0.85)",
    accentBtn:    "rgba(160,120,20,0.12)",
    accentBorder: "rgba(160,120,20,0.3)",
    accentText:   "rgba(80,50,5,0.85)",
    divider:      "linear-gradient(to right, transparent, rgba(160,120,20,0.18), transparent)",
    msgFont:      SERIF,
    msgFontStyle: "italic",
    labelFont:    MONO,
    placeholderColor: "rgba(80,60,10,0.3)",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 365) return `${d}d`;
  return `${Math.floor(d / 365)}y`;
}

function cooldownKey(profileId: string) { return `mnemo-gb-cd-${profileId}`; }
function getCooldownLeft(profileId: string): number {
  try {
    const v = localStorage.getItem(cooldownKey(profileId));
    if (!v) return 0;
    const diff = COOLDOWN_MS - (Date.now() - parseInt(v, 10));
    return diff > 0 ? diff : 0;
  } catch { return 0; }
}
function setCooldown(profileId: string) {
  try { localStorage.setItem(cooldownKey(profileId), String(Date.now())); } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GuestbookWidget({
  guestbook,
  isSel,
  draggingId,
  parallaxTransform,
  locked,
  onMouseDown,
  onClick,
  onResizeMD,
  onRotateMD,
  updateGuestbook,
  onToggleLock,
  canInteract,
  ownerUserId,
  currentUserId,
  onOpenMenu,
}: {
  guestbook:       GuestbookCardData;
  isSel:           boolean;
  draggingId:      string | null;
  parallaxTransform: string;
  locked:          boolean;
  onMouseDown:     (e: React.MouseEvent) => void;
  onClick:         (e: React.MouseEvent) => void;
  onResizeMD:      (handle: ResizeHandle, e: React.MouseEvent) => void;
  onRotateMD:      (e: React.MouseEvent) => void;
  updateGuestbook: (id: string, patch: Partial<GuestbookCardData>) => void;
  onToggleLock:    () => void;
  canInteract:     boolean;
  ownerUserId:     string | undefined;
  currentUserId:   string | undefined;
  onOpenMenu:      (rect: DOMRect) => void;
}) {
  const profileId = ownerUserId;
  const { messages, loading, addMessage, deleteMessage } = useGuestbook(profileId);

  const [draft,        setDraft]        = useState("");
  const [anonName,     setAnonName]     = useState("");
  const [anon,         setAnon]         = useState(false);
  const [sending,      setSending]      = useState(false);
  const [error,        setError]        = useState("");
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [viewerName,   setViewerName]   = useState("");
  const [viewerAvatar, setViewerAvatar] = useState("");
  const listRef    = useRef<HTMLDivElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);
  const cdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOwner  = !!currentUserId && currentUserId === ownerUserId;
  const isLoggedIn = !!currentUserId;

  const preset = guestbook.preset ?? "default";
  const T      = THEMES[preset] ?? THEMES.default;

  // Fetch viewer profile
  useEffect(() => {
    if (!currentUserId) return;
    const sb = createClient();
    sb.from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        setViewerName(data?.display_name ?? "");
        setViewerAvatar(data?.avatar_url ?? "");
      });
  }, [currentUserId]);

  // Cooldown tick
  useEffect(() => {
    if (!profileId) return;
    const left = getCooldownLeft(profileId);
    if (left > 0) setCooldownLeft(left);
    cdTimerRef.current = setInterval(() => {
      const l = getCooldownLeft(profileId);
      setCooldownLeft(l);
      if (l === 0 && cdTimerRef.current) clearInterval(cdTimerRef.current);
    }, 500);
    return () => { if (cdTimerRef.current) clearInterval(cdTimerRef.current); };
  }, [profileId]);

  const charsLeft  = MAX_CHARS - draft.length;
  const sendName   = isLoggedIn && !anon ? (viewerName || "anon") : (anonName.trim() || "anon");
  const sendAvatar = isLoggedIn && !anon ? viewerAvatar : "";
  const canSend    = draft.trim().length > 0 && draft.length <= MAX_CHARS && !sending && !!profileId && cooldownLeft === 0;

  async function handleSend() {
    if (!canSend || !profileId) return;
    setSending(true);
    setError("");
    const err = await addMessage(
      profileId,
      draft.trim(),
      isLoggedIn && !anon ? (currentUserId ?? null) : null,
      sendName,
      sendAvatar,
      isLoggedIn ? anon : true,
    );
    setSending(false);
    if (err) { setError("couldn't send — try again"); return; }
    setDraft("");
    setCooldown(profileId);
    setCooldownLeft(COOLDOWN_MS);
    if (listRef.current) listRef.current.scrollTop = 0;
  }

  const isDragging = draggingId === guestbook.id;
  const br         = guestbook.borderRadius ?? 14;

  const cardBgStyle = guestbook.bgImage
    ? bgImageStyle(guestbook.bgImage, guestbook.bgMode)
    : { background: guestbook.bgColor || "rgba(14,13,18,0.96)" };

  return (
    <div
      ref={cardRef}
      onMouseDown={onMouseDown}
      onClick={onClick}
      data-guestbook-id={guestbook.id}
      style={{
        position:   "absolute",
        left:       guestbook.x,
        top:        guestbook.y,
        width:      guestbook.w,
        height:     guestbook.h,
        zIndex:     guestbook.zIndex + guestbook.layer * 100,
        cursor:     locked ? "default" : isDragging ? "grabbing" : "grab",
        userSelect: "none",
        transform:  `${parallaxTransform} rotate(${guestbook.rotation ?? 0}deg)`,
        willChange: "transform",
        opacity:    guestbook.opacity ?? 1,
      }}
    >
      {/* Card shell */}
      <div style={{
        position:             "absolute",
        inset:                0,
        borderRadius:         br,
        ...cardBgStyle,
        border:               isSel
          ? `1px solid ${T.accentBorder}`
          : "1px solid rgba(255,255,255,0.06)",
        backdropFilter:       "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        boxShadow:            "0 12px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
        overflow:             "hidden",
        display:              "flex",
        flexDirection:        "column",
      }}>

        {/* Paper texture overlay */}
        {(preset === "notebook" || preset === "sticky") && (
          <div style={{
            position:      "absolute",
            inset:         0,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
            borderRadius:  br,
            pointerEvents: "none",
            zIndex:        0,
          }} />
        )}

        {/* Header */}
        <div style={{
          position:       "relative",
          zIndex:         1,
          padding:        "10px 13px 9px",
          borderBottom:   `1px solid ${T.inputBorder}`,
          flexShrink:     0,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{
              width:        6,
              height:       6,
              borderRadius: "50%",
              background:   T.sealBg,
              boxShadow:    "0 1px 3px rgba(0,0,0,0.4)",
              flexShrink:   0,
            }} />
            <span style={{
              fontFamily:    T.labelFont,
              fontSize:      7,
              letterSpacing: 3,
              color:         T.headerLabel,
              textTransform: "uppercase",
            }}>
              guestbook
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: T.labelFont, fontSize: 6, letterSpacing: 1, color: T.headerCount }}>
              {loading ? "…" : `${messages.length} ${messages.length === 1 ? "entry" : "entries"}`}
            </span>

            {/* Settings gear — only when owner is editing */}
            {isSel && canInteract && (
              <div
                onMouseDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation();
                  if (cardRef.current) onOpenMenu(cardRef.current.getBoundingClientRect());
                }}
                style={{
                  width:          18,
                  height:         18,
                  borderRadius:   4,
                  background:     "rgba(255,255,255,0.06)",
                  border:         "1px solid rgba(255,255,255,0.08)",
                  cursor:         "pointer",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  transition:     "background 0.12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.headerLabel} strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Messages list */}
        <div
          ref={listRef}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position:      "relative",
            zIndex:        1,
            flex:          1,
            overflowY:     "auto",
            overflowX:     "hidden",
            padding:       "10px 12px 6px",
            display:       "flex",
            flexDirection: "column",
            gap:           8,
            scrollbarWidth:"none",
          }}
        >
          {loading && (
            <div style={{ fontFamily: T.labelFont, fontSize: 7, color: T.dimText, textAlign: "center", paddingTop: 24, letterSpacing: 2 }}>
              . . .
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, paddingBottom: 20 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.dimText} strokeWidth="1">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span style={{ fontFamily: T.labelFont, fontSize: preset === "old-internet" ? 8 : 9, fontStyle: "italic", color: T.dimText, letterSpacing: 0.5 }}>
                {preset === "old-internet" ? "_ no entries yet" : "be the first to sign"}
              </span>
            </div>
          )}

          {messages.map((msg, idx) => {
            const canDelete   = !!currentUserId && (currentUserId === msg.author_id || isOwner);
            const displayName = msg.anonymous ? "anon" : (msg.author_name || "anon");
            const isRecent    = idx === 0;
            return (
              <div key={msg.id} style={{
                position:      "relative",
                background:    isRecent ? T.bubbleBg0 : T.bubbleBg,
                border:        `1px solid ${isRecent ? T.bubbleBorder0 : T.bubbleBorder}`,
                borderRadius:  Math.max(4, br * 0.5),
                padding:       "8px 10px 7px",
                transition:    "background 0.2s",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {!msg.anonymous && msg.author_avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.author_avatar} alt="" style={{ width: 12, height: 12, borderRadius: "50%", objectFit: "cover", flexShrink: 0, opacity: 0.85 }} />
                    ) : (
                      <div style={{ width: 12, height: 12, borderRadius: "50%", border: `1px solid ${T.dimText}`, flexShrink: 0 }} />
                    )}
                    <span style={{ fontFamily: T.labelFont, fontSize: 7, letterSpacing: 1.5, color: T.mutedText, textTransform: "lowercase" }}>
                      {displayName}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: T.labelFont, fontSize: 6, color: T.dimText, letterSpacing: 0.5 }}>
                      {timeAgo(msg.created_at)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteMessage(msg.id); }}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                          background: "transparent", border: "none", cursor: "pointer",
                          padding: "1px 2px", color: T.dimText, fontSize: 10, lineHeight: 1, borderRadius: 3,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(220,70,70,0.75)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = T.dimText; }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <p style={{
                  fontFamily:  T.msgFont,
                  fontStyle:   T.msgFontStyle,
                  fontSize:    11,
                  color:       T.bodyText,
                  lineHeight:  1.55,
                  margin:      0,
                  wordBreak:   "break-word",
                  whiteSpace:  "pre-wrap",
                }}>
                  {msg.message}
                </p>
              </div>
            );
          })}
        </div>

        {/* Decorative divider */}
        <div style={{
          position:   "relative",
          zIndex:     1,
          margin:     "0 12px",
          height:     1,
          background: T.divider,
          flexShrink: 0,
        }} />

        {/* Compose area */}
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position:      "relative",
            zIndex:        1,
            padding:       "8px 12px 11px",
            flexShrink:    0,
            display:       "flex",
            flexDirection: "column",
            gap:           6,
          }}
        >
          {/* Name field — non-logged-in users only */}
          {!isLoggedIn && (
            <input
              type="text"
              value={anonName}
              onChange={e => setAnonName(e.target.value)}
              placeholder="your name (optional)"
              maxLength={40}
              style={{
                width:        "100%",
                background:   T.inputBg,
                border:       `1px solid ${T.inputBorder}`,
                borderRadius: Math.max(3, br * 0.35),
                padding:      "4px 8px",
                fontFamily:   T.labelFont,
                fontSize:     8,
                letterSpacing: 0.5,
                color:        T.mutedText,
                outline:      "none",
                boxSizing:    "border-box",
              }}
            />
          )}

          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); } }}
            placeholder="leave a note..."
            maxLength={MAX_CHARS}
            rows={2}
            style={{
              width:        "100%",
              background:   T.inputBg,
              border:       `1px solid ${T.inputBorder}`,
              borderRadius: Math.max(4, br * 0.4),
              padding:      "7px 8px",
              fontFamily:   T.msgFont,
              fontSize:     11,
              fontStyle:    T.msgFontStyle,
              color:        T.inputText,
              resize:       "none",
              outline:      "none",
              boxSizing:    "border-box",
              lineHeight:   1.5,
            }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isLoggedIn && (
                <label
                  onMouseDown={e => e.stopPropagation()}
                  style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", userSelect: "none" }}
                >
                  <input
                    type="checkbox"
                    checked={anon}
                    onChange={e => setAnon(e.target.checked)}
                    style={{ width: 9, height: 9, cursor: "pointer" }}
                  />
                  <span style={{ fontFamily: T.labelFont, fontSize: 7, letterSpacing: 1, color: T.dimText, textTransform: "lowercase" }}>
                    anon
                  </span>
                </label>
              )}
              {error && (
                <span style={{ fontFamily: T.labelFont, fontSize: 7, color: "rgba(220,80,80,0.7)" }}>{error}</span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{
                fontFamily:  T.labelFont,
                fontSize:    7,
                color:       charsLeft < 40 ? "rgba(220,160,80,0.75)" : T.dimText,
              }}>
                {charsLeft}
              </span>
              {cooldownLeft > 0 ? (
                <span style={{ fontFamily: T.labelFont, fontSize: 7, color: T.dimText }}>
                  {Math.ceil(cooldownLeft / 1000)}s
                </span>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); handleSend(); }}
                  disabled={!canSend}
                  style={{
                    background:    canSend ? T.accentBtn : "transparent",
                    border:        `1px solid ${canSend ? T.accentBorder : T.dimText}`,
                    borderRadius:  Math.max(3, br * 0.28),
                    padding:       "3px 10px",
                    fontFamily:    T.labelFont,
                    fontSize:      7,
                    letterSpacing: 1.5,
                    color:         canSend ? T.accentText : T.dimText,
                    cursor:        canSend ? "pointer" : "default",
                    textTransform: "uppercase",
                    transition:    "all 0.15s",
                  }}
                  onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                >
                  {sending ? "…" : "sign"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resize handles */}
      {isSel && canInteract && !locked && (
        <ResizeHandles onResizeMD={onResizeMD} />
      )}
    </div>
  );
}
