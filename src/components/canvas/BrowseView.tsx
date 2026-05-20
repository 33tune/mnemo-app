"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PublicCanvas from "./PublicCanvas";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

const CANVAS_W  = 1200;
const CANVAS_H  = 800;
const PREVIEW_W = 300;
const PREVIEW_H = 200;
const SCALE     = Math.min(PREVIEW_W / CANVAS_W, PREVIEW_H / CANVAS_H);

interface ProfileRow {
  handle:         string;
  display_name:   string | null;
  user_id:        string;
  last_active_at: string | null;
}

type FilterTab = "all" | "following" | "favorites";

function FeedItem({ profile }: { profile: ProfileRow }) {
  const router = useRouter();
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={() => router.push(`/${profile.handle}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ cursor: "pointer" }}
    >
      <div style={{
        width:        PREVIEW_W,
        height:       PREVIEW_H,
        overflow:     "hidden",
        borderRadius: 6,
        border:       `1px solid ${hov ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)"}`,
        background:   "#0a0a0c",
        boxShadow:    hov
          ? "0 16px 48px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05)"
          : "0 4px 20px rgba(0,0,0,0.5)",
        transform:    hov ? "scale(1.025) translateY(-2px)" : "scale(1) translateY(0)",
        transition:   `transform 0.15s ${EASE}, box-shadow 0.15s ${EASE}, border-color 0.15s ${EASE}`,
        position:     "relative",
      }}>
        {/* Canvas preview */}
        <div style={{
          position:        "relative",
          width:           CANVAS_W,
          height:          CANVAS_H,
          transform:       `scale(${SCALE})`,
          transformOrigin: "top left",
          pointerEvents:   "none",
          filter:          hov ? "brightness(1.08)" : "brightness(0.95)",
          transition:      `filter 0.15s ${EASE}`,
        }}>
          <PublicCanvas userId={profile.user_id} readOnly />
        </div>

        {/* Overlay */}
        <div style={{
          position:       "absolute",
          inset:          0,
          background:     hov
            ? "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 45%, transparent 100%)"
            : "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.22) 50%, transparent 100%)",
          transition:     `background 0.15s ${EASE}`,
          display:        "flex",
          flexDirection:  "column",
          justifyContent: "flex-end",
          padding:        "12px 14px",
          gap:            3,
        }}>
          <div style={{
            fontFamily:    SANS,
            fontSize:      13,
            fontWeight:    500,
            color:         "rgba(255,255,255,0.92)",
            lineHeight:    1.2,
            letterSpacing: "0.1px",
          }}>
            {profile.display_name || profile.handle}
          </div>
          <div style={{
            fontFamily:    MONO,
            fontSize:      8,
            color:         "rgba(255,255,255,0.45)",
            letterSpacing: "1px",
          }}>
            @{profile.handle}
          </div>
        </div>

        {/* Presence dot — top-left */}
        {profile.last_active_at && (() => {
          const mins = (Date.now() - new Date(profile.last_active_at).getTime()) / 60_000;
          if (mins > 30) return null;
          const isActive = mins < 5;
          return (
            <div style={{
              position:   "absolute",
              top:        10,
              left:       10,
              display:    "flex",
              alignItems: "center",
              gap:        5,
              zIndex:     3,
            }}>
              <div style={{
                width:        6,
                height:       6,
                borderRadius: "50%",
                background:   isActive ? "rgba(100,220,120,0.95)" : "rgba(255,255,255,0.38)",
                boxShadow:    isActive ? "0 0 7px rgba(100,220,120,0.55)" : "none",
                flexShrink:   0,
              }} />
              {isActive && (
                <span style={{
                  fontFamily:    MONO,
                  fontSize:      6.5,
                  letterSpacing: 1.5,
                  color:         "rgba(100,220,120,0.75)",
                  textTransform: "uppercase",
                }}>
                  LIVE
                </span>
              )}
            </div>
          );
        })()}

        {/* Top-right hover indicator */}
        {hov && (
          <div style={{
            position:   "absolute",
            top:        10,
            right:      10,
            fontFamily: MONO,
            fontSize:   7,
            letterSpacing: 1.5,
            color:      "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
          }}>
            OPEN →
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrowseView({ currentUserId }: { currentUserId?: string }) {
  const [profiles,      setProfiles]      = useState<ProfileRow[]>([]);
  const [query,         setQuery]         = useState("");
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState<FilterTab>("all");
  const [followingIds,  setFollowingIds]  = useState<Set<string>>(new Set());
  const [favoriteIds,   setFavoriteIds]   = useState<Set<string>>(new Set());

  useEffect(() => {
    createClient().from("profiles").select("handle, display_name, user_id, last_active_at").limit(50)
      .then(({ data, error }) => {
        if (error) {
          // Column may not exist yet — fall back without presence data
          return createClient().from("profiles").select("handle, display_name, user_id").limit(50)
            .then(({ data: d2 }) => {
              setProfiles((d2 ?? []).map(p => ({ ...p, last_active_at: null })));
              setLoading(false);
            });
        }
        setProfiles(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!currentUserId) { setFollowingIds(new Set()); setFavoriteIds(new Set()); return; }
    const sb = createClient();
    Promise.all([
      sb.from("followers").select("following_id").eq("follower_id", currentUserId),
      sb.from("favorites").select("target_user_id").eq("user_id", currentUserId),
    ]).then(([foll, favs]) => {
      setFollowingIds(new Set((foll.data ?? []).map(r => r.following_id)));
      setFavoriteIds(new Set((favs.data  ?? []).map(r => r.target_user_id)));
    });
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId && activeTab !== "all") setActiveTab("all");
  }, [currentUserId, activeTab]);

  const base = profiles.filter(p => p.user_id !== currentUserId);
  const searched = base.filter(p =>
    p.handle?.toLowerCase().includes(query.toLowerCase()) ||
    p.display_name?.toLowerCase().includes(query.toLowerCase())
  );

  const visible =
    activeTab === "following" ? searched.filter(p => followingIds.has(p.user_id)) :
    activeTab === "favorites" ? searched.filter(p => favoriteIds.has(p.user_id)) :
    searched;

  const hasSocial = !!currentUserId;
  const topOffset = hasSocial ? 108 : 84;

  return (
    <>
      {/* ── Search + filter bar ── */}
      <div style={{
        position:      "fixed",
        top:           52,
        left:          "50%",
        transform:     "translateX(-50%)",
        zIndex:        20,
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           8,
      }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="SEARCH PROFILES"
          style={{
            width:         256,
            padding:       "9px 14px",
            borderRadius:  4,
            background:    "rgba(0,0,0,0.65)",
            border:        "1px solid rgba(255,255,255,0.1)",
            color:         "rgba(255,255,255,0.82)",
            outline:       "none",
            fontFamily:    MONO,
            fontSize:      9,
            letterSpacing: "1.5px",
            textAlign:     "center",
            transition:    "border-color 0.1s ease",
            backdropFilter:"blur(16px)",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; }}
          onBlur={e =>  { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";  }}
        />

        {hasSocial && (
          <div style={{
            display:      "flex",
            gap:          2,
            background:   "rgba(0,0,0,0.6)",
            border:       "1px solid rgba(255,255,255,0.08)",
            borderRadius: 5,
            padding:      "3px",
            backdropFilter:"blur(16px)",
          }}>
            {(["all", "following", "favorites"] as FilterTab[]).map(tab => {
              const isActive = activeTab === tab;
              const count =
                tab === "following" ? followingIds.size :
                tab === "favorites" ? favoriteIds.size  : 0;
              return (
                <FilterTabBtn
                  key={tab}
                  label={tab}
                  active={isActive}
                  count={count}
                  onClick={() => setActiveTab(tab)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Feed ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: topOffset, paddingBottom: 100 }}>
        {loading ? (
          <div style={{ marginTop: 80, fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase" }}>
            SCANNING...
          </div>
        ) : visible.length === 0 ? (
          <EmptyBrowse tab={activeTab} hasQuery={!!query} />
        ) : (
          <>
            <div style={{
              marginBottom: 28,
              fontFamily:   MONO,
              fontSize:     7,
              letterSpacing:"2px",
              color:        "rgba(255,255,255,0.18)",
              textTransform:"uppercase",
            }}>
              {visible.length} {visible.length === 1 ? "PROFILE" : "PROFILES"} INDEXED
            </div>
            <div style={{
              display:       "flex",
              flexDirection: "column",
              alignItems:    "center",
              gap:           44,
              paddingBottom: 100,
              width:         "100%",
            }}>
              {visible.map(p => <FeedItem key={p.user_id} profile={p} />)}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Filter tab button ──────────────────────────────────────────────────────────
function FilterTabBtn({
  label,
  active,
  count,
  onClick,
}: {
  label:   string;
  active:  boolean;
  count:   number;
  onClick: () => void;
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
        padding:       "4px 12px",
        borderRadius:  3,
        border:        active ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
        background:    active ? "rgba(255,255,255,0.1)" : hov ? "rgba(255,255,255,0.04)" : "transparent",
        color:         active ? "rgba(255,255,255,0.88)" : hov ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.32)",
        fontFamily:    MONO,
        fontSize:      7,
        letterSpacing: 2,
        textTransform: "uppercase",
        cursor:        "pointer",
        transition:    "all 0.1s ease",
        userSelect:    "none",
      }}
    >
      {label}
      {count > 0 && (
        <span style={{
          background:   active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.18)",
          color:        active ? "#07070a" : "rgba(255,255,255,0.55)",
          borderRadius: 2,
          padding:      "0 4px",
          fontSize:     7,
          fontWeight:   700,
          lineHeight:   "14px",
          letterSpacing:0,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyBrowse({ tab, hasQuery }: { tab: FilterTab; hasQuery: boolean }) {
  const lines: Record<FilterTab, [string, string]> = {
    all:       ["NO PROFILES FOUND",   hasQuery ? "try a different search" : "network is empty"],
    following: ["EMPTY NETWORK",       "find profiles in ALL"],
    favorites: ["NO FAVORITES",        "star profiles to save them"],
  };
  const [title, sub] = lines[tab];
  return (
    <div style={{ marginTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: 3, textTransform: "uppercase" }}>
        {title}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.12)", letterSpacing: 2, textTransform: "uppercase" }}>
        {sub}
      </div>
    </div>
  );
}
