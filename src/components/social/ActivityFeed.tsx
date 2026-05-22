"use client";
import { useState } from "react";
import type { ActivityFeedItem } from "@/hooks/useActivityFeed";
import { useRouter } from "next/navigation";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

const ACTIVITY_LABEL: Record<string, string> = {
  new_image:     "added an image to their space",
  new_text:      "added text to their space",
  canvas_update: "updated their space",
  status_change: "updated their profile",
  followed_you:  "followed you",
};

const ACTIVITY_ICON: Record<string, string> = {
  new_image:     "◈",
  new_text:      "❝",
  canvas_update: "◉",
  status_change: "◎",
  followed_you:  "→",
};

function ago(ts: string): string {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60_000)     return "now";
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

interface Props {
  items:   ActivityFeedItem[];
  loading: boolean;
  density?: "compact" | "cozy";
}

export default function ActivityFeed({ items, loading, density = "cozy" }: Props) {
  const router = useRouter();
  const pad = density === "compact" ? "6px 12px" : "9px 14px";

  if (loading) {
    return (
      <div style={{ padding: "32px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2.5, color: "rgba(255,255,255,0.1)", textTransform: "uppercase" }}>LOADING FEED…</span>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div style={{ padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.07)" }}>── ──</div>
        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 2, color: "rgba(255,255,255,0.15)", textTransform: "uppercase" }}>NOTHING YET</div>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.08)", textTransform: "uppercase" }}>FOLLOW PEOPLE TO SEE THEIR ACTIVITY</div>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.07)" }}>── ──</div>
      </div>
    );
  }

  // Separate content items (images/texts with previews) from activity events
  const contentItems = items.filter(i => i.activity_type === "new_image" || i.activity_type === "new_text");
  const eventItems   = items.filter(i => i.activity_type !== "new_image" && i.activity_type !== "new_text");

  const hasContent = contentItems.length > 0;
  const hasEvents  = eventItems.length > 0;

  // Masonry columns for content
  const col0 = contentItems.filter((_, i) => i % 2 === 0);
  const col1 = contentItems.filter((_, i) => i % 2 !== 0);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>

      {/* Content grid (new_image / new_text) */}
      {hasContent && (
        <div style={{ padding: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.12)", textTransform: "uppercase", marginBottom: 8 }}>NEW FROM PEOPLE YOU FOLLOW</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            {[col0, col1].map((col, ci) => (
              <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {col.map(item => (
                  <ContentCard key={item.id} item={item} onClick={() => item.handle && router.push(`/${item.handle}`)} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity events */}
      {hasEvents && (
        <>
          {hasContent && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0" }} />}
          {eventItems.map(item => {
            const icon  = ACTIVITY_ICON[item.activity_type] ?? "·";
            const label = ACTIVITY_LABEL[item.activity_type] ?? item.activity_type;
            const iconColor =
              item.activity_type === "followed_you" ? "rgba(212,240,196,0.7)" : "rgba(255,255,255,0.22)";
            return (
              <div
                key={item.id}
                onClick={() => item.handle && router.push(`/${item.handle}`)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: pad, borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: item.handle ? "pointer" : "default", transition: "background 0.08s" }}
                onMouseEnter={e => { if (item.handle) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontFamily: MONO, fontSize: 10, color: iconColor, width: 14, textAlign: "center", flexShrink: 0 }}>{icon}</span>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.avatar_url
                    ? <img src={item.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    : <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{(item.display_name || item.handle || "?").slice(0, 2).toUpperCase()}</span>
                  }
                </div>
                <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
                  <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>{item.display_name || item.handle || "someone"}</span>
                  <span style={{ fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.3)" }}> {label}</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.14)", flexShrink: 0 }}>{ago(item.created_at)}</span>
              </div>
            );
          })}
        </>
      )}

      {!hasContent && !hasEvents && (
        <div style={{ padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.07)" }}>── ──</div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 2, color: "rgba(255,255,255,0.15)", textTransform: "uppercase" }}>NOTHING YET</div>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.08)", textTransform: "uppercase" }}>FOLLOW PEOPLE TO SEE THEIR ACTIVITY</div>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.07)" }}>── ──</div>
        </div>
      )}
    </div>
  );
}

function ContentCard({ item, onClick }: { item: ActivityFeedItem; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const isImage = item.activity_type === "new_image";
  const src     = isImage ? (item.metadata.src as string | undefined) : undefined;
  const text    = !isImage ? (item.metadata.content as string | undefined) : undefined;
  const color   = !isImage ? (item.metadata.color as string | undefined) : undefined;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 7,
        overflow: "hidden",
        border: `1px solid ${hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
        background: "rgba(255,255,255,0.03)",
        cursor: "pointer",
        transition: "border-color 0.1s",
      }}
    >
      {isImage && src && (
        <div style={{ width: "100%", maxHeight: 160, overflow: "hidden" }}>
          <img src={src} alt="" style={{ width: "100%", display: "block", objectFit: "cover" }}
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
        </div>
      )}
      {!isImage && text && (
        <div style={{ padding: "10px 10px 4px", fontFamily: SANS, fontSize: 11, color: color || "rgba(255,255,255,0.65)", lineHeight: 1.5, maxHeight: 100, overflow: "hidden", wordBreak: "break-word" }}>
          {text.slice(0, 120)}{text.length > 120 ? "…" : ""}
        </div>
      )}
      <div style={{ padding: "5px 9px", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {item.avatar_url
            ? <img src={item.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontFamily: MONO, fontSize: 5, color: "rgba(255,255,255,0.2)" }}>{(item.display_name || item.handle || "?").slice(0,1).toUpperCase()}</span>
          }
        </div>
        <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.25)", letterSpacing: 0.5 }}>@{item.handle || "—"}</span>
        <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.1)", marginLeft: "auto" }}>{ago(item.created_at)}</span>
      </div>
    </div>
  );
}
