"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useMessages } from "@/hooks/useMessages";
import { useTypingPresence } from "@/hooks/useTypingPresence";
import type { ChatWindow } from "@/types/chat";
import type { WindowPatch } from "@/hooks/useChatWindows";
import type { Message } from "@/types/chat";

const MONO  = "'Space Mono', monospace";
const SANS  = "'DM Sans', sans-serif";
const MIN_W = 280;
const MIN_H = 300;

const CHAT_STYLES = `
@keyframes msgIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes typingDot {
  0%, 60%, 100% { transform: translateY(0);   opacity: 0.3; }
  30%           { transform: translateY(-3px); opacity: 0.85; }
}
`;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ── Message grouping ────────────────────────────────────────────────────────────
type MsgGroup = { senderId: string; isOwn: boolean; msgs: Message[] };

function groupMessages(messages: Message[], currentUserId: string): MsgGroup[] {
  return messages.reduce<MsgGroup[]>((acc, msg) => {
    const last = acc[acc.length - 1];
    const isOwn = msg.sender_id === currentUserId;
    const timeDiff = last?.msgs.length
      ? Date.parse(msg.created_at) - Date.parse(last.msgs[last.msgs.length - 1].created_at)
      : Infinity;
    if (last && last.senderId === msg.sender_id && timeDiff < 120_000) {
      last.msgs.push(msg);
    } else {
      acc.push({ senderId: msg.sender_id, isOwn, msgs: [msg] });
    }
    return acc;
  }, []);
}

interface Props {
  window:        ChatWindow;
  currentUserId: string;
  peerLabel:     string;
  isActive:      boolean;
  onClose:       (chatId: string) => void;
  onMinimize:    (chatId: string) => void;
  onFocus:       (chatId: string) => void;
  updateWindow:  (chatId: string, patch: WindowPatch) => void;
}

