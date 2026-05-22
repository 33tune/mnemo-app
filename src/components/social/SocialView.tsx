"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type React from "react";
import { createClient } from "@/lib/supabase/client";
import { useChats } from "@/hooks/useChats";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { openOrCreateChat } from "@/lib/chat/openOrCreateChat";
import ActivityFeed from "@/components/social/ActivityFeed";
import { useRouter } from "next/navigation";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "people" | "following" | "messages" | "activity";

interface SocialUser {
  user_id:      string;
  handle:       string;
  display_name: string | null;
  avatar_url:   string | null;
  last_active:  string | null;
}

interface ActivityItem {
  id:        string;
  type:      "followed_you" | "active" | "message";
  user:      SocialUser;
  timestamp: string;
  label:     string;
}

interface Settings { opacity: number; blur: number; density: "compact" | "cozy" }
const SETTINGS_KEY = "mnemo_social_v2";
const DEFAULTS: Settings = { opacity: 0.86, blur: 28, density: "cozy" };
function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; } catch { return DEFAULTS; }
}
function saveSettings(s: Settings) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /**/ } }

// ── Presence ──────────────────────────────────────────────────────────────────
type Presence = "ONLINE" | "ACTIVE" | "AWAY" | "OFFLINE";
function getPresence(last: string | null): Presence {
  if (!last) return "OFFLINE";
  const d = Date.now() - new Date(last).getTime();
  if (d < 4   * 60_000) return "ONLINE";
  if (d < 25  * 60_000) return "ACTIVE";
  if (d < 120 * 60_000) return "AWAY";
  return "OFFLINE";
}
const DOT_COLOR: Record<Presence, string> = {
  ONLINE: "rgba(212,240,196,1)", ACTIVE: "rgba(212,240,196,0.55)",
  AWAY:   "rgba(255,255,255,0.22)", OFFLINE: "transparent",
};
const LABEL_COLOR: Record<Presence, string> = {
  ONLINE: "rgba(212,240,196,0.75)", ACTIVE: "rgba(212,240,196,0.45)",
  AWAY:   "rgba(255,255,255,0.2)",  OFFLINE: "rgba(255,255,255,0.1)",
};

// ── Primitives ────────────────────────────────────────────────────────────────
function Avatar({ u, size = 36, dot }: { u: SocialUser; size?: number; dot?: boolean }) {
  const init = (u.display_name || u.handle).slice(0, 2).toUpperCase();
  const p    = getPresence(u.last_active);
  const dc   = DOT_COLOR[p];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.09)", background: u.avatar_url ? undefined : "rgba(255,255,255,0.05)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {u.avatar_url
          ? <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontFamily: MONO, fontSize: Math.floor(size * 0.28), color: "rgba(255,255,255,0.22)" }}>{init}</span>
        }
      </div>
      {dot && dc !== "transparent" && <div style={{ position: "absolute", bottom: 0, right: 0, width: Math.max(7, size * 0.22), height: Math.max(7, size * 0.22), borderRadius: "50%", background: dc, border: "1.5px solid rgba(8,8,10,0.95)" }} />}
    </div>
  );
}

