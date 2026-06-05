"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  CanvasState, CanvasCard, CanvasImage, CanvasText,
  CanvasGallery, ProfileCardData, CanvasMedia, GuestbookCardData,
  SocialCardData, MusicCardData, LinksCardData,
} from "@/types";
import { bgImageStyle } from "@/lib/bgStyle";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const FONT_MAP: Record<string, string> = {
  "DM Sans":          "'DM Sans', sans-serif",
  "Space Mono":       "'Space Mono', monospace",
  "Impact":           "Impact, sans-serif",
  "Playfair Display": "'Playfair Display', serif",
  "Bebas Neue":       "'Bebas Neue', sans-serif",
  "Syne":             "'Syne', sans-serif",
};

interface BrowseProfile {
  handle: string;
  display_name: string | null;
  canvas: CanvasState | null;
}

function parseCanvas(raw: unknown): CanvasState | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  return {
    cards:        Array.isArray(d.cards)        ? d.cards        as CanvasCard[]      : [],
    images:       Array.isArray(d.images)       ? d.images       as CanvasImage[]     : [],
    texts:        Array.isArray(d.texts)        ? d.texts        as CanvasText[]      : [],
    galleries:    Array.isArray(d.galleries)    ? d.galleries    as CanvasGallery[]   : [],
    profiles:     Array.isArray(d.profiles)     ? d.profiles     as ProfileCardData[] : [],
    medias:      Array.isArray(d.medias)      ? d.medias      as CanvasMedia[]       : [],
    guestbooks:  Array.isArray(d.guestbooks)  ? d.guestbooks  as GuestbookCardData[] : [],
    socialCards: Array.isArray(d.socialCards) ? d.socialCards as SocialCardData[]    : [],
    musicCards:  Array.isArray(d.musicCards)  ? d.musicCards  as MusicCardData[]     : [],
    linksCards:  Array.isArray(d.linksCards)  ? d.linksCards  as LinksCardData[]     : [],
    bgColor:   typeof d.bgColor   === "string" ? d.bgColor   : "#0a0a0c",
    wallpaper: typeof d.wallpaper === "string" ? d.wallpaper : "",
  };
}

// ─── Lightweight static canvas renderer ───────────────────────────────────────

interface PreviewProps {
  canvas: CanvasState | null;
  hov: boolean;
  mouseX: number;
  mouseY: number;
}

