"use client";
import { useState } from "react";
import type React from "react";
import { useChats } from "@/hooks/useChats";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

interface Props {
  currentUserId?: string;
  openWindow:  (chatId: string) => Promise<void>;
  totalUnread: number;
}

export function SocialDock({ currentUserId, openWindow, totalUnread }: Props) {
  const [open, setOpen] = useState(false);
  const { chats, loading } = useChats(currentUserId);

  if (!currentUserId) return null;

  return (
    <>
      {/* ── Trigger ── */}
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          position: "fixed",
          left: 16,
          bottom: 70,
          zIndex: 900,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: totalUnread > 0
            ? "1px solid rgba(212,240,196,0.22)"
            : "1px solid rgba(255,255,255,0.07)",
          background: open
            ? "rgba(212,240,196,0.06)"
            : "rgba(10,10,12,0.92)",
          color: totalUnread > 0 ? "rgba(212,240,196,0.6)" : "rgba(255,255,255,0.38)",
          cursor: "pointer",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.14s ease",
          boxShadow: totalUnread > 0
            ? "0 0 20px rgba(212,240,196,0.05), 0 4px 16px rgba(0,0,0,0.45)"
            : "0 4px 16px rgba(0,0,0,0.4)",
        } as React.CSSProperties}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {totalUnread > 0 && (
          <div style={{
            position: "absolute",
            top: -3, right: -3,
            minWidth: 16, height: 16,
            borderRadius: 8,
            background: "rgba(212,240,196,0.9)",
            color: "#0a0a0c",
            fontFamily: MONO,
            fontSize: 8,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 3px",
            border: "1.5px solid #0a0a0c",
          }}>
            {totalUnread > 9 ? "9+" : totalUnread}
          </div>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed",
            left: 68,
            bottom: 70,
            width: 300,
            maxHeight: "62vh",
            background: "rgba(8,8,10,0.98)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            zIndex: 900,
            boxShadow: "0 24px 64px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "11px 14px 9px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: 2.5,
              color: "rgba(255,255,255,0.18)",
              textTransform: "uppercase",
            }}>
              MESSAGES
            </span>
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && (
              <div style={{ padding: "18px 14px", fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.1)" }}>
                LOADING...
              </div>
            )}
            {!loading && chats.length === 0 && (
              <div style={{ padding: "18px 14px", fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.1)" }}>
                NO MESSAGES YET
              </div>
            )}
            {!loading && chats.map(chat => {
              const other = chat.participants.find(p => p.user_id !== currentUserId);
              if (!other) return null;
              const initials = (other.display_name || other.handle).slice(0, 2).toUpperCase();
              const preview = chat.last_message?.content ?? null;
              return (
                <button
                  key={chat.chat_id}
                  onClick={() => { console.log("OPEN CHAT CLICK", chat.chat_id); openWindow(chat.chat_id); setOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "9px 14px",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.08s ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{
                    width: 34, height: 34,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: other.avatar_url ? undefined : "rgba(255,255,255,0.04)",
                    flexShrink: 0,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {other.avatar_url
                      ? <img src={other.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.22)" }}>{initials}</span>
                    }
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{
                      fontFamily: SANS, fontSize: 12, fontWeight: 500,
                      color: "rgba(255,255,255,0.78)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      lineHeight: 1.3,
                    }}>
                      {other.display_name || other.handle}
                    </div>
                    {preview && (
                      <div style={{
                        fontFamily: SANS, fontSize: 11,
                        color: "rgba(255,255,255,0.2)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        marginTop: 2,
                      }}>
                        {preview}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