function Card({ children, style, onClick, selected }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void; selected?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   selected ? "rgba(212,240,196,0.04)" : hov ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
        border:       `1px solid ${selected ? "rgba(212,240,196,0.2)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 8,
        cursor:       onClick ? "pointer" : "default",
        transition:   "all 0.1s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Panel({ children, s, style }: { children: React.ReactNode; s: Settings; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: `rgba(7,7,9,${s.opacity})`,
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      backdropFilter: `blur(${s.blur}px)`,
      WebkitBackdropFilter: `blur(${s.blur}px)`,
      boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

function PanelHdr({ label, right, count }: { label: string; right?: React.ReactNode; count?: number }) {
  return (
    <div style={{ padding: "9px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 2.5, color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>{label}</span>
        {count !== undefined && <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.1)" }}>{count}</span>}
      </div>
      {right}
    </div>
  );
}

function Atm({ line1, line2, cta, onCta }: { line1: string; line2?: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={{ padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
      <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.07)" }}>── ──</div>
      <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 2, color: "rgba(255,255,255,0.16)", textTransform: "uppercase" }}>{line1}</div>
      {line2 && <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.09)", textTransform: "uppercase" }}>{line2}</div>}
      {cta && onCta && (
        <button onClick={onCta} style={{ marginTop: 8, padding: "4px 12px", borderRadius: 4, border: "1px solid rgba(212,240,196,0.2)", background: "transparent", color: "rgba(212,240,196,0.55)", fontFamily: MONO, fontSize: 7.5, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", transition: "all 0.1s" }}>
          {cta}
        </button>
      )}
      <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.07)" }}>── ──</div>
    </div>
  );
}

function MiniBtn({ label, onClick, accent, active, disabled }: { label: string; onClick: (e: React.MouseEvent) => void; accent?: boolean; active?: boolean; disabled?: boolean }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: "2px 7px", borderRadius: 3, flexShrink: 0,
        border: accent || active
          ? `1px solid ${h || active ? "rgba(212,240,196,0.4)" : "rgba(212,240,196,0.18)"}`
          : `1px solid ${h ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}`,
        background: "transparent",
        color: accent || active ? (h || active ? "rgba(212,240,196,0.9)" : "rgba(212,240,196,0.5)") : (h ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.32)"),
        fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1,
        transition: "all 0.08s", userSelect: "none", whiteSpace: "nowrap",
      }}
    >{label}</button>
  );
}

function BigBtn({ label, onClick, accent, disabled }: { label: string; onClick: () => void; accent?: boolean; disabled?: boolean }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: "100%", padding: "6px 12px", borderRadius: 4,
        border: accent ? `1px solid ${h ? "rgba(212,240,196,0.45)" : "rgba(212,240,196,0.2)"}` : `1px solid ${h ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"}`,
        background: "transparent",
        color: accent ? (h ? "rgba(212,240,196,0.92)" : "rgba(212,240,196,0.6)") : (h ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.35)"),
        fontFamily: MONO, fontSize: 8, letterSpacing: 2, textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
        transition: "all 0.1s", userSelect: "none",
      }}
    >{label}</button>
  );
}

function UnreadBadge({ n }: { n: number }) {
  return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.8)", color: "#07070a", fontFamily: MONO, fontSize: 7, fontWeight: 700, borderRadius: 2, padding: "1px 4px", minWidth: 14, lineHeight: 1.2, flexShrink: 0 }}>{n > 9 ? "9+" : n}</span>;
}

