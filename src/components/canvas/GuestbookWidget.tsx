"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGuestbook } from "@/hooks/useGuestbook";
import type { GuestbookCardData } from "@/types";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const MAX_CHARS = 280;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
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
  onResizeMD:      (e: React.MouseEvent) => void;
  onRotateMD:      (e: React.MouseEvent) => void;
  updateGuestbook: (id: string, patch: Partial<GuestbookCardData>) => void;
  onToggleLock:    () => void;
  canInteract:     boolean;
  ownerUserId:     string | undefined;
  currentUserId:   string | undefined;
}) {
  const profileId = ownerUserId;
  const { messages, loading, addMessage, deleteMessage } = useGuestbook(profileId);

  const [draft,     setDraft]     = useState("");
  const [anon,      setAnon]      = useState(false);
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState("");
  const [viewerName,   setViewerName]   = useState("");
  const [viewerAvatar, setViewerAvatar] = useState("");
  const [authChecked,  setAuthChecked]  = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOwner = !!currentUserId && currentUserId === ownerUserId;

  // Fetch viewer profile for name/avatar
  useEffect(() => {
    if (!currentUserId) { setAuthChecked(true); return; }
    const sb = createClient();
    sb.from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        setViewerName(data?.display_name ?? "");
        setViewerAvatar(data?.avatar_url ?? "");
        setAuthChecked(true);
      });
  }, [currentUserId]);

  const charsLeft = MAX_CHARS - draft.length;
  const canSend   = draft.trim().length > 0 && draft.length <= MAX_CHARS && !sending && !!profileId;

  async function handleSend() {
    if (!canSend || !profileId) return;
    setSending(true);
    setError("");
    const name   = anon ? "anon" : (viewerName || "anon");
    const avatar = anon ? "" : viewerAvatar;
    const err = await addMessage(profileId, draft.trim(), currentUserId ?? null, name, avatar, anon);
    setSending(false);
    if (err) { setError("Failed to send. Try again."); return; }
    setDraft("");
  }

  const isDragging = draggingId === guestbook.id;
  const br = guestbook.borderRadius ?? 16;

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={onClick}
      data-guestbook-id={guestbook.id}
      style={{
        position:    "absolute",
        left:        guestbook.x,
        top:         guestbook.y,
        width:       guestbook.w,
        height:      guestbook.h,
        zIndex:      guestbook.zIndex + guestbook.layer * 100,
        cursor:      locked ? "default" : isDragging ? "grabbing" : "grab",
        userSelect:  "none",
        transform:   `${parallaxTransform} rotate(${guestbook.rotation ?? 0}deg)`,
        willChange:  "transform",
        opacity:     guestbook.opacity ?? 1,
      }}
    >
      {/* Card body */}
      <div style={{
        position:      "absolute",
        inset:         0,
        borderRadius:  br,
        background:    guestbook.bgColor || "rgba(12,12,16,0.92)",
        border:        isSel
          ? "1px solid rgba(255,255,255,0.22)"
          : "1px solid rgba(255,255,255,0.07)",
        backdropFilter:       "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow:     "0 8px 32px rgba(0,0,0,0.5)",
        overflow:      "hidden",
        display:       "flex",
        flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{
          padding:       "10px 14px 8px",
          borderBottom:  "1px solid rgba(255,255,255,0.05)",
          flexShrink:    0,
          display:       "flex",
          alignItems:    "center",
          justifyContent:"space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "rgba(232,224,212,0.55)",
            }} />
            <span style={{
              fontFamily:    MONO,
              fontSize:      8,
              letterSpacing: 2.5,
              color:         "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
            }}>
              GUESTBOOK
            </span>
          </div>
          <span style={{
            fontFamily: MONO,
            fontSize:   7,
            letterSpacing: 1,
            color:      "rgba(255,255,255,0.18)",
          }}>
            {messages.length} {messages.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {/* Messages list */}
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            flex:       1,
            overflowY:  "auto",
            overflowX:  "hidden",
            padding:    "8px 12px",
            display:    "flex",
            flexDirection: "column",
            gap:        8,
            scrollbarWidth: "none",
          }}
        >
          {loading && (
            <div style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.2)", textAlign: "center", paddingTop: 20 }}>
              loading...
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              justifyContent: "center",
              height:         "100%",
              gap:            6,
              opacity:        0.35,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                no entries yet
              </span>
            </div>
          )}

          {messages.map(msg => {
            const canDelete = !!currentUserId && (currentUserId === msg.author_id || isOwner);
            const displayName = msg.anonymous ? "anon" : (msg.author_name || "anon");
            return (
              <div key={msg.id} style={{
                position:      "relative",
                background:    "rgba(255,255,255,0.03)",
                border:        "1px solid rgba(255,255,255,0.05)",
                borderRadius:  8,
                padding:       "8px 10px",
                display:       "flex",
                flexDirection: "column",
                gap:           4,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {!msg.anonymous && msg.author_avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.author_avatar} alt="" style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
                    )}
                    <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
                      {displayName}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontFamily: MONO, fontSize: 6, color: "rgba(255,255,255,0.2)" }}>
                      {timeAgo(msg.created_at)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteMessage(msg.id); }}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                          background:  "transparent",
                          border:      "none",
                          cursor:      "pointer",
                          padding:     "1px 3px",
                          color:       "rgba(255,255,255,0.2)",
                          fontSize:    9,
                          lineHeight:  1,
                          borderRadius: 3,
                          transition:  "color 0.1s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,100,100,0.7)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.2)"; }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <p style={{
                  fontFamily:  SANS,
                  fontSize:    11,
                  color:       "rgba(255,255,255,0.72)",
                  lineHeight:  1.5,
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

        {/* Compose area */}
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            borderTop:  "1px solid rgba(255,255,255,0.05)",
            padding:    "8px 12px 10px",
            flexShrink: 0,
            display:    "flex",
            flexDirection: "column",
            gap:        6,
          }}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); } }}
            placeholder="leave a note..."
            maxLength={MAX_CHARS}
            rows={2}
            style={{
              width:        "100%",
              background:   "rgba(255,255,255,0.04)",
              border:       "1px solid rgba(255,255,255,0.07)",
              borderRadius: 6,
              padding:      "6px 8px",
              fontFamily:   SANS,
              fontSize:     11,
              color:        "rgba(255,255,255,0.75)",
              resize:       "none",
              outline:      "none",
              boxSizing:    "border-box",
              lineHeight:   1.4,
            }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Anonymous toggle */}
              {authChecked && currentUserId && (
                <label
                  onMouseDown={e => e.stopPropagation()}
                  style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", userSelect: "none" }}
                >
                  <input
                    type="checkbox"
                    checked={anon}
                    onChange={e => setAnon(e.target.checked)}
                    style={{ width: 10, height: 10, accentColor: "rgba(232,224,212,0.6)", cursor: "pointer" }}
                  />
                  <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>
                    anon
                  </span>
                </label>
              )}

              {error && (
                <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,100,100,0.7)" }}>{error}</span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontFamily:  MONO,
                fontSize:    7,
                color:       charsLeft < 40 ? "rgba(255,180,100,0.7)" : "rgba(255,255,255,0.18)",
              }}>
                {charsLeft}
              </span>
              <button
                onClick={e => { e.stopPropagation(); handleSend(); }}
                disabled={!canSend}
                style={{
                  background:    canSend ? "rgba(232,224,212,0.1)" : "transparent",
                  border:        `1px solid ${canSend ? "rgba(232,224,212,0.28)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius:  4,
                  padding:       "3px 10px",
                  fontFamily:    MONO,
                  fontSize:      7,
                  letterSpacing: 1.5,
                  color:         canSend ? "rgba(232,224,212,0.8)" : "rgba(255,255,255,0.18)",
                  cursor:        canSend ? "pointer" : "default",
                  textTransform: "uppercase",
                  transition:    "all 0.1s",
                }}
              >
                {sending ? "..." : "send"}
              </button>
            </div>
          </div>

          {authChecked && !currentUserId && (
            <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
              sign in to leave a note
            </span>
          )}
        </div>
      </div>

      {/* Selection handles */}
      {isSel && canInteract && !locked && (
        <div
          onMouseDown={e => { e.stopPropagation(); onResizeMD(e); }}
          style={{
            position: "absolute", bottom: -5, right: -5,
            width: 10, height: 10, borderRadius: "50%",
            background: "rgba(255,255,255,0.65)",
            cursor: "nwse-resize",
            border: "1.5px solid rgba(0,0,0,0.2)",
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}
