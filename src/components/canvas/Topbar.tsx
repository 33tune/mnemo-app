"use client";
import { useState, useEffect, useRef } from "react";
import type { CanvasMode, PublishState } from "@/types";

const MONO = "'Space Mono', monospace";

export default function Topbar({
  wallpaper,
  handle,
  onLogout,
  canvasMode,
  onModeChange,
  publishState,
  onPublish,
  isBrowse,
  onBrowse,
  isChats,
  onChats,
  unreadChats,
  unreadSignals,
  onSignals,
  isAnalytics,
  onAnalytics,
}: {
  wallpaper: string;
  handle?: string;
  onLogout?: () => Promise<void>;
  canvasMode?: CanvasMode;
  onModeChange?: (newMode: CanvasMode) => Promise<void>;
  publishState?: PublishState;
  onPublish?: () => void;
  isBrowse?: boolean;
  onBrowse?: () => void;
  isChats?: boolean;
  onChats?: () => void;
  unreadChats?:   number;
  unreadSignals?: number;
  onSignals?:     () => void;
  isAnalytics?:   boolean;
  onAnalytics?:   () => void;
}) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [pulse, setPulse] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const prevUnreadRef = useRef(0);

  useEffect(() => {
    const next = unreadChats ?? 0;
    if (next > prevUnreadRef.current) {
      setBadgePulse(true);
      const t = setTimeout(() => setBadgePulse(false), 500);
      prevUnreadRef.current = next;
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = next;
  }, [unreadChats]);

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
      setDate(now.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" }).toUpperCase());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 3000);
    return () => clearInterval(id);
  }, []);

  const tabs: { key: string; label: string; active: boolean; onClick: () => void }[] = [];
  if (onAnalytics) {
    tabs.push({ key: "analytics", label: "ANALYTICS", active: !!isAnalytics && !isBrowse && !isChats, onClick: onAnalytics });
  }
  if (onModeChange && canvasMode) {
    // MY LAND is active for both space views; switching always goes to desktop (space).
    // The Desktop/Mobile toggle lives at the bottom of the canvas editor, not here.
    tabs.push({ key: "space", label: "MY LAND", active: (canvasMode === "space" || canvasMode === "space_mobile") && !isBrowse && !isChats && !isAnalytics, onClick: () => onModeChange("space") });
  }
  if (onChats) tabs.push({ key: "chats", label: "SOCIAL", active: !!isChats && !isAnalytics, onClick: onChats });

  return (
    <>
      {(publishState === "publishing" || badgePulse) && (
        <style>{`
          @keyframes mnemo-pub-pulse { 0%,100% { opacity:0.3 } 50% { opacity:0.85 } }
          @keyframes badgePop { 0% { transform:scale(1) } 40% { transform:scale(1.4) } 100% { transform:scale(1) } }
        `}</style>
      )}
      <div suppressHydrationWarning style={{
        position:            "fixed",
        top:                 0,
        left:                0,
        right:               0,
        height:              44,
        zIndex:              800,
        display:             "flex",
        alignItems:          "center",
        padding:             "0 18px",
        background:          wallpaper ? "rgba(0,0,0,0.38)" : "rgba(7,7,9,0.9)",
        backdropFilter:      "blur(28px)",
        WebkitBackdropFilter:"blur(28px)",
        borderBottom:        "1px solid rgba(255,255,255,0.07)",
      }}>

        {/* ── Logo ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            width:      5,
            height:     5,
            borderRadius:"50%",
            background: pulse ? "rgba(232,224,212,0.92)" : "rgba(232,224,212,0.28)",
            transition: "background 1.8s ease, box-shadow 1.8s ease",
            boxShadow:  pulse ? "0 0 7px rgba(232,224,212,0.55)" : "none",
          }} />
          <span style={{
            fontFamily:    MONO,
            fontSize:      10,
            letterSpacing: 1.5,
            color:         "rgba(255,255,255,0.55)",
            userSelect:    "none",
          }}>
            myLand
          </span>
        </div>

        {/* ── Tabs — centered ── */}
        {tabs.length > 0 && (
          <div style={{
            position:   "absolute",
            left:       "50%",
            transform:  "translateX(-50%)",
            display:    "flex",
            alignItems: "center",
            gap:        1,
            background: "rgba(255,255,255,0.03)",
            border:     "1px solid rgba(255,255,255,0.07)",
            borderRadius: 6,
            padding:    "3px",
          }}>
            {tabs.map(tab => (
              <TabBtn
                key={tab.key}
                active={tab.active}
                onClick={tab.onClick}
                badge={tab.key === "chats" && (unreadChats ?? 0) > 0 ? unreadChats : undefined}
                badgePulse={badgePulse}
              >
                {tab.label}
              </TabBtn>
            ))}
          </div>
        )}

        {/* ── Right side ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto", flexShrink: 0 }}>

          {publishState !== undefined && (
            <button
              onClick={publishState === "pending" ? onPublish : undefined}
              disabled={publishState !== "pending"}
              style={{
                background:    "transparent",
                border:        `1px solid ${
                  publishState === "pending"    ? "rgba(212,240,196,0.32)" :
                  publishState === "success"    ? "rgba(212,240,196,0.18)" :
                                                  "rgba(255,255,255,0.07)"
                }`,
                borderRadius:  4,
                padding:       "3px 10px",
                fontFamily:    MONO,
                fontSize:      8,
                letterSpacing: 1.8,
                color:
                  publishState === "pending"    ? "rgba(212,240,196,0.92)" :
                  publishState === "success"    ? "rgba(212,240,196,0.62)" :
                  publishState === "publishing" ? "rgba(255,255,255,0.35)" :
                                                  "rgba(255,255,255,0.18)",
                textTransform: "uppercase",
                cursor:        publishState === "pending" ? "pointer" : "default",
                transition:    "all 0.1s ease",
                animation:     publishState === "publishing" ? "mnemo-pub-pulse 1.1s ease-in-out infinite" : undefined,
              }}
              onMouseEnter={e => { if (publishState === "pending") { e.currentTarget.style.borderColor = "rgba(212,240,196,0.55)"; e.currentTarget.style.background = "rgba(212,240,196,0.06)"; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = publishState === "pending" ? "rgba(212,240,196,0.32)" : "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "transparent"; }}
            >
              {publishState === "idle"        ? "published"     :
               publishState === "pending"     ? "publish"       :
               publishState === "publishing"  ? "publishing..." :
                                                "published ✓"}
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.35)" }}>
              {date}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.58)", fontVariantNumeric: "tabular-nums" }}>
              {time}
            </span>
          </div>

          {onSignals && (
            <SignalsBtn count={unreadSignals ?? 0} onClick={onSignals} />
          )}

          {handle && (
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
              @{handle}
            </span>
          )}

          {onLogout && (
            <LogoutBtn onClick={onLogout} />
          )}
        </div>
      </div>
    </>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────────
function TabBtn({
  children,
  active,
  onClick,
  badge,
  badgePulse,
}: {
  children:    React.ReactNode;
  active:      boolean;
  onClick:     () => void;
  badge?:      number;
  badgePulse?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           5,
        padding:       "4px 13px",
        borderRadius:  4,
        border:        active ? "1px solid rgba(255,255,255,0.13)" : "1px solid transparent",
        background:    active
          ? "rgba(255,255,255,0.11)"
          : hov ? "rgba(255,255,255,0.05)" : "transparent",
        color:         active
          ? "rgba(255,255,255,0.92)"
          : hov ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.38)",
        fontFamily:    "'Space Mono', monospace",
        fontSize:      8,
        letterSpacing: 2,
        textTransform: "uppercase",
        cursor:        "pointer",
        fontWeight:    active ? 500 : 400,
        transition:    "all 0.1s ease",
        userSelect:    "none",
        whiteSpace:    "nowrap",
      }}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span style={{
          display:        "inline-flex",
          alignItems:     "center",
          justifyContent: "center",
          background:     active ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.7)",
          color:          "#07070a",
          fontFamily:     "'Space Mono', monospace",
          fontSize:       7,
          fontWeight:     700,
          letterSpacing:  0,
          borderRadius:   2,
          padding:        "1px 4px",
          lineHeight:     1.2,
          minWidth:       14,
          animation:      badgePulse ? "badgePop 0.4s ease-out" : undefined,
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Signals button ─────────────────────────────────────────────────────────────
function SignalsBtn({ count, onClick }: { count: number; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const hasUnread = count > 0;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           5,
        background:    "transparent",
        border:        `1px solid ${hov ? "rgba(255,255,255,0.18)" : hasUnread ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)"}`,
        borderRadius:  4,
        padding:       "3px 8px",
        fontFamily:    "'Space Mono', monospace",
        fontSize:      8,
        letterSpacing: 1.5,
        color:         hov ? "rgba(255,255,255,0.72)" : hasUnread ? "rgba(255,255,255,0.58)" : "rgba(255,255,255,0.28)",
        textTransform: "uppercase",
        cursor:        "pointer",
        transition:    "all 0.1s ease",
        userSelect:    "none",
      }}
    >
      SIG
      {hasUnread && (
        <span style={{
          display:        "inline-flex",
          alignItems:     "center",
          justifyContent: "center",
          background:     "rgba(255,255,255,0.82)",
          color:          "#07070a",
          fontFamily:     "'Space Mono', monospace",
          fontSize:       7,
          fontWeight:     700,
          letterSpacing:  0,
          borderRadius:   2,
          padding:        "1px 4px",
          lineHeight:     1.2,
          minWidth:       14,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Logout button ──────────────────────────────────────────────────────────────
function LogoutBtn({ onClick }: { onClick: () => Promise<void> }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:    "transparent",
        border:        `1px solid ${hov ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)"}`,
        borderRadius:  4,
        padding:       "3px 9px",
        fontFamily:    "'Space Mono', monospace",
        fontSize:      8,
        letterSpacing: 1.5,
        color:         hov ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.28)",
        textTransform: "uppercase",
        cursor:        "pointer",
        transition:    "all 0.1s ease",
        userSelect:    "none",
      }}
    >
      exit
    </button>
  );
}
