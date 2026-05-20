"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PresenceState } from "@/types";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const MIN_W = 268;

function computePresence(
  lastActiveAt: string | null,
  lastProfileUpdateAt: string | null,
): PresenceState {
  if (!lastActiveAt) return "OFFLINE";
  const now = Date.now();
  const activeMins = (now - new Date(lastActiveAt).getTime()) / 60_000;
  const updateMins = lastProfileUpdateAt
    ? (now - new Date(lastProfileUpdateAt).getTime()) / 60_000
    : Infinity;
  if (updateMins < 15) return "EDITING SPACE";
  if (activeMins < 5)  return "ACTIVE NOW";
  if (activeMins < 30) return "AWAY";
  return "OFFLINE";
}

type SocialUserRow = {
  userId:      string;
  handle:      string;
  displayName: string | null;
  presence:    PresenceState;
};

export interface SocialPanelState {
  id:           string;
  targetUserId: string;
  targetHandle: string;
  mode:         "followers" | "following";
  x:            number;
  y:            number;
  z:            number;
}

interface Props extends SocialPanelState {
  currentUserId?: string;
  onClose:        (id: string) => void;
  onFocus:        (id: string) => void;
  onMove:         (id: string, x: number, y: number) => void;
}

export default function SocialPanelWindow({
  id, targetUserId, targetHandle, mode, x, y, z,
  currentUserId, onClose, onFocus, onMove,
}: Props) {
  const router = useRouter();
  const [rows,    setRows]    = useState<SocialUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const sb = createClient();
      let ids: string[] = [];

      if (mode === "followers") {
        const { data } = await sb
          .from("followers").select("follower_id").eq("following_id", targetUserId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ids = (data ?? []).map((r: any) => r.follower_id);
      } else {
        const { data } = await sb
          .from("followers").select("following_id").eq("follower_id", targetUserId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ids = (data ?? []).map((r: any) => r.following_id);
      }

      if (ids.length === 0) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }

      const { data: profiles } = await sb
        .from("profiles")
        .select("user_id, handle, display_name, last_active_at, last_profile_update_at")
        .in("user_id", ids)
        .limit(100);

      if (cancelled) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRows((profiles ?? []).map((p: any) => ({
        userId:      p.user_id,
        handle:      p.handle ?? "",
        displayName: p.display_name ?? null,
        presence:    computePresence(p.last_active_at ?? null, p.last_profile_update_at ?? null),
      })));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [targetUserId, mode]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    onFocus(id);
    document.body.style.cursor = "grabbing";
    const startX = x, startY = y;
    const startMX = e.clientX, startMY = e.clientY;

    function clampX(v: number) { return Math.max(0, Math.min(window.innerWidth - MIN_W - 8, v)); }
    function clampY(v: number) { return Math.max(52, Math.min(window.innerHeight - 80, v)); }

    function onMouseMove(ev: MouseEvent) {
      if (!cardRef.current) return;
      cardRef.current.style.left = `${clampX(startX + ev.clientX - startMX)}px`;
      cardRef.current.style.top  = `${clampY(startY + ev.clientY - startMY)}px`;
    }
    function onMouseUp(ev: MouseEvent) {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup",   onMouseUp);
      document.body.style.cursor = "";
      onMove(id, clampX(startX + ev.clientX - startMX), clampY(startY + ev.clientY - startMY));
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup",   onMouseUp);
  }, [id, x, y, onFocus, onMove]);

  const label = mode === "followers" ? "FOLLOWERS" : "FOLLOWING";

  return (
    <div
      ref={cardRef}
      onMouseDown={() => onFocus(id)}
      style={{
        position:      "absolute",
        left:          x,
        top:           y,
        width:         MIN_W,
        zIndex:        z,
        display:       "flex",
        flexDirection: "column",
        background:    "#0c0c0e",
        border:        "1px solid rgba(255,255,255,0.14)",
        borderRadius:  4,
        boxShadow:     "0 24px 64px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.04)",
        overflow:      "hidden",
        userSelect:    "none",
        opacity:       visible ? 1 : 0,
        transform:     visible ? "scale(1) translateY(0px)" : "scale(0.97) translateY(8px)",
        transition:    "opacity 0.15s ease, transform 0.15s ease",
      }}
    >
      {/* ── Header ── */}
      <div
        onMouseDown={startDrag}
        style={{
          height:       40,
          flexShrink:   0,
          display:      "flex",
          alignItems:   "center",
          padding:      "0 10px 0 14px",
          background:   "#07070a",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          cursor:       "grab",
          gap:          10,
        }}
      >
        <div style={{
          width:        4,
          height:       4,
          borderRadius: "50%",
          background:   "rgba(255,255,255,0.4)",
          flexShrink:   0,
        }} />
        <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
          <div style={{
            fontFamily:    MONO,
            fontSize:      8,
            letterSpacing: 2.5,
            color:         "rgba(255,255,255,0.55)",
            textTransform: "uppercase" as const,
            whiteSpace:    "nowrap",
            overflow:      "hidden",
            textOverflow:  "ellipsis",
          }}>
            {label} {!loading && `(${rows.length})`}
          </div>
          <div style={{
            fontFamily:    MONO,
            fontSize:      7,
            letterSpacing: 1,
            color:         "rgba(255,255,255,0.22)",
            marginTop:     2,
          }}>
            @{targetHandle}
          </div>
        </div>
        <CtrlBtn title="Close" onClick={() => onClose(id)} danger>×</CtrlBtn>
      </div>

      {/* ── User list ── */}
      <div style={{
        overflowY:    "auto",
        maxHeight:    400,
        padding:      "4px 0",
        scrollbarWidth: "thin" as const,
        scrollbarColor: "rgba(255,255,255,0.07) transparent",
      }}>
        {loading ? (
          <div style={{
            padding:       "28px 14px",
            textAlign:     "center",
            fontFamily:    MONO,
            fontSize:      8,
            letterSpacing: 1.5,
            color:         "rgba(255,255,255,0.15)",
            textTransform: "uppercase" as const,
          }}>
            SCANNING...
          </div>
        ) : rows.length === 0 ? (
          <EmptyState mode={mode} />
        ) : (
          rows.map(row => (
            <UserRow
              key={row.userId}
              row={row}
              isSelf={row.userId === currentUserId}
              onClick={() => router.push(`/${row.handle}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── User row ───────────────────────────────────────────────────────────────────
function UserRow({
  row,
  isSelf,
  onClick,
}: {
  row:     SocialUserRow;
  isSelf:  boolean;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);

  const presenceColor =
    row.presence === "ACTIVE NOW"    ? "rgba(255,255,255,0.48)" :
    row.presence === "EDITING SPACE" ? "rgba(160,210,255,0.42)" :
    row.presence === "AWAY"          ? "rgba(255,255,255,0.18)" :
    null;

  const initial = ((row.displayName ?? row.handle) || "?").charAt(0).toUpperCase();

  return (
    <div
      onClick={isSelf ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          10,
        padding:      "8px 14px",
        cursor:       isSelf ? "default" : "pointer",
        background:   hov && !isSelf ? "rgba(255,255,255,0.035)" : "transparent",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        transition:   "background 0.08s ease",
      }}
    >
      {/* Avatar initial */}
      <div style={{
        width:          26,
        height:         26,
        borderRadius:   "50%",
        background:     "rgba(255,255,255,0.05)",
        border:         `1px solid ${hov && !isSelf ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.09)"}`,
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

      {/* Name + handle */}
      <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
        <div style={{
          fontFamily:   SANS,
          fontSize:     12,
          fontWeight:   500,
          color:        isSelf
            ? "rgba(255,255,255,0.28)"
            : hov
              ? "rgba(255,255,255,0.88)"
              : "rgba(255,255,255,0.68)",
          whiteSpace:   "nowrap",
          overflow:     "hidden",
          textOverflow: "ellipsis",
          transition:   "color 0.08s ease",
        }}>
          {row.displayName || row.handle}
          {isSelf && (
            <span style={{
              fontFamily:    MONO,
              fontSize:       7,
              letterSpacing:  1.5,
              color:          "rgba(255,255,255,0.2)",
              marginLeft:     6,
              textTransform:  "uppercase" as const,
            }}>
              you
            </span>
          )}
        </div>
        <div style={{
          fontFamily:    MONO,
          fontSize:      8,
          color:         "rgba(255,255,255,0.22)",
          letterSpacing: 0.5,
          marginTop:     2,
        }}>
          @{row.handle}
        </div>
      </div>

      {/* Presence badge */}
      {presenceColor && (
        <div style={{
          fontFamily:    MONO,
          fontSize:      6,
          letterSpacing: 1.5,
          color:         presenceColor,
          textTransform: "uppercase" as const,
          whiteSpace:    "nowrap",
          flexShrink:    0,
        }}>
          {row.presence === "EDITING SPACE" ? "EDITING" : row.presence}
        </div>
      )}

      {/* Nav arrow */}
      {!isSelf && hov && (
        <div style={{
          color:      "rgba(255,255,255,0.28)",
          fontSize:   12,
          flexShrink: 0,
          lineHeight: 1,
        }}>
          →
        </div>
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ mode }: { mode: "followers" | "following" }) {
  const [title, sub] = mode === "followers"
    ? ["NO SIGNALS",     "no one following yet"]
    : ["NO CONNECTIONS", "not following anyone"];

  return (
    <div style={{
      padding:       "36px 14px",
      display:       "flex",
      flexDirection: "column",
      alignItems:    "center",
      gap:           7,
    }}>
      <div style={{
        fontFamily:    MONO,
        fontSize:      9,
        letterSpacing: 3,
        color:         "rgba(255,255,255,0.15)",
        textTransform: "uppercase" as const,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily:    MONO,
        fontSize:      7,
        letterSpacing: 1.5,
        color:         "rgba(255,255,255,0.08)",
        textTransform: "uppercase" as const,
      }}>
        {sub}
      </div>
    </div>
  );
}

// ── Control button ─────────────────────────────────────────────────────────────
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
      onMouseDown={e => e.stopPropagation()}
      style={{
        background:   hov
          ? (danger ? "rgba(180,40,40,0.3)" : "rgba(255,255,255,0.1)")
          : "transparent",
        border: `1px solid ${hov
          ? (danger ? "rgba(180,40,40,0.5)" : "rgba(255,255,255,0.22)")
          : "rgba(255,255,255,0.07)"}`,
        color: hov
          ? (danger ? "rgba(230,80,80,0.95)" : "rgba(255,255,255,0.9)")
          : "rgba(255,255,255,0.3)",
        cursor:       "pointer",
        fontFamily:   MONO,
        fontSize:     11,
        padding:      "0 5px",
        lineHeight:   "20px",
        borderRadius: 2,
        transition:   "all 0.1s ease",
        minWidth:     22,
        textAlign:    "center" as const,
        userSelect:   "none",
      }}
    >
      {children}
    </button>
  );
}
