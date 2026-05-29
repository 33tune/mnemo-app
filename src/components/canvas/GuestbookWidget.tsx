"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGuestbook } from "@/hooks/useGuestbook";
import { bgImageStyle } from "@/lib/bgStyle";
import type { GuestbookCardData } from "@/types";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";

const MONO  = "'Space Mono', monospace";
const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";
const MAX_CHARS   = 280;
const COOLDOWN_MS = 30_000;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 365) return `${d}d`;
  return `${Math.floor(d / 365)}y`;
}

function cooldownKey(profileId: string) {
  return `mnemo-gb-cd-${profileId}`;
}
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
  const listRef = useRef<HTMLDivElement>(null);
  const cdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOwner  = !!currentUserId && currentUserId === ownerUserId;
  const isLoggedIn = !!currentUserId;

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
    if (err) {
      setError("couldn't send — try again");
      return;
    }
    setDraft("");
    setCooldown(profileId);
    setCooldownLeft(COOLDOWN_MS);
    // Scroll to top to see new message
    if (listRef.current) listRef.current.scrollTop = 0;
  }

  const isDragging = draggingId === guestbook.id;
  const br         = guestbook.borderRadius ?? 14;

  const cardBg = guestbook.bgImage
    ? undefined
    : (guestbook.bgColor || "rgba(14,13,18,0.96)");

  const cardBgStyle = guestbook.bgImage
    ? bgImageStyle(guestbook.bgImage, guestbook.bgMode)
    : { background: cardBg };

  return (
    <div
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
          ? "1px solid rgba(232,224,212,0.25)"
          : "1px solid rgba(232,224,212,0.08)",
        backdropFilter:       "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        boxShadow:            "0 12px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(232,224,212,0.06)",
        overflow:             "hidden",
        display:              "flex",
        flexDirection:        "column",
      }}>

        {/* Subtle paper texture overlay */}
        <div style={{
          position:      "absolute",
          inset:         0,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
          borderRadius:  br,
          pointerEvents: "none",
          zIndex:        0,
        }} />

        {/* Header */}
        <div style={{
          position:      "relative",
          zIndex:        1,
          padding:       "11px 14px 9px",
          borderBottom:  "1px solid rgba(232,224,212,0.07)",
          flexShrink:    0,
          display:       "flex",
          alignItems:    "center",
          justifyContent:"space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Wax seal dot */}
            <div style={{
              width:        6,
              height:       6,
              borderRadius: "50%",
              background:   "radial-gradient(circle at 35% 35%, rgba(232,224,212,0.8), rgba(180,160,130,0.4))",
              boxShadow:    "0 1px 3px rgba(0,0,0,0.5)",
            }} />
            <span style={{
              fontFamily:    MONO,
              fontSize:      7,
              letterSpacing: 3,
              color:         "rgba(232,224,212,0.45)",
              textTransform: "uppercase",
            }}>
              guestbook
            </span>
          </div>
          <span style={{
            fontFamily:    MONO,
            fontSize:      6,
            letterSpacing: 1,
            color:         "rgba(232,224,212,0.2)",
          }}>
            {loading ? "…" : `${messages.length} ${messages.length === 1 ? "entry" : "entries"}`}
          </span>
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
            <div style={{ fontFamily: MONO, fontSize: 7, color: "rgba(232,224,212,0.2)", textAlign: "center", paddingTop: 24, letterSpacing: 2 }}>
              . . .
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              justifyContent: "center",
              height:         "100%",
              gap:            10,
              paddingBottom:  20,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(232,224,212,0.18)" strokeWidth="1">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              <span style={{ fontFamily: SERIF, fontSize: 9, fontStyle: "italic", color: "rgba(232,224,212,0.22)", letterSpacing: 0.5 }}>
                be the first to sign
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
                background:    isRecent
                  ? "rgba(232,224,212,0.05)"
                  : "rgba(232,224,212,0.025)",
                border:        `1px solid ${isRecent ? "rgba(232,224,212,0.10)" : "rgba(232,224,212,0.05)"}`,
                borderRadius:  8,
                padding:       "9px 10px 8px",
                transition:    "background 0.2s",
              }}>
                {/* Author row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {!msg.anonymous && msg.author_avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.author_avatar} alt="" style={{ width: 13, height: 13, borderRadius: "50%", objectFit: "cover", flexShrink: 0, opacity: 0.85 }} />
                    ) : (
                      <div style={{ width: 13, height: 13, borderRadius: "50%", border: "1px solid rgba(232,224,212,0.15)", flexShrink: 0 }} />
                    )}
                    <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(232,224,212,0.5)", textTransform: "lowercase" }}>
                      {displayName}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 6, color: "rgba(232,224,212,0.2)", letterSpacing: 0.5 }}>
                      {timeAgo(msg.created_at)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteMessage(msg.id); }}
                        onMouseDown={e => e.stopPropagation()}
                        title="delete"
                        style={{
                          background:  "transparent",
                          border:      "none",
                          cursor:      "pointer",
                          padding:     "1px 2px",
                          color:       "rgba(232,224,212,0.15)",
                          fontSize:    10,
                          lineHeight:  1,
                          borderRadius: 3,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(200,80,80,0.7)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(232,224,212,0.15)"; }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Message body */}
                <p style={{
                  fontFamily:  SANS,
                  fontSize:    11,
                  color:       "rgba(232,224,212,0.78)",
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

        {/* Divider line — decorative */}
        <div style={{
          position:   "relative",
          zIndex:     1,
          margin:     "0 12px",
          height:     1,
          background: "linear-gradient(to right, transparent, rgba(232,224,212,0.12), transparent)",
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
          {/* Name field for non-logged-in users */}
          {!isLoggedIn && (
            <input
              type="text"
              value={anonName}
              onChange={e => setAnonName(e.target.value)}
              placeholder="your name (optional)"
              maxLength={40}
              style={{
                width:        "100%",
                background:   "rgba(232,224,212,0.04)",
                border:       "1px solid rgba(232,224,212,0.09)",
                borderRadius: 5,
                padding:      "4px 8px",
                fontFamily:   MONO,
                fontSize:     8,
                letterSpacing: 0.5,
                color:        "rgba(232,224,212,0.55)",
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
              background:   "rgba(232,224,212,0.04)",
              border:       "1px solid rgba(232,224,212,0.09)",
              borderRadius: 6,
              padding:      "7px 8px",
              fontFamily:   SERIF,
              fontSize:     11,
              fontStyle:    "italic",
              color:        "rgba(232,224,212,0.8)",
              resize:       "none",
              outline:      "none",
              boxSizing:    "border-box",
              lineHeight:   1.5,
            }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Anon toggle — only for logged-in users */}
              {isLoggedIn && (
                <label
                  onMouseDown={e => e.stopPropagation()}
                  style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", userSelect: "none" }}
                >
                  <input
                    type="checkbox"
                    checked={anon}
                    onChange={e => setAnon(e.target.checked)}
                    style={{ width: 9, height: 9, accentColor: "rgba(232,224,212,0.5)", cursor: "pointer" }}
                  />
                  <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: "rgba(232,224,212,0.25)", textTransform: "lowercase" }}>
                    anon
                  </span>
                </label>
              )}

              {error && (
                <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(220,80,80,0.7)" }}>{error}</span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{
                fontFamily:  MONO,
                fontSize:    7,
                color:       charsLeft < 40 ? "rgba(220,160,80,0.75)" : "rgba(232,224,212,0.18)",
                letterSpacing: 0.5,
              }}>
                {charsLeft}
              </span>

              {cooldownLeft > 0 ? (
                <span style={{
                  fontFamily:    MONO,
                  fontSize:      7,
                  letterSpacing: 1,
                  color:         "rgba(232,224,212,0.22)",
                }}>
                  {Math.ceil(cooldownLeft / 1000)}s
                </span>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); handleSend(); }}
                  disabled={!canSend}
                  style={{
                    background:    canSend ? "rgba(232,224,212,0.08)" : "transparent",
                    border:        `1px solid ${canSend ? "rgba(232,224,212,0.22)" : "rgba(232,224,212,0.06)"}`,
                    borderRadius:  4,
                    padding:       "3px 10px",
                    fontFamily:    MONO,
                    fontSize:      7,
                    letterSpacing: 1.5,
                    color:         canSend ? "rgba(232,224,212,0.75)" : "rgba(232,224,212,0.18)",
                    cursor:        canSend ? "pointer" : "default",
                    textTransform: "uppercase",
                    transition:    "all 0.15s",
                  }}
                  onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLButtonElement).style.background = "rgba(232,224,212,0.14)"; }}
                  onMouseLeave={e => { if (canSend) (e.currentTarget as HTMLButtonElement).style.background = "rgba(232,224,212,0.08)"; }}
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
