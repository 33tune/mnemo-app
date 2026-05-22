"use client";
import { useRouter } from "next/navigation";
import type { PinItem } from "@/hooks/useElementPins";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

function ago(ts: string): string {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60_000)     return "now";
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

interface Props {
  pins:     PinItem[];
  loading:  boolean;
  onUnpin?: (pin: PinItem) => void;
}

export default function PinsGrid({ pins, loading, onUnpin }: Props) {
  const router = useRouter();

  if (loading) {
    return (
      <div style={{ padding: "32px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2.5, color: "rgba(255,255,255,0.1)", textTransform: "uppercase" }}>LOADING…</span>
      </div>
    );
  }

  if (!pins.length) {
    return (
      <div style={{ padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.07)" }}>── ──</div>
        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 2, color: "rgba(255,255,255,0.15)", textTransform: "uppercase" }}>NO PINS YET</div>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.08)", textTransform: "uppercase" }}>PIN IMAGES AND TEXTS FROM PEOPLE'S SPACES</div>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 3, color: "rgba(255,255,255,0.07)" }}>── ──</div>
      </div>
    );
  }

  // Split into two columns (masonry)
  const col0: PinItem[] = [];
  const col1: PinItem[] = [];
  pins.forEach((p, i) => (i % 2 === 0 ? col0 : col1).push(p));

  return (
    <div style={{ overflowY: "auto", flex: 1, padding: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        {[col0, col1].map((col, ci) => (
          <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {col.map(pin => (
              <PinCard key={pin.id} pin={pin} onUnpin={onUnpin} onVisit={h => router.push(`/${h}`)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PinCard({ pin, onUnpin, onVisit }: { pin: PinItem; onUnpin?: (p: PinItem) => void; onVisit: (h: string) => void }) {
  const isImage = pin.element_type === "image";
  const src   = isImage ? (pin.content.src as string | undefined) : undefined;
  const text  = !isImage ? (pin.content.content as string | undefined) : undefined;
  const font  = !isImage ? (pin.content.font as string | undefined) : undefined;
  const color = !isImage ? (pin.content.color as string | undefined) : undefined;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 7,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.1s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
    >
      {/* Preview */}
      {isImage && src && !src.startsWith("blob:") && (
        <div onClick={() => pin.owner_handle && onVisit(pin.owner_handle)} style={{ width: "100%", maxHeight: 180, overflow: "hidden" }}>
          <img src={src} alt="" style={{ width: "100%", display: "block", objectFit: "cover" }}
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
        </div>
      )}
      {!isImage && text && (
        <div
          onClick={() => pin.owner_handle && onVisit(pin.owner_handle)}
          style={{
            padding: "12px 12px 6px",
            fontFamily: font ? `'${font}', sans-serif` : SANS,
            fontSize: 12,
            color: color || "rgba(255,255,255,0.7)",
            lineHeight: 1.5,
            wordBreak: "break-word",
            maxHeight: 120,
            overflow: "hidden",
          }}
        >
          {text.slice(0, 140)}{text.length > 140 ? "…" : ""}
        </div>
      )}
      {isImage && (!src || src.startsWith("blob:")) && (
        <div style={{ height: 60, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.1)" }}>◈</span>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          onClick={() => pin.owner_handle && onVisit(pin.owner_handle)}
          style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 0.5, color: "rgba(255,255,255,0.25)", cursor: "pointer" }}
        >
          {pin.owner_handle ? `@${pin.owner_handle}` : "—"} · {ago(pin.created_at)}
        </span>
        {onUnpin && (
          <button
            onClick={e => { e.stopPropagation(); onUnpin(pin); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.2)", padding: "0 2px", lineHeight: 1 }}
            title="Unpin"
          >✕</button>
        )}
      </div>
    </div>
  );
}
