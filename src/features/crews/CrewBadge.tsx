"use client";
/**
 * The crew a member features, on their card (Crews, 2026-10-29): a chip with
 * the crew's emblem, name and the member's number, in the crew's own color
 * and font (it's the crew's uniform, the same on every member). On the public
 * card it links to the crew's house; in the editor the owner drags it (its
 * place is stored with the membership, crew_set_badge — never in the card's
 * data). A card whose owner features no crew renders nothing.
 */
import { useEffect, useRef, useState } from "react";
import { crewApi } from "./crewApi";
import { crewFontStyle, googleFontsHref } from "./crewLook";
import { inkOn, memberNumber, type CrewBadgeData } from "./crewTypes";

const cache = new Map<string, Promise<CrewBadgeData | null>>();
function badgeOf(userId: string): Promise<CrewBadgeData | null> {
  let p = cache.get(userId);
  if (!p) {
    p = crewApi.badgeOf(userId).catch(() => null);
    cache.set(userId, p);
  }
  return p;
}

export function CrewBadge({ userId, cardW, cardH, pad, draggable, interactive }: {
  userId?: string;
  cardW: number;
  cardH: number;
  pad: number;
  /** The owner's card, selected in the editor: drag to place it. */
  draggable: boolean;
  /** The public card: the chip is a link to the house. */
  interactive: boolean;
}) {
  const [badge, setBadge] = useState<CrewBadgeData | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLAnchorElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    badgeOf(userId).then(b => { if (live) { setBadge(b); setPos(b ? { x: b.x, y: b.y } : null); } });
    return () => { live = false; };
  }, [userId]);

  if (!badge || !pos) return null;

  const s = badge.size;
  const h = Math.round(26 * s);
  const fonts = googleFontsHref([badge.font]);
  // Anchored inside the card's padding box: x/y 0..1 put the chip's own
  // left/top..right/bottom edge on that line (like the logo's anchors).
  const left = `calc(${pad}px + (100% - ${2 * pad}px) * ${pos.x})`;
  const top = `calc(${pad}px + (100% - ${2 * pad}px) * ${pos.y})`;

  const startDrag = (e: React.MouseEvent) => {
    if (!draggable) return;
    e.stopPropagation();
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    dragging.current = true;
    const w = el.offsetWidth, hh = el.offsetHeight;
    const availW = Math.max(1, cardW - 2 * pad - w), availH = Math.max(1, cardH - 2 * pad - hh);
    const start = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y };
    // The card can be drawn scaled (fit to the screen): screen px → card px.
    const scale = el.getBoundingClientRect().width / (w || 1) || 1;
    let last = start;
    const move = (ev: MouseEvent) => {
      const x = Math.min(1, Math.max(0, start.x + (ev.clientX - start.mx) / scale / availW));
      const y = Math.min(1, Math.max(0, start.y + (ev.clientY - start.my) / scale / availH));
      last = { ...last, x, y };
      setPos({ x, y });
    };
    const up = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      cache.delete(userId!);
      void crewApi.setBadge(badge.crew_id, last.x, last.y, badge.size).catch(() => {});
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  const ink = inkOn(badge.color);
  return (
    <>
      {fonts && <link rel="stylesheet" href={fonts} precedence="default" />}
      <a
        ref={ref}
        href={interactive ? `/c/${badge.slug}` : undefined}
        data-canvas-hot=""
        data-crew-badge=""
        draggable={false}
        aria-label={interactive ? `Crew ${badge.name}, miembro ${memberNumber(badge.number)}` : undefined}
        onMouseDown={draggable ? startDrag : undefined}
        onClick={e => { if (!interactive) e.preventDefault(); }}
        style={{
          position: "absolute", left, top,
          transform: `translate(${-pos.x * 100}%, ${-pos.y * 100}%)`,
          zIndex: 4, display: "inline-flex", alignItems: "center", gap: Math.round(6 * s),
          height: h, maxWidth: `calc(100% - ${2 * pad}px)`, boxSizing: "border-box",
          padding: `0 ${Math.round(10 * s)}px 0 ${Math.round(badge.emblem_url ? 3 * s : 10 * s)}px`,
          borderRadius: 999, background: badge.color, color: ink, textDecoration: "none",
          boxShadow: `0 1px 2px rgba(0,0,0,.25), 0 6px 18px -6px ${badge.color}`,
          cursor: draggable ? "grab" : interactive ? "pointer" : "default",
          outline: dragging.current ? `1px dashed ${ink}` : undefined, outlineOffset: 2,
          userSelect: "none", whiteSpace: "nowrap",
        }}
      >
        {badge.emblem_url && (
          <img src={badge.emblem_url} alt="" draggable={false}
            style={{ width: h - Math.round(6 * s), height: h - Math.round(6 * s), objectFit: "contain", borderRadius: 999, pointerEvents: "none", flex: "none" }} />
        )}
        <span style={{ fontFamily: crewFontStyle(badge.font), fontWeight: 800, fontSize: Math.round(12 * s), lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
          {badge.name}
        </span>
        <span style={{ fontFamily: "'Space Mono', ui-monospace, monospace", fontWeight: 700, fontSize: Math.round(10 * s), opacity: 0.75, flex: "none" }}>
          {memberNumber(badge.number)}
        </span>
      </a>
    </>
  );
}
