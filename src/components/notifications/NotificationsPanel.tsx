"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppNotification } from "@/hooks/useNotifications";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

const PANEL_STYLES = `
@keyframes signalIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
`;

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

interface Props {
  notifications: AppNotification[];
  loading:       boolean;
  onClose:       () => void;
}

export default function NotificationsPanel({ notifications, loading, onClose }: Props) {
  const router  = useRouter();
  const [alive, setAlive] = useState(true);

  function close() {
    setAlive(false);
    setTimeout(onClose, 110);
  }

  function navigate(handle: string) {
    close();
    setTimeout(() => router.push(`/${handle}`), 120);
  }

  return (
    <>
      <style>{PANEL_STYLES}</style>

      {/* ── Backdrop — click outside to close ── */}
      <div
        style={{ position: "absolute", inset: 0, zIndex: 1999 }}
        onClick={close}
      />

      {/* ── Panel ── */}
      <div
        style={{
          position:      "absolute",
          top:           52,
          right:         18,
          width:         300,
          zIndex:        2000,
          display:       "flex",
          flexDirection: "column",
          background:    "#0c0c0e",
          border:        "1px solid rgba(255,255,255,0.14)",
          borderRadius:  4,
          boxShadow:     "0 20px 60px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.04)",
          overflow:      "hidden",
          opacity:       alive ? 1 : 0,
          transform:     alive ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.98)",
          transition:    "opacity 0.11s ease, transform 0.11s ease",
          animation:     "signalIn 0.14s ease-out both",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          height:       38,
          flexShrink:   0,
          display:      "flex",
          alignItems:   "center",
          padding:      "0 8px 0 12px",
          background:   "#07070a",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          gap:          8,
        }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.45)", flexShrink: 0 }} />
          <span style={{
            fontFamily:    MONO,
            fontSize:      8,
            letterSpacing: 2.5,
            color:         "rgba(255,255,255,0.58)",
            textTransform: "uppercase",
            flex:          1,
            userSelect:    "none",
          }}>
            SIGNALS
          </span>
          {!loading && notifications.length > 0 && (
            <span style={{
              fontFamily:    MONO,
              fontSize:      7,
              letterSpacing: 1,
              color:         "rgba(255,255,255,0.22)",
              userSelect:    "none",
            }}>
              {notifications.length} EVENT{notifications.length !== 1 ? "S" : ""}
            </span>
          )}
          <PanelCtrlBtn onClick={close}>×</PanelCtrlBtn>
        </div>

        {/* ── List ── */}
        <div style={{
          overflowY:    "auto",
          maxHeight:    440,
          scrollbarWidth: "thin" as const,
          scrollbarColor: "rgba(255,255,255,0.07) transparent",
        }}>
          {loading ? (
            <div style={{
              padding:       "32px 14px",
              textAlign:     "center",
              fontFamily:    MONO,
              fontSize:      8,
              letterSpacing: 1.5,
              color:         "rgba(255,255,255,0.15)",
              textTransform: "uppercase",
            }}>
              SCANNING...
            </div>
          ) : notifications.length === 0 ? (
            <EmptySignals />
          ) : (
            notifications.map(n => (
              <NotifRow
                key={n.id}
                notif={n}
                onClick={() => navigate(n.actorHandle)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Notification row ───────────────────────────────────────────────────────────
function NotifRow({ notif, onClick }: { notif: AppNotification; onClick: () => void }) {
  const [hov, setHov] = useState(false);

  const icon    = notif.type === "follow" ? "↑" : "★";
  const label   = notif.type === "follow" ? "FOLLOWED YOUR SPACE" : "FAVORITED YOUR PROFILE";
  const initial = ((notif.actorName ?? notif.actorHandle) || "?").charAt(0).toUpperCase();
  const isNew   = !notif.read;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          10,
        padding:      "9px 12px 9px " + (isNew ? "10px" : "12px"),
        cursor:       "pointer",
        background:   hov ? "rgba(255,255,255,0.032)" : (isNew ? "rgba(255,255,255,0.018)" : "transparent"),
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        borderLeft:   isNew ? "2px solid rgba(255,255,255,0.28)" : "none",
        transition:   "background 0.08s ease",
      }}
    >
      {/* Actor initial */}
      <div style={{
        width:          26,
        height:         26,
        borderRadius:   "50%",
        background:     "rgba(255,255,255,0.05)",
        border:         `1px solid ${hov ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)"}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
        fontFamily:     MONO,
        fontSize:       10,
        color:          "rgba(255,255,255,0.35)",
        transition:     "border-color 0.08s ease",
      }}>
        {initial}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
        <div style={{
          fontFamily:    MONO,
          fontSize:      7,
          letterSpacing: 1.5,
          color:         isNew ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.32)",
          textTransform: "uppercase",
          whiteSpace:    "nowrap",
          overflow:      "hidden",
          textOverflow:  "ellipsis",
          transition:    "color 0.08s ease",
        }}>
          {icon} {label}
        </div>
        <div style={{
          fontFamily:    SANS,
          fontSize:      11,
          color:         hov ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.32)",
          marginTop:     2,
          letterSpacing: 0.1,
          whiteSpace:    "nowrap",
          overflow:      "hidden",
          textOverflow:  "ellipsis",
          transition:    "color 0.08s ease",
        }}>
          {notif.actorName || `@${notif.actorHandle}`}
        </div>
      </div>

      {/* Time */}
      <div style={{
        fontFamily:    MONO,
        fontSize:      7,
        color:         "rgba(255,255,255,0.18)",
        flexShrink:    0,
        letterSpacing: 0.5,
      }}>
        {formatRelTime(notif.createdAt)}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptySignals() {
  return (
    <div style={{
      padding:       "40px 14px",
      display:       "flex",
      flexDirection: "column",
      alignItems:    "center",
      gap:           8,
    }}>
      <div style={{
        fontFamily:    MONO,
        fontSize:      9,
        letterSpacing: 3,
        color:         "rgba(255,255,255,0.15)",
        textTransform: "uppercase",
      }}>
        SILENT NETWORK
      </div>
      <div style={{
        fontFamily:    MONO,
        fontSize:      7,
        letterSpacing: 2,
        color:         "rgba(255,255,255,0.08)",
        textTransform: "uppercase",
      }}>
        no signals detected
      </div>
    </div>
  );
}

// ── Panel control button ───────────────────────────────────────────────────────
function PanelCtrlBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   hov ? "rgba(255,255,255,0.09)" : "transparent",
        border:       `1px solid ${hov ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}`,
        color:        hov ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.28)",
        cursor:       "pointer",
        fontFamily:   MONO,
        fontSize:     11,
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