// ── PEOPLE tab ────────────────────────────────────────────────────────────────
function PeopleTab({
  users, followingIds, onSelect, selected, onMsg, onVisit, onFollow, s, messaging,
}: {
  users:        SocialUser[];
  followingIds: Set<string>;
  onSelect:     (u: SocialUser | null) => void;
  selected:     SocialUser | null;
  onMsg:        (id: string) => void;
  onVisit:      (h: string) => void;
  onFollow:     (id: string) => void;
  s:            Settings;
  messaging:    boolean;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "recent">("all");

  const filtered = users.filter(u => {
    const q   = search.toLowerCase();
    const hit = !q || (u.handle + (u.display_name || "")).toLowerCase().includes(q);
    if (!hit) return false;
    if (filter === "online") return ["ONLINE","ACTIVE"].includes(getPresence(u.last_active));
    if (filter === "recent") return u.last_active && Date.now() - new Date(u.last_active).getTime() < 7 * 24 * 60 * 60_000;
    return true;
  });

  const gap = s.density === "compact" ? 8 : 12;
  const cardW = s.density === "compact" ? 150 : 170;

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Search + filter */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="search users..."
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "5px 10px", fontFamily: MONO, fontSize: 8.5, letterSpacing: 1, color: "rgba(255,255,255,0.65)", outline: "none", boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {(["all", "online", "recent"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "2px 8px", borderRadius: 3, border: `1px solid ${filter === f ? "rgba(212,240,196,0.25)" : "rgba(255,255,255,0.06)"}`, background: filter === f ? "rgba(212,240,196,0.05)" : "transparent", color: filter === f ? "rgba(212,240,196,0.65)" : "rgba(255,255,255,0.28)", fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer", transition: "all 0.1s" }}>
              {f}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.1)" }}>{filtered.length}</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowY: "auto", flex: 1, padding: 12 }}>
        {users.length === 0 && <Atm line1="NO PUBLIC USERS YET" line2="BE THE FIRST TO JOIN" />}
        {users.length > 0 && filtered.length === 0 && <Atm line1="NO RESULTS" line2="TRY A DIFFERENT SEARCH" />}
        {filtered.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap }}>
            {filtered.map(u => {
              const p  = getPresence(u.last_active);
              const dc = DOT_COLOR[p];
              const isSel = selected?.user_id === u.user_id;
              const isFollowing = followingIds.has(u.user_id);
              return (
                <Card
                  key={u.user_id}
                  selected={isSel}
                  onClick={() => onSelect(isSel ? null : u)}
                  style={{ width: cardW, padding: s.density === "compact" ? "10px 10px" : "14px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: s.density === "compact" ? 7 : 9 }}
                >
                  <div style={{ position: "relative" }}>
                    <Avatar u={u} size={s.density === "compact" ? 38 : 46} />
                    {dc !== "transparent" && <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: "50%", background: dc, border: "1.5px solid rgba(7,7,9,0.95)" }} />}
                  </div>
                  <div style={{ textAlign: "center", width: "100%", overflow: "hidden" }}>
                    <div style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 500, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.display_name || u.handle}</div>
                    <div style={{ fontFamily: MONO, fontSize: 7.5, color: LABEL_COLOR[p], letterSpacing: 1, marginTop: 2, textTransform: "uppercase" }}>@{u.handle}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                    <MiniBtn label={isFollowing ? "FOLLOWING" : "FOLLOW"} onClick={e=>{e.stopPropagation();onFollow(u.user_id);}} accent={isFollowing} active={isFollowing} />
                    <MiniBtn label="MSG" onClick={e=>{e.stopPropagation();onMsg(u.user_id);}} disabled={messaging} />
                    <MiniBtn label="VIEW" onClick={e=>{e.stopPropagation();onVisit(u.handle);}} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── FOLLOWING tab ─────────────────────────────────────────────────────────────
function FollowingTab({
  followedUsers, onSelect, selected, onMsg, onVisit, onSwitchToPeople, s, messaging,
}: {
  followedUsers: SocialUser[];
  onSelect:      (u: SocialUser | null) => void;
  selected:      SocialUser | null;
  onMsg:         (id: string) => void;
  onVisit:       (h: string) => void;
  onSwitchToPeople: () => void;
  s:             Settings;
  messaging:     boolean;
}) {
  const pad = s.density === "compact" ? "7px 12px" : "9px 14px";
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {followedUsers.length === 0 && (
        <Atm line1="YOU ARE NOT FOLLOWING ANYONE YET" line2="DISCOVER PEOPLE TO CONNECT" cta="DISCOVER PEOPLE" onCta={onSwitchToPeople} />
      )}
      {followedUsers.map(u => {
        const p  = getPresence(u.last_active);
        const dc = DOT_COLOR[p];
        const isSel = selected?.user_id === u.user_id;
        return (
          <div
            key={u.user_id}
            onClick={() => onSelect(isSel ? null : u)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: pad, borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer", background: isSel ? "rgba(255,255,255,0.04)" : "transparent", borderLeft: `2px solid ${isSel ? "rgba(212,240,196,0.3)" : "transparent"}`, transition: "background 0.08s" }}
            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
            onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar u={u} size={36} />
              {dc !== "transparent" && <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: dc, border: "1.5px solid rgba(7,7,9,0.95)" }} />}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.82)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.display_name || u.handle}</div>
              <div style={{ fontFamily: MONO, fontSize: 7.5, color: LABEL_COLOR[p], letterSpacing: 1, marginTop: 1, textTransform: "uppercase" }}>{p}</div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <MiniBtn label="MSG" onClick={e=>{e.stopPropagation();onMsg(u.user_id);}} disabled={messaging} />
              <MiniBtn label="VIEW" onClick={e=>{e.stopPropagation();onVisit(u.handle);}} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MESSAGES tab ──────────────────────────────────────────────────────────────
function MessagesTab({
  peers, unreadCounts, allUsers, onOpen, s,
}: {
  peers: { chat_id: string; peer: { user_id: string; handle: string; display_name: string | null; avatar_url: string | null }; last_message: string | null }[];
  unreadCounts: Record<string, number>;
  allUsers: SocialUser[];
  onOpen: (chatId: string) => void;
  s: Settings;
}) {
  const [search, setSearch] = useState("");
  const pad = s.density === "compact" ? "7px 12px" : "9px 14px";
  const filtered = peers.filter(p => !search || (p.peer.handle + (p.peer.display_name||"")).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="search conversations..."
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "5px 10px", fontFamily: MONO, fontSize: 8.5, letterSpacing: 1, color: "rgba(255,255,255,0.65)", outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {peers.length === 0 && <Atm line1="NO CONVERSATIONS YET" line2="START A CHAT FROM PEOPLE" />}
        {peers.length > 0 && filtered.length === 0 && <Atm line1="NO RESULTS" />}
        {filtered.map(({ chat_id, peer, last_message }) => {
          const unread = unreadCounts[chat_id] ?? 0;
          const pu     = allUsers.find(u => u.user_id === peer.user_id);
          const p      = getPresence(pu?.last_active ?? null);
          const dc     = DOT_COLOR[p];
          return (
            <div key={chat_id} onClick={() => onOpen(chat_id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: pad, borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer", transition: "background 0.08s" }}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.03)")}
              onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", background: peer.avatar_url ? undefined : "rgba(255,255,255,0.04)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {peer.avatar_url ? <img src={peer.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{(peer.display_name || peer.handle).slice(0,2).toUpperCase()}</span>}
                </div>
                {dc !== "transparent" && <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: dc, border: "1.5px solid rgba(7,7,9,0.95)" }} />}
              </div>
              <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                  <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: unread > 0 ? 600 : 500, color: unread > 0 ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{peer.display_name || peer.handle}</span>
                  {unread > 0 && <UnreadBadge n={unread} />}
                </div>
                {last_message
                  ? <div style={{ fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.22)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>{last_message}</div>
                  : <div style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.1)", letterSpacing: 1, marginTop: 2, textTransform: "uppercase" }}>no messages yet</div>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ACTIVITY tab ──────────────────────────────────────────────────────────────
function ActivityTab({ items, onSelect, s }: { items: ActivityItem[]; onSelect: (u: SocialUser) => void; s: Settings }) {
  const pad = s.density === "compact" ? "6px 12px" : "8px 14px";
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {items.length === 0 && <Atm line1="YOUR NETWORK IS QUIET" line2="ACTIVITY WILL APPEAR AS PEOPLE JOIN" />}
      {items.map(item => {
        const icon  = item.type === "followed_you" ? "→" : item.type === "message" ? "✉" : "◉";
        const color = item.type === "followed_you" ? "rgba(212,240,196,0.65)" : item.type === "message" ? "rgba(255,255,255,0.4)" : DOT_COLOR[getPresence(item.user.last_active)];
        return (
          <div key={item.id} onClick={() => onSelect(item.user)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: pad, borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer", transition: "background 0.08s" }}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.025)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
          >
            <span style={{ fontFamily: MONO, fontSize: 10, color, width: 14, textAlign: "center", flexShrink: 0 }}>{icon}</span>
            <Avatar u={item.user} size={28} />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.78)" }}>{item.user.display_name || item.user.handle}</span>
              <span style={{ fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.3)" }}> {item.label}</span>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.14)", flexShrink: 0 }}>{ago(item.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ago(ts: string): string {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60_000)       return "now";
  if (d < 3_600_000)    return `${Math.floor(d/60_000)}m`;
  if (d < 86_400_000)   return `${Math.floor(d/3_600_000)}h`;
  return `${Math.floor(d/86_400_000)}d`;
}

// ── RIGHT PREVIEW ─────────────────────────────────────────────────────────────
function RightPanel({ user, followingIds, onFollow, onMsg, onVisit, messaging, s }: {
  user: SocialUser | null;
  followingIds: Set<string>;
  onFollow: (id: string) => void;
  onMsg: (id: string) => void;
  onVisit: (h: string) => void;
  messaging: boolean;
  s: Settings;
}) {
  if (!user) {
    return (
      <Panel s={s} style={{ width: 220, flexShrink: 0 }}>
        <PanelHdr label="PREVIEW" />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Atm line1="SELECT A PERSON" line2="TO SEE THEIR PROFILE" />
        </div>
      </Panel>
    );
  }
  const p  = getPresence(user.last_active);
  const dc = DOT_COLOR[p];
  const tc = LABEL_COLOR[p];
  const isFollowing = followingIds.has(user.user_id);

  return (
    <Panel s={s} style={{ width: 220, flexShrink: 0 }}>
      <PanelHdr label="PROFILE" />
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 58, height: 58, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.09)", background: user.avatar_url ? undefined : "rgba(255,255,255,0.04)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontFamily: MONO, fontSize: 17, color: "rgba(255,255,255,0.2)" }}>{(user.display_name || user.handle).slice(0,2).toUpperCase()}</span>}
            </div>
            {dc !== "transparent" && <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: dc, border: "2px solid rgba(7,7,9,0.95)" }} />}
          </div>
          <div>
            <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.9)", lineHeight: 1.3 }}>{user.display_name || user.handle}</div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: 1, marginTop: 3, textTransform: "uppercase" }}>@{user.handle}</div>
          </div>
          {p !== "OFFLINE" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: dc, flexShrink: 0 }} />
              <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: tc, textTransform: "uppercase" }}>{p}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <BigBtn label={isFollowing ? "FOLLOWING ✓" : "FOLLOW"} onClick={() => onFollow(user.user_id)} accent={isFollowing} />
          <BigBtn label="OPEN CHAT" onClick={() => onMsg(user.user_id)} disabled={messaging} />
          <BigBtn label="VIEW SPACE" onClick={() => onVisit(user.handle)} />
        </div>
      </div>
    </Panel>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsDrawer({ s, onChange }: { s: Settings; onChange: (ns: Settings) => void }) {
  function upd(patch: Partial<Settings>) { const ns = { ...s, ...patch }; onChange(ns); saveSettings(ns); }
  return (
    <div style={{ padding: "10px 16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
      <SRow label="OPACITY" value={`${Math.round(s.opacity * 100)}%`}>
        <input type="range" min={50} max={100} value={Math.round(s.opacity * 100)} onChange={e => upd({ opacity: Number(e.target.value)/100 })} style={{ width: "100%", accentColor: "rgba(212,240,196,0.7)" }} />
      </SRow>
      <SRow label="BLUR" value={`${s.blur}px`}>
        <input type="range" min={4} max={48} value={s.blur} onChange={e => upd({ blur: Number(e.target.value) })} style={{ width: "100%", accentColor: "rgba(212,240,196,0.7)" }} />
      </SRow>
      <SRow label="DENSITY" value={s.density.toUpperCase()}>
        <div style={{ display: "flex", gap: 5 }}>
          {(["compact","cozy"] as const).map(d => (
            <button key={d} onClick={() => upd({ density: d })} style={{ padding: "3px 9px", borderRadius: 3, border: `1px solid ${s.density === d ? "rgba(212,240,196,0.3)" : "rgba(255,255,255,0.07)"}`, background: s.density === d ? "rgba(212,240,196,0.05)" : "transparent", color: s.density === d ? "rgba(212,240,196,0.7)" : "rgba(255,255,255,0.3)", fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer" }}>{d}</button>
          ))}
        </div>
      </SRow>
    </div>
  );
}

function SRow({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1.5, color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(212,240,196,0.4)" }}>{value}</span>
      </div>
      {children}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
interface Props { currentUserId?: string; openWindow: (chatId: string) => Promise<void>; totalUnread: number }

export default function SocialView({ currentUserId, openWindow, totalUnread }: Props) {
  const router  = useRouter();
  const [tab,          setTab]          = useState<Tab>("people");
  const [s,            setS]            = useState<Settings>(DEFAULTS);
  const [showSettings, setShowSettings] = useState(false);
  const [allUsers,     setAllUsers]     = useState<SocialUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followedUsers,setFollowedUsers]= useState<SocialUser[]>([]);
  const [activity,     setActivity]     = useState<ActivityItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<SocialUser | null>(null);
  const [messaging,    setMessaging]    = useState(false);
  const loadedRef = useRef(false);

  const { chats }                  = useChats(currentUserId);
  const { unreadCounts, markRead } = useUnreadCounts(chats, currentUserId);

  useEffect(() => { setS(loadSettings()); }, []);

  useEffect(() => {
    if (!currentUserId) return;
    async function load() {
      const sb = createClient();

      // Exact BrowseView query — no joins, no presence, no ordering that could fail
      const { data: profiles, error } = await sb
        .from("profiles")
        .select("user_id, handle, display_name, avatar_url")
        .limit(50);

      // eslint-disable-next-line no-console
      console.log("SOCIAL PROFILES", profiles);
      // eslint-disable-next-line no-console
      console.log("SOCIAL COUNT", profiles?.length ?? 0, error?.message ?? "ok");

      const users: SocialUser[] = (profiles ?? [])
        .filter(p => p.user_id !== currentUserId)
        .map(p => ({
          user_id:      p.user_id,
          handle:       p.handle,
          display_name: p.display_name,
          avatar_url:   p.avatar_url,
          last_active:  null, // not queried — presence not required for discovery
        }));
      setAllUsers(users);

      // Who current user follows — table is "followers"
      const { data: followsData } = await sb
        .from("followers")
        .select("following_id")
        .eq("follower_id", currentUserId);
      // eslint-disable-next-line no-console
      console.log("FOLLOW LOAD", followsData);
      const fIds = new Set<string>((followsData ?? []).map(f => f.following_id as string));
      setFollowingIds(fIds);
      // FOLLOWING = already-loaded users filtered by followingIds (no separate fetch)
      setFollowedUsers(users.filter(u => fIds.has(u.user_id)));

      // Activity: real follows received only (no fabricated data)
      const { data: newFollowers } = await sb
        .from("followers")
        .select("follower_id, created_at")
        .eq("following_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(20);
      const items: ActivityItem[] = (newFollowers ?? []).flatMap(f => {
        const u = users.find(u => u.user_id === f.follower_id);
        if (!u) return [];
        return [{ id: `fol_${f.follower_id}`, type: "followed_you" as const, user: u, timestamp: f.created_at as string, label: "followed you" }];
      });
      setActivity(items);
    }
    load();
  }, [currentUserId]);

  const handleMessage = useCallback(async (targetUserId: string) => {
    if (!currentUserId) return;
    setMessaging(true);
    try {
      const chatId = await openOrCreateChat(currentUserId, targetUserId);
      if (chatId) {
        console.log("OPEN CHAT CLICK", chatId);
        markRead(chatId);
        await openWindow(chatId);
      }
    } finally { setMessaging(false); }
  }, [currentUserId, openWindow, markRead]);

  const handleChatOpen = useCallback(async (chatId: string) => {
    console.log("OPEN CHAT CLICK", chatId);
    markRead(chatId);
    await openWindow(chatId);
  }, [openWindow, markRead]);

  const handleFollow = useCallback(async (targetId: string) => {
    if (!currentUserId) return;
    const sb = createClient();
    const isFollowing = followingIds.has(targetId);
    if (isFollowing) {
      // Optimistic update first
      setFollowingIds(prev => { const ns = new Set(prev); ns.delete(targetId); return ns; });
      setFollowedUsers(prev => prev.filter(u => u.user_id !== targetId));
      const { error } = await sb.from("followers").delete().eq("follower_id", currentUserId).eq("following_id", targetId);
      // eslint-disable-next-line no-console
      console.log("FOLLOW DELETE", error);
      if (error) {
        // Revert on failure
        setFollowingIds(prev => new Set([...prev, targetId]));
        const user = allUsers.find(u => u.user_id === targetId);
        if (user) setFollowedUsers(prev => [...prev, user]);
      }
    } else {
      // Optimistic update first
      setFollowingIds(prev => new Set([...prev, targetId]));
      const user = allUsers.find(u => u.user_id === targetId);
      if (user) setFollowedUsers(prev => [...prev, user]);
      const { error } = await sb.from("followers").insert({ follower_id: currentUserId, following_id: targetId });
      // eslint-disable-next-line no-console
      console.log("FOLLOW INSERT", error);
      if (error) {
        // Revert on failure
        setFollowingIds(prev => { const ns = new Set(prev); ns.delete(targetId); return ns; });
        setFollowedUsers(prev => prev.filter(u => u.user_id !== targetId));
      }
    }
  }, [currentUserId, followingIds, allUsers]);

  const peers = chats.map(c => ({
    chat_id:      c.chat_id,
    peer:         c.participants.find(p => p.user_id !== currentUserId)!,
    last_message: c.last_message?.content ?? null,
  })).filter(c => !!c.peer);

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "people",    label: "PEOPLE" },
    { key: "following", label: "FOLLOWING", badge: followedUsers.length > 0 ? followedUsers.length : undefined },
    { key: "messages",  label: "MESSAGES",  badge: totalUnread > 0 ? totalUnread : undefined },
    { key: "activity",  label: "ACTIVITY" },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.52)", zIndex: 0, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 14px", background: "rgba(7,7,9,0.75)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", gap: 2 }}>
          <div style={{ display: "flex", flex: 1, gap: 1, padding: "6px 0" }}>
            {TABS.map(t => {
              const isActive = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 4, border: isActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent", background: isActive ? "rgba(255,255,255,0.1)" : "transparent", color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)", fontFamily: MONO, fontSize: 7.5, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", transition: "all 0.1s", userSelect: "none" }}>
                  {t.label}
                  {t.badge !== undefined && t.badge > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)", color: "#07070a", fontFamily: MONO, fontSize: 6.5, fontWeight: 700, borderRadius: 2, padding: "1px 3px", minWidth: 12, lineHeight: 1.2 }}>{t.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
          <button onClick={() => setShowSettings(x => !x)}
            style={{ padding: "4px 8px", border: showSettings ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent", borderRadius: 4, background: showSettings ? "rgba(255,255,255,0.07)" : "transparent", color: showSettings ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)", fontFamily: MONO, fontSize: 9, cursor: "pointer", transition: "all 0.1s" }}>
            ⚙
          </button>
        </div>

        {/* Settings drawer */}
        {showSettings && (
          <div style={{ background: `rgba(7,7,9,${s.opacity})`, borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: `blur(${s.blur}px)`, WebkitBackdropFilter: `blur(${s.blur}px)`, flexShrink: 0 }}>
            <PanelHdr label="SOCIAL SETTINGS" />
            <SettingsDrawer s={s} onChange={setS} />
          </div>
        )}

        {/* Main */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 10, padding: 10 }}>
          <Panel s={s} style={{ flex: 1, overflow: "hidden" }}>
            {tab === "people" && (
              <PeopleTab users={allUsers} followingIds={followingIds} onSelect={setSelectedUser} selected={selectedUser} onMsg={handleMessage} onVisit={h => router.push(`/${h}`)} onFollow={handleFollow} s={s} messaging={messaging} />
            )}
            {tab === "following" && (
              <FollowingTab followedUsers={followedUsers} onSelect={setSelectedUser} selected={selectedUser} onMsg={handleMessage} onVisit={h => router.push(`/${h}`)} onSwitchToPeople={() => setTab("people")} s={s} messaging={messaging} />
            )}
            {tab === "messages" && (
              <MessagesTab peers={peers} unreadCounts={unreadCounts} allUsers={allUsers} onOpen={handleChatOpen} s={s} />
            )}
            {tab === "activity" && (
              <ActivityFeed items={activity.map(a => ({
                id:            a.id,
                user_id:       a.user.user_id,
                activity_type: a.type as "followed_you",
                metadata:      {},
                created_at:    a.timestamp,
                handle:        a.user.handle,
                display_name:  a.user.display_name,
                avatar_url:    a.user.avatar_url,
              }))} loading={false} density={s.density} />
            )}
          </Panel>

          <RightPanel user={selectedUser} followingIds={followingIds} onFollow={handleFollow} onMsg={handleMessage} onVisit={h => router.push(`/${h}`)} messaging={messaging} s={s} />
        </div>
      </div>
    </div>
  );
}
