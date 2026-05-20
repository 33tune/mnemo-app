"use client";
import { useState, useEffect, useCallback } from "react";
import { useChats } from "@/hooks/useChats";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { type WindowPatch } from "@/hooks/useChatWindows";
import type { ChatWindow } from "@/types/chat";
import ChatWindowCard from "./ChatWindowCard";

const MONO = "'Space Mono', monospace";

interface Props {
  currentUserId?:  string;
  windows:         ChatWindow[];
  openWindow:      (chatId: string) => Promise<void>;
  closeWindow:     (chatId: string) => Promise<void>;
  minimizeWindow:  (chatId: string) => Promise<void>;
  focusWindow:     (chatId: string) => Promise<void>;
  updateWindow:    (chatId: string, patch: WindowPatch) => Promise<void>;
  onUnreadChange?: (total: number) => void;
}

export default function ChatsWorkspace({
  currentUserId,
  windows,
  openWindow,
  closeWindow,
  minimizeWindow,
  focusWindow,
  updateWindow,
  onUnreadChange,
}: Props) {
  const { chats } = useChats(currentUserId);
  const { unreadCounts, totalUnread, markRead } = useUnreadCounts(chats, currentUserId);

  // Bubble unread count up to CanvasBoard → Topbar
  useEffect(() => {
    onUnreadChange?.(totalUnread);
  }, [totalUnread, onUnreadChange]);

  function getPeerLabel(chatId: string): string {
    const chat = chats.find(c => c.chat_id === chatId);
    if (!chat) return chatId.slice(0, 8);
    const peer = chat.participants.find(p => p.user_id !== currentUserId);
    return peer?.handle ?? peer?.display_name ?? "chat";
  }

  // Wrap open/focus to also mark the chat as read
  const handleOpen = useCallback(async (chatId: string) => {
    markRead(chatId);
    await openWindow(chatId);
  }, [markRead, openWindow]);

  const handleFocus = useCallback(async (chatId: string) => {
    markRead(chatId);
    await focusWindow(chatId);
  }, [markRead, focusWindow]);

  console.log("RENDER WINDOWS", windows);

  const openWindows      = windows.filter(w => !w.minimized);
  const minimizedWindows = windows.filter(w => w.minimized);
  const maxZ = openWindows.length > 0 ? Math.max(...openWindows.map(w => w.z_index)) : -1;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "none" }}>

      {/* Floating windows — non-minimized only, sorted z ascending */}
      {currentUserId && openWindows
        .slice()
        .sort((a, b) => a.z_index - b.z_index)
        .map(win => (
          <div key={win.id} style={{ pointerEvents: "all" }}>
            <ChatWindowCard
              window={win}
              currentUserId={currentUserId}
              peerLabel={getPeerLabel(win.chat_id)}
              isActive={win.z_index === maxZ}
              onClose={closeWindow}
              onMinimize={minimizeWindow}
              onFocus={handleFocus}
              updateWindow={updateWindow}
            />
          </div>
        ))
      }

      {/* Minimized dock */}
      {minimizedWindows.length > 0 && (
        <div style={{
          position:     "absolute",
          bottom:       14,
          left:         "50%",
          transform:    "translateX(-50%)",
          pointerEvents: "all",
          display:      "flex",
          alignItems:   "center",
          gap:          4,
          zIndex:       9999,
          padding:      "6px 10px",
          background:   "#07070a",
          border:       "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4,
          boxShadow:    "0 12px 32px rgba(0,0,0,0.85)",
        }}>
          <span style={{
            fontFamily:    MONO,
            fontSize:      7,
            letterSpacing: 2,
            color:         "rgba(255,255,255,0.18)",
            textTransform: "uppercase",
            paddingRight:  6,
            borderRight:   "1px solid rgba(255,255,255,0.1)",
            marginRight:   2,
            lineHeight:    1,
          }}>
            DOCK
          </span>
          {minimizedWindows.map(win => (
            <DockPill
              key={win.chat_id}
              label={getPeerLabel(win.chat_id)}
              unread={unreadCounts[win.chat_id] ?? 0}
              onClick={() => handleOpen(win.chat_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      position:       "absolute",
      inset:          0,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      pointerEvents:  "none",
    }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.08)", textTransform: "uppercase" }}>
          ── ── ── ──
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
          NO CHANNELS
        </div>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.1)", textTransform: "uppercase" }}>
          STATUS: STANDBY
        </div>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.08)", textTransform: "uppercase" }}>
          ── ── ── ──
        </div>
      </div>
    </div>
  );
}

// ── Dock pill ───────────────────────────────────────────────────────────────────
function DockPill({
  label,
  unread,
  onClick,
}: {
  label:  string;
  unread: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasUnread = unread > 0;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           6,
        background:    hovered
          ? "rgba(255,255,255,0.1)"
          : (hasUnread ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)"),
        border:        `1px solid ${hovered
          ? "rgba(255,255,255,0.22)"
          : (hasUnread ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)")}`,
        borderRadius:  3,
        padding:       "4px 10px",
        color:         hovered
          ? "rgba(255,255,255,0.85)"
          : (hasUnread ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)"),
        fontFamily:    MONO,
        fontSize:      9,
        letterSpacing: 1.5,
        cursor:        "pointer",
        textTransform: "uppercase",
        transition:    "all 0.1s ease",
        whiteSpace:    "nowrap",
        userSelect:    "none",
      }}
    >
      {label}
      {hasUnread && (
        <span style={{
          display:       "inline-flex",
          alignItems:    "center",
          justifyContent:"center",
          background:    "rgba(255,255,255,0.85)",
          color:         "#07070a",
          fontFamily:    MONO,
          fontSize:      7,
          fontWeight:    700,
          letterSpacing: 0,
          borderRadius:  2,
          padding:       "1px 4px",
          lineHeight:    1.2,
          minWidth:      14,
        }}>
          {unread}
        </span>
      )}
    </button>
  );
}

