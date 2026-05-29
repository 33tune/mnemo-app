"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

// ── Card layout ───────────────────────────────────────────────────────────────

type CardId = "total" | "today" | "unique" | "links" | "devices" | "activity";

type Rect = { x: number; y: number; w: number; h: number };

const DEFAULTS: Record<CardId, Rect> = {
  total:    { x: 40,  y: 72,  w: 220, h: 130 },
  today:    { x: 280, y: 72,  w: 180, h: 130 },
  unique:   { x: 480, y: 72,  w: 180, h: 130 },
  links:    { x: 40,  y: 228, w: 300, h: 270 },
  devices:  { x: 360, y: 228, w: 240, h: 160 },
  activity: { x: 620, y: 228, w: 220, h: 130 },
};

function loadLayout(userId: string): Record<CardId, Rect> {
  try {
    const raw = localStorage.getItem(`mnemo-analytics-layout-${userId}`);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

function saveLayout(userId: string, layout: Record<CardId, Rect>) {
  try { localStorage.setItem(`mnemo-analytics-layout-${userId}`, JSON.stringify(layout)); }
  catch { /* ignore */ }
}

// ── Time formatting ───────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60)   return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AnalyticsCanvas({
  userId,
  bgColor,
  wallpaper,
}: {
  userId?:   string;
  bgColor?:  string;
  wallpaper?: string;
}) {
  const { totalViews, viewsToday, uniqueVisitors, topLinks, mobilePct, desktopPct, recentActivity, loading, refresh } =
    useAnalytics(userId);

  const [layout, setLayout] = useState<Record<CardId, Rect>>(DEFAULTS);
  const [dragging, setDragging] = useState<CardId | null>(null);
  const [resizing, setResizing] = useState<CardId | null>(null);
  const layoutRef = useRef(layout);

  useEffect(() => {
    if (!userId) return;
    setLayout(loadLayout(userId));
  }, [userId]);

  useEffect(() => { layoutRef.current = layout; }, [layout]);

  const updateRect = useCallback((id: CardId, patch: Partial<Rect>) => {
    setLayout(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      if (userId) saveLayout(userId, next);
      return next;
    });
  }, [userId]);

  // ── Drag ──
  function startDrag(id: CardId, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(id);
    const { x: x0, y: y0 } = layoutRef.current[id];
    const mx0 = e.clientX, my0 = e.clientY;
    function onMove(ev: MouseEvent) {
      updateRect(id, {
        x: Math.max(0, x0 + ev.clientX - mx0),
        y: Math.max(44, y0 + ev.clientY - my0),
      });
    }
    function onUp() {
      setDragging(null);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  // ── Resize ──
  function startResize(id: CardId, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setResizing(id);
    const { w: w0, h: h0 } = layoutRef.current[id];
    const mx0 = e.clientX, my0 = e.clientY;
    function onMove(ev: MouseEvent) {
      updateRect(id, {
        w: Math.max(160, w0 + ev.clientX - mx0),
        h: Math.max(100, h0 + ev.clientY - my0),
      });
    }
    function onUp() {
      setResizing(null);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  const hasWallpaper = !!(wallpaper && !wallpaper.startsWith("blob:"));

  return (
    <div style={{
      position:   "fixed",
      inset:      0,
      top:        44,
      background: bgColor || "#0a0a0c",
      ...(hasWallpaper ? {
        backgroundImage:    `url(${wallpaper})`,
        backgroundRepeat:   "repeat",
        backgroundSize:     "auto",
        backgroundPosition: "top left",
      } : {}),
      overflow:   "auto",
      fontFamily: SANS,
    }}>
      {/* ── Header ── */}
      <div style={{
        display:       "flex",
        alignItems:    "center",
        justifyContent:"space-between",
        padding:       "20px 40px 0",
        userSelect:    "none",
      }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 3, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", marginBottom: 4 }}>
            ANALYTICS DASHBOARD
          </div>
          <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
            Tu perfil, en números.
          </div>
        </div>
        <button
          onClick={refresh}
          style={{
            background: "rgba(255,255,255,0.04)",
            border:     "1px solid rgba(255,255,255,0.09)",
            borderRadius: 4,
            padding:    "6px 14px",
            fontFamily: MONO,
            fontSize:   8,
            letterSpacing: 1.5,
            color:      loading ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.45)",
            textTransform: "uppercase",
            cursor:     loading ? "default" : "pointer",
            transition: `all 0.1s ${EASE}`,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.color = "rgba(255,255,255,0.72)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = loading ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.45)"; }}
        >
          {loading ? "loading..." : "↻ refresh"}
        </button>
      </div>

      {/* ── Hint ── */}
      <div style={{ padding: "8px 40px 0", fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.14)", textTransform: "uppercase" }}>
        drag · resize · personalizable
      </div>

      {/* ── Canvas area ── */}
      <div style={{ position: "relative", minHeight: "calc(100vh - 44px)", minWidth: 900 }}>

        <AnalCard id="total" rect={layout.total} dragging={dragging} resizing={resizing}
          onDrag={startDrag} onResize={startResize}>
          <StatCard
            label="Total Views"
            value={fmt(totalViews)}
            sub="all time"
            accent="rgba(212,240,196,0.9)"
            glow="rgba(212,240,196,0.06)"
          />
        </AnalCard>

        <AnalCard id="today" rect={layout.today} dragging={dragging} resizing={resizing}
          onDrag={startDrag} onResize={startResize}>
          <StatCard
            label="Views Today"
            value={fmt(viewsToday)}
            sub={viewsToday > 0 ? "en las últimas 24h" : "sin visitas hoy"}
            accent={viewsToday > 0 ? "rgba(140,200,255,0.9)" : "rgba(255,255,255,0.4)"}
            glow={viewsToday > 0 ? "rgba(140,200,255,0.05)" : "transparent"}
          />
        </AnalCard>

        <AnalCard id="unique" rect={layout.unique} dragging={dragging} resizing={resizing}
          onDrag={startDrag} onResize={startResize}>
          <StatCard
            label="Unique"
            value={fmt(uniqueVisitors)}
            sub="logged-in visitors"
            accent="rgba(255,200,140,0.9)"
            glow="rgba(255,200,140,0.04)"
          />
        </AnalCard>

        <AnalCard id="links" rect={layout.links} dragging={dragging} resizing={resizing}
          onDrag={startDrag} onResize={startResize}>
          <TopLinksCard links={topLinks} />
        </AnalCard>

        <AnalCard id="devices" rect={layout.devices} dragging={dragging} resizing={resizing}
          onDrag={startDrag} onResize={startResize}>
          <DevicesCard mobilePct={mobilePct} desktopPct={desktopPct} />
        </AnalCard>

        <AnalCard id="activity" rect={layout.activity} dragging={dragging} resizing={resizing}
          onDrag={startDrag} onResize={startResize}>
          <ActivityCard date={recentActivity} />
        </AnalCard>

      </div>
    </div>
  );
}

// ── Card wrapper (drag + resize) ───────────────────────────────────────────────

function AnalCard({
  id, rect, dragging, resizing, onDrag, onResize, children,
}: {
  id:       CardId;
  rect:     Rect;
  dragging: CardId | null;
  resizing: CardId | null;
  onDrag:   (id: CardId, e: React.MouseEvent) => void;
  onResize: (id: CardId, e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  const isActive = dragging === id || resizing === id;
  return (
    <div
      onMouseDown={e => onDrag(id, e)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:   "absolute",
        left:       rect.x,
        top:        rect.y,
        width:      rect.w,
        height:     rect.h,
        cursor:     isActive ? "grabbing" : "grab",
        userSelect: "none",
        zIndex:     isActive ? 10 : 1,
      }}
    >
      <div style={{
        position:             "absolute",
        inset:                0,
        borderRadius:         10,
        background:           "rgba(255,255,255,0.032)",
        backdropFilter:       "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border:               `1px solid ${isActive || hov ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)"}`,
        boxShadow:            isActive
          ? "0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)"
          : "0 4px 24px rgba(0,0,0,0.3)",
        overflow:   "hidden",
        transition: `border-color 0.12s ${EASE}, box-shadow 0.12s ${EASE}`,
      }}>
        {children}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={e => { e.stopPropagation(); onResize(id, e); }}
        style={{
          position:     "absolute",
          bottom:       -4,
          right:        -4,
          width:        10,
          height:       10,
          borderRadius: "50%",
          background:   hov || isActive ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)",
          cursor:       "nwse-resize",
          border:       "1.5px solid rgba(0,0,0,0.3)",
          transition:   `background 0.12s ${EASE}`,
          zIndex:       20,
        }}
      />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, glow }: {
  label:  string;
  value:  string;
  sub:    string;
  accent: string;
  glow:   string;
}) {
  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      justifyContent: "space-between",
      height:         "100%",
      padding:        "18px 20px 16px",
      background:     glow,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 2.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 44, fontWeight: 800, color: accent, lineHeight: 1, letterSpacing: "-1px" }}>
        {value}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" }}>
        {sub}
      </div>
    </div>
  );
}

// ── Top links card ────────────────────────────────────────────────────────────

function TopLinksCard({ links }: { links: import("@/hooks/useAnalytics").TopLink[] }) {
  const maxClicks = links[0]?.clicks ?? 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "18px 20px 16px" }}>
      <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 2.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 14 }}>
        Top Links
      </div>
      {links.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.15)", letterSpacing: 1, textTransform: "uppercase" }}>
          no clicks yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
          {links.map((link, i) => (
            <div key={link.url + i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.22)", flexShrink: 0 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {link.label || link.url}
                  </span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>
                  {link.clicks}
                </span>
              </div>
              <div style={{ height: 2, borderRadius: 1, background: "rgba(255,255,255,0.06)" }}>
                <div style={{
                  height:     "100%",
                  width:      `${Math.round((link.clicks / maxClicks) * 100)}%`,
                  borderRadius: 1,
                  background: "rgba(212,240,196,0.55)",
                  transition: `width 0.4s ${EASE}`,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Devices card ──────────────────────────────────────────────────────────────

function DevicesCard({ mobilePct, desktopPct }: { mobilePct: number; desktopPct: number }) {
  const hasData = mobilePct > 0 || desktopPct > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "18px 20px 16px" }}>
      <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 2.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 14 }}>
        Devices
      </div>
      {!hasData ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.15)", letterSpacing: 1, textTransform: "uppercase" }}>
          no data yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "center" }}>
          <DeviceRow label="mobile" pct={mobilePct} color="rgba(140,200,255,0.75)" />
          <DeviceRow label="desktop" pct={desktopPct} color="rgba(212,240,196,0.65)" />
        </div>
      )}
    </div>
  );
}

function DeviceRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1.5, color: "rgba(255,255,255,0.38)", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.55)" }}>{pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)" }}>
        <div style={{
          height:     "100%",
          width:      `${pct}%`,
          borderRadius: 2,
          background: color,
          transition: `width 0.5s ${EASE}`,
        }} />
      </div>
    </div>
  );
}

// ── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({ date }: { date: Date | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  void now;

  const isRecent = date ? (Date.now() - date.getTime()) < 5 * 60 * 1000 : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "18px 20px 16px" }}>
      <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 2.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 10 }}>
        Last Visit
      </div>
      {!date ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.15)", letterSpacing: 1, textTransform: "uppercase" }}>
          no visits yet
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
          {isRecent && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "rgba(212,240,196,0.9)",
                boxShadow:  "0 0 8px rgba(212,240,196,0.6)",
              }} />
              <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(212,240,196,0.7)", textTransform: "uppercase" }}>active now</span>
            </div>
          )}
          <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.82)", lineHeight: 1.2 }}>
            {timeAgo(date)}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>
            someone visited
          </div>
        </div>
      )}
    </div>
  );
}