function CanvasPreview({ canvas, hov, mouseX, mouseY }: PreviewProps) {
  const bg = canvas?.bgColor || "#0a0a0c";

  if (!canvas) return <div style={{ position: "absolute", inset: 0, background: bg }} />;

  // Bounding box of all visible elements
  type Box = { x: number; y: number; w: number; h: number };
  const boxes: Box[] = [
    ...canvas.images.map(e => ({ x: e.x, y: e.y, w: e.w, h: e.h })),
    ...canvas.cards.map(e => ({ x: e.x, y: e.y, w: e.w, h: e.h })),
    ...canvas.profiles.map(e => ({ x: e.x, y: e.y, w: e.w, h: e.h })),
    ...canvas.galleries.map(e => ({ x: e.x, y: e.y, w: e.w, h: e.h })),
    ...canvas.texts.map(e => ({
      x: e.x, y: e.y,
      w: Math.max(e.size * (e.content?.length ?? 4) * 0.55, 80),
      h: e.size * 1.4,
    })),
  ];

  const PW = 280, PH = 180, PAD = 80;
  let tx = 0, ty = 0, scale = 0.12;

  if (boxes.length > 0) {
    const x0 = Math.min(...boxes.map(b => b.x)) - PAD;
    const y0 = Math.min(...boxes.map(b => b.y)) - PAD;
    const x1 = Math.max(...boxes.map(b => b.x + b.w)) + PAD;
    const y1 = Math.max(...boxes.map(b => b.y + b.h)) + PAD;
    scale = Math.min(PW / (x1 - x0), PH / (y1 - y0));
    tx = (PW - (x1 - x0) * scale) / 2 - x0 * scale;
    ty = (PH - (y1 - y0) * scale) / 2 - y0 * scale;
  }

  // Parallax offset from cursor position (normalised 0–1)
  const px = hov ? (mouseX - 0.5) * -14 : 0;
  const py = hov ? (mouseY - 0.5) * -9  : 0;

  // Subtle zoom on hover
  const zoom = hov ? 1.08 : 1;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>

      {/* Wallpaper — matches real canvas: repeat, auto, no cover */}
      {canvas.wallpaper && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${canvas.wallpaper})`,
          backgroundRepeat: "repeat",
          backgroundSize: "auto",
          backgroundPosition: "top left",
          opacity: 0.55,
          transform: hov ? "scale(1.1)" : "scale(1)",
          transition: "transform 0.5s ease",
          pointerEvents: "none",
        }} />
      )}

      {/* Scaled canvas content */}
      <div style={{
        position: "absolute",
        left: 0, top: 0,
        transformOrigin: "0 0",
        transform: `translate(${tx + px}px,${ty + py}px) scale(${scale * zoom})`,
        transition: hov ? "transform 0.06s linear" : "transform 0.35s ease",
        willChange: "transform",
        filter: hov ? "brightness(1.12)" : "brightness(1)",
      }}>

        {/* Cards (coloured blocks) */}
        {canvas.cards.filter(c => c.bgColor || c.bgImage).slice(0, 5).map(c => (
          <div key={c.id} style={{
            position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h,
            borderRadius: c.borderRadius,
            ...(c.bgImage ? bgImageStyle(c.bgImage, c.bgMode) : { background: c.bgColor }),
            opacity: c.opacity,
            transform: `rotate(${c.rotation}deg)`,
          }} />
        ))}

        {/* Galleries – first image tile */}
        {canvas.galleries.slice(0, 3).map(g => (
          <div key={g.id} style={{
            position: "absolute", left: g.x, top: g.y, width: g.w, height: g.h,
            borderRadius: g.borderRadius, overflow: "hidden",
            opacity: g.opacity,
            transform: `rotate(${g.rotation}deg)`,
          }}>
            {g.images[0] && (
              <img src={g.images[0].src} draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
        ))}

        {/* Images */}
        {canvas.images.slice(0, 5).map(img => (
          <img key={img.id} src={img.src} draggable={false} style={{
            position: "absolute", left: img.x, top: img.y,
            width: img.w, height: img.h,
            objectFit: "contain",
            borderRadius: img.isTransparent ? 0 : 8,
            transform: `rotate(${img.rotation ?? 0}deg)`,
          }} />
        ))}

        {/* Profile cards */}
        {canvas.profiles.slice(0, 2).map(prof => (
          <div key={prof.id} style={{
            position: "absolute", left: prof.x, top: prof.y,
            width: prof.w, height: prof.h,
            borderRadius: prof.borderRadius,
            ...(prof.bgImage
              ? bgImageStyle(prof.bgImage, prof.bgMode)
              : { background: prof.bgColor || "rgba(255,255,255,0.05)" }),
            opacity: prof.opacity,
            overflow: "hidden",
            transform: `rotate(${prof.rotation}deg)`,
          }}>
            {prof.photo && (
              <img src={prof.photo} draggable={false} style={{
                position: "absolute",
                left: prof.photoX ?? 0, top: prof.photoY ?? 0,
                width: 100, height: 100,
                borderRadius: "50%", objectFit: "cover",
                transform: `scale(${prof.photoScale ?? 1})`,
                transformOrigin: "top left",
              }} />
            )}
          </div>
        ))}

        {/* Texts */}
        {canvas.texts.slice(0, 4).map(txt => (
          <div key={txt.id} style={{
            position: "absolute", left: txt.x, top: txt.y,
            fontFamily: FONT_MAP[txt.font] ?? SANS,
            fontSize: txt.size,
            color: txt.color,
            opacity: txt.opacity,
            letterSpacing: txt.letterSpacing,
            textTransform: txt.uppercase ? "uppercase" : "none",
            transform: `rotate(${txt.rotation}deg)`,
            whiteSpace: "pre",
            lineHeight: 1.15,
            pointerEvents: "none",
            userSelect: "none",
          }}>
            {txt.content}
          </div>
        ))}

      </div>
    </div>
  );
}

// ─── Browse card ──────────────────────────────────────────────────────────────

function BrowseCard({ profile }: { profile: BrowseProfile }) {
  const router = useRouter();
  const [hov, setHov]   = useState(false);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  }, []);

  return (
    <div
      onClick={() => router.push(`/${profile.handle}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setMouse({ x: 0.5, y: 0.5 }); }}
      onMouseMove={onMouseMove}
      style={{
        position: "relative",
        height: 180,
        borderRadius: 14,
        overflow: "hidden",
        background: "#0a0a0c",
        border: `1px solid ${hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
        cursor: "pointer",
        transform: hov ? "scale(1.04)" : "scale(1)",
        boxShadow: hov ? "0 10px 40px rgba(0,0,0,0.65)" : "0 2px 12px rgba(0,0,0,0.35)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
      }}
    >
      <CanvasPreview canvas={profile.canvas} hov={hov} mouseX={mouse.x} mouseY={mouse.y} />

      {/* Bottom gradient overlay */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "36px 14px 14px",
        background: hov
          ? "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)"
          : "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)",
        transition: "background 0.22s ease",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}>
        <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.95)", lineHeight: 1.2 }}>
          {profile.display_name || profile.handle}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.5px" }}>
          @{profile.handle}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrowsePage() {
  const [profiles, setProfiles] = useState<BrowseProfile[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const sb = createClient();

      const { data: profs } = await sb
        .from("profiles")
        .select("handle, display_name, user_id")
        .limit(30);

      if (!profs?.length) { setLoading(false); return; }

      const userIds = profs.map(p => p.user_id);

      const { data: canvases } = await sb
        .from("canvases")
        .select("user_id, data")
        .in("user_id", userIds);

      const canvasMap = new Map((canvases ?? []).map(c => [c.user_id, parseCanvas(c.data)]));

      setProfiles(profs.map(p => ({
        handle:       p.handle,
        display_name: p.display_name,
        canvas:       canvasMap.get(p.user_id) ?? null,
      })));
      setLoading(false);
    }
    load();
  }, []);

  const center: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    height: "60vh",
    fontFamily: MONO, fontSize: 11,
    color: "rgba(255,255,255,0.18)", letterSpacing: "1px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0c", padding: 48, paddingTop: 80 }}>
      {loading ? (
        <div style={center}>loading...</div>
      ) : profiles.length === 0 ? (
        <div style={center}>nothing here yet</div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 28,
        }}>
          {profiles.map(p => <BrowseCard key={p.handle} profile={p} />)}
        </div>
      )}
    </div>
  );
}