export default function ChatWindowCard({
  window: win,
  currentUserId,
  peerLabel,
  isActive,
  onClose,
  onMinimize,
  onFocus,
  updateWindow,
}: Props) {
  const { messages, loading, sending, sendMessage } = useMessages(win.chat_id);
  const { peerTyping, trackTyping, stopTyping } = useTypingPresence(win.chat_id, currentUserId);
  const [input,    setInput]    = useState("");
  const [expanded, setExpanded] = useState(false);
  const [visible,  setVisible]  = useState(false);
  const cardRef    = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const dragRef    = useRef<{
    type:        "drag" | "resize";
    startMouseX: number;
    startMouseY: number;
    startVal1:   number;
    startVal2:   number;
  } | null>(null);

  const seenIdsRef         = useRef(new Set<string>());
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => { clearTimeout(t); document.body.style.cursor = ""; };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!loading && !initialLoadDoneRef.current) {
      messages.forEach(m => seenIdsRef.current.add(m.id));
      initialLoadDoneRef.current = true;
    }
  }, [loading, messages]);

  useEffect(() => {
    if (initialLoadDoneRef.current) {
      messages.forEach(m => seenIdsRef.current.add(m.id));
    }
  }, [messages]);

  // ── Drag ──────────────────────────────────────────────────────────────────────
  const startDrag = useCallback((e: React.MouseEvent) => {
    if (expanded) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    onFocus(win.chat_id);
    document.body.style.cursor = "grabbing";
    dragRef.current = {
      type: "drag", startMouseX: e.clientX, startMouseY: e.clientY,
      startVal1: win.x, startVal2: win.y,
    };
    function onMove(e: MouseEvent) {
      if (!dragRef.current || !cardRef.current) return;
      const newX = Math.max(0, Math.min(window.innerWidth  - MIN_W, e.clientX - dragRef.current.startMouseX + dragRef.current.startVal1));
      const newY = Math.max(44, Math.min(window.innerHeight - 60,    e.clientY - dragRef.current.startMouseY + dragRef.current.startVal2));
      cardRef.current.style.left = `${newX}px`;
      cardRef.current.style.top  = `${newY}px`;
    }
    function onUp(e: MouseEvent) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      document.body.style.cursor = "";
      if (!dragRef.current) return;
      const newX = Math.max(0, Math.min(window.innerWidth  - MIN_W, e.clientX - dragRef.current.startMouseX + dragRef.current.startVal1));
      const newY = Math.max(44, Math.min(window.innerHeight - 60,    e.clientY - dragRef.current.startMouseY + dragRef.current.startVal2));
      dragRef.current = null;
      updateWindow(win.chat_id, { x: newX, y: newY });
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }, [expanded, win.chat_id, win.x, win.y, onFocus, updateWindow]);

  // ── Resize ────────────────────────────────────────────────────────────────────
  const startResize = useCallback((e: React.MouseEvent) => {
    if (expanded) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus(win.chat_id);
    document.body.style.cursor = "nwse-resize";
    dragRef.current = {
      type: "resize", startMouseX: e.clientX, startMouseY: e.clientY,
      startVal1: win.w, startVal2: win.h,
    };
    function onMove(e: MouseEvent) {
      if (!dragRef.current || !cardRef.current) return;
      cardRef.current.style.width  = `${Math.max(MIN_W, e.clientX - dragRef.current.startMouseX + dragRef.current.startVal1)}px`;
      cardRef.current.style.height = `${Math.max(MIN_H, e.clientY - dragRef.current.startMouseY + dragRef.current.startVal2)}px`;
    }
    function onUp(e: MouseEvent) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      document.body.style.cursor = "";
      if (!dragRef.current) return;
      const newW = Math.max(MIN_W, e.clientX - dragRef.current.startMouseX + dragRef.current.startVal1);
      const newH = Math.max(MIN_H, e.clientY - dragRef.current.startMouseY + dragRef.current.startVal2);
      dragRef.current = null;
      updateWindow(win.chat_id, { w: newW, h: newH });
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }, [expanded, win.chat_id, win.w, win.h, onFocus, updateWindow]);

  // ── Send ──────────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput("");
    stopTyping();
    await sendMessage(trimmed);
  }, [input, sending, sendMessage, stopTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const positionStyle: React.CSSProperties = expanded
    ? { left: "5vw", top: "5vh", width: "90vw", height: "90vh" }
    : { left: win.x, top: win.y, width: win.w, height: win.h };

  const borderColor = isActive ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)";

  return (
    <>
      <style>{CHAT_STYLES}</style>
      <div
        ref={cardRef}
        onMouseDown={() => onFocus(win.chat_id)}
        style={{
          position:      "absolute",
          ...positionStyle,
          zIndex:        win.z_index,
          display:       "flex",
          flexDirection: "column",
          background:    "#0b0b0d",
          border:        `1px solid ${borderColor}`,
          borderRadius:  4,
          boxShadow:     isActive
            ? "0 28px 72px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.05)"
            : "0 8px 28px rgba(0,0,0,0.7)",
          overflow:      "hidden",
          userSelect:    "none",
          minWidth:      MIN_W,
          opacity:       visible ? (isActive ? 1 : 0.78) : 0,
          transform:     visible ? "scale(1) translateY(0)" : "scale(0.97) translateY(6px)",
          transition:    [
            "opacity 0.14s ease",
            "transform 0.14s ease",
            "border-color 0.12s ease",
            "box-shadow 0.12s ease",
            expanded ? "left 0.18s ease, top 0.18s ease, width 0.18s ease, height 0.18s ease" : "",
          ].filter(Boolean).join(", "),
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div
          onMouseDown={startDrag}
          style={{
            height:       38,
            flexShrink:   0,
            display:      "flex",
            alignItems:   "center",
            padding:      "0 8px 0 12px",
            background:   "#07070a",
            borderBottom: `1px solid ${isActive ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)"}`,
            cursor:       expanded ? "default" : "grab",
            userSelect:   "none",
            gap:          10,
            transition:   "border-color 0.12s ease",
          }}
        >
          <div style={{
            width:        4,
            height:       4,
            borderRadius: "50%",
            background:   isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)",
            flexShrink:   0,
            transition:   "background 0.12s ease",
          }} />
          <span style={{
            fontFamily:    MONO,
            fontSize:      9,
            letterSpacing: 2,
            color:         isActive ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.32)",
            textTransform: "uppercase",
            flex:          1,
            overflow:      "hidden",
            textOverflow:  "ellipsis",
            whiteSpace:    "nowrap",
            transition:    "color 0.12s ease",
          }}>
            {peerLabel}
          </span>
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{ display: "flex", gap: 2, flexShrink: 0 }}
          >
            <CtrlBtn title="Minimize" onClick={() => onMinimize(win.chat_id)}>–</CtrlBtn>
            <CtrlBtn title={expanded ? "Restore" : "Expand"} onClick={() => setExpanded(v => !v)}>
              {expanded ? "–□" : "□"}
            </CtrlBtn>
            <CtrlBtn title="Close" onClick={() => onClose(win.chat_id)} danger>×</CtrlBtn>
          </div>
        </div>

        {/* ── Messages ────────────────────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          style={{
            flex:           1,
            overflowY:      "auto",
            padding:        "10px 10px 6px",
            display:        "flex",
            flexDirection:  "column",
            gap:            6,
            userSelect:     "text",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.07) transparent",
          }}
        >
          {loading && (
            <span style={{
              fontFamily:    MONO,
              fontSize:      8,
              color:         "rgba(255,255,255,0.15)",
              letterSpacing: "1.5px",
              textAlign:     "center",
              paddingTop:    24,
              textTransform: "uppercase",
            }}>
              LOADING...
            </span>
          )}

          {/* Grouped messages */}
          {groupMessages(messages, currentUserId).map((group, gi) => (
            <div
              key={group.msgs[0].id}
              style={{
                display:       "flex",
                flexDirection: "column",
                alignItems:    group.isOwn ? "flex-end" : "flex-start",
                gap:           2,
                marginTop:     gi > 0 ? 4 : 0,
              }}
            >
              {group.msgs.map((msg, mi) => {
                const isNew   = initialLoadDoneRef.current && !seenIdsRef.current.has(msg.id);
                const isFirst = mi === 0;
                const isLast  = mi === group.msgs.length - 1;
                const radius  = group.isOwn
                  ? `${isFirst ? 3 : 1}px 3px ${isLast ? 1 : 3}px 3px`
                  : `3px ${isFirst ? 3 : 1}px 3px ${isLast ? 1 : 3}px`;
                return (
                  <div
                    key={msg.id}
                    style={{
                      display:       "flex",
                      flexDirection: "column",
                      alignItems:    group.isOwn ? "flex-end" : "flex-start",
                      animation:     isNew ? "msgIn 0.13s ease-out both" : undefined,
                    }}
                  >
                    <div style={{
                      maxWidth:   "82%",
                      padding:    "6px 11px",
                      borderRadius: radius,
                      background: group.isOwn ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.04)",
                      border:     `1px solid ${group.isOwn ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)"}`,
                      borderLeft: group.isOwn ? undefined : `2px solid rgba(255,255,255,${isFirst ? 0.13 : 0.06})`,
                      fontFamily: SANS,
                      fontSize:   12.5,
                      color:      group.isOwn ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.72)",
                      lineHeight: 1.5,
                      wordBreak:  "break-word",
                      userSelect: "text",
                    }}>
                      {msg.content}
                    </div>
                    {isLast && (
                      <span style={{
                        fontFamily:    MONO,
                        fontSize:      7,
                        color:         "rgba(255,255,255,0.22)",
                        marginTop:     3,
                        letterSpacing: 0.5,
                      }}>
                        {formatTime(msg.created_at)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Typing indicator */}
          {peerTyping && (
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        7,
              padding:    "4px 2px 2px",
              animation:  "msgIn 0.15s ease-out both",
            }}>
              <div style={{ display:"flex", gap:3, alignItems:"center" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width:     4,
                    height:    4,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.45)",
                    animation:  `typingDot 1.3s ease-in-out ${i * 0.18}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{
                fontFamily:    MONO,
                fontSize:      7,
                letterSpacing: 1,
                color:         "rgba(255,255,255,0.2)",
              }}>
                typing
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div style={{
          flexShrink:  0,
          borderTop:   `1px solid ${isActive ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)"}`,
          display:     "flex",
          alignItems:  "flex-end",
          gap:         5,
          padding:     "7px 8px",
          background:  "#07070a",
          transition:  "border-color 0.12s ease",
        }}>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); if (e.target.value) trackTyping(); }}
            onKeyDown={handleKeyDown}
            onMouseDown={e => e.stopPropagation()}
            placeholder="type a message..."
            rows={1}
            style={{
              flex:          1,
              background:    "rgba(255,255,255,0.04)",
              border:        "1px solid rgba(255,255,255,0.08)",
              borderRadius:  3,
              padding:       "6px 9px",
              color:         "rgba(255,255,255,0.82)",
              fontFamily:    SANS,
              fontSize:      12,
              letterSpacing: 0.2,
              resize:        "none",
              outline:       "none",
              lineHeight:    1.5,
              userSelect:    "text",
              transition:    "border-color 0.1s ease",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)"; }}
            onBlur={e =>  { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            onMouseDown={e => e.stopPropagation()}
            style={{
              background:    !input.trim() || sending ? "transparent" : "rgba(255,255,255,0.08)",
              border:        `1px solid ${!input.trim() || sending ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.18)"}`,
              borderRadius:  3,
              padding:       "6px 11px",
              color:         !input.trim() || sending ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.75)",
              fontFamily:    MONO,
              fontSize:      8,
              cursor:        !input.trim() || sending ? "default" : "pointer",
              flexShrink:    0,
              transition:    "all 0.1s ease",
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
            onMouseEnter={e => { if (input.trim() && !sending) { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.92)"; } }}
            onMouseLeave={e => { e.currentTarget.style.background = !input.trim() || sending ? "transparent" : "rgba(255,255,255,0.08)"; e.currentTarget.style.color = !input.trim() || sending ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.75)"; }}
          >
            SND
          </button>
        </div>

        {/* ── Resize handle ───────────────────────────────────────────────────── */}
        {!expanded && (
          <div
            onMouseDown={startResize}
            style={{
              position:            "absolute",
              bottom:              0,
              right:               0,
              width:               12,
              height:              12,
              cursor:              "nwse-resize",
              background:          "rgba(255,255,255,0.06)",
              borderTopLeftRadius: 3,
            }}
          />
        )}
      </div>
    </>
  );
}

// ── Control button ──────────────────────────────────────────────────────────────
function CtrlBtn({
  children,
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      {...props}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   hov
          ? (danger ? "rgba(180,40,40,0.3)"       : "rgba(255,255,255,0.09)")
          : "transparent",
        border: `1px solid ${hov
          ? (danger ? "rgba(180,40,40,0.5)"        : "rgba(255,255,255,0.18)")
          : "rgba(255,255,255,0.06)"}`,
        color:        hov
          ? (danger ? "rgba(230,80,80,0.95)"       : "rgba(255,255,255,0.88)")
          : "rgba(255,255,255,0.28)",
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
