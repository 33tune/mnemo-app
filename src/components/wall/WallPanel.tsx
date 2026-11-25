"use client";
/**
 * Muro (2026-11-25): the back of the card. Opening it turns the card (its own
 * element, rotateY added on top of whatever transform it has) to its edge; at
 * that point — invisible — the wall takes over at its own comfortable size
 * and keeps turning to face you. Closing plays it backwards. Small or wide
 * cards all get the same wall; it follows the card's look (resolveWallLook).
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ProfileCardData } from "@/types";
import { useWall } from "@/hooks/useWall";
import { hexAlpha } from "@/lib/comments";
import { resolveWallLook } from "@/lib/wall";
import { formatViewCount } from "@/lib/profileCardLayout";
import { useCommentCount } from "@/hooks/useComments";
import { WallBody, BackIcon, GearIcon, PhoneIcon, roundBtn, UI_FONT } from "./WallParts";

const TURN_MS = 230;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Turn an element by `from`→`to` degrees on Y, added to its own transform. */
function turn(el: HTMLElement, from: number, to: number, ms: number, easing: string, keep: boolean): Animation | null {
  const kf = [{ transform: `perspective(1600px) rotateY(${from}deg)` }, { transform: `perspective(1600px) rotateY(${to}deg)` }];
  try {
    return el.animate(kf, { duration: ms, easing, fill: keep ? "forwards" : "none", composite: "add" } as KeyframeAnimationOptions);
  } catch {
    return el.animate([{ opacity: from === 0 ? 1 : 0 }, { opacity: to === 0 ? 1 : 0 }], { duration: ms, easing, fill: keep ? "forwards" : "none" });
  }
}

export interface WallPanelProps {
  card: ProfileCardData;
  ownerUserId: string;
  ownerHandle: string;
  /** The card element on screen (turned while the wall is open). */
  getCard: () => HTMLElement | null;
  onClosed: () => void;
  /** Set by the parent to start closing (e.g. Esc from outside). */
  closing?: boolean;
  /** Editor: the gear (its menu) and profiles open in a new tab. */
  onSettings?: () => void;
  settingsOpen?: boolean;
  newTab?: boolean;
  /** Px kept free at the right (the editor's dock). */
  right?: number;
}

export default function WallPanel(p: WallPanelProps) {
  const look = resolveWallLook(p.card);
  const w = useWall(p.ownerUserId, true);
  const count = useCommentCount(p.ownerUserId);
  const panel = useRef<HTMLDivElement>(null);
  const cardAnim = useRef<Animation | null>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [phase, setPhase] = useState<"in" | "shown" | "out">("in");
  const closingRef = useRef(false);

  // Where the wall sits: centered on the card, its own size, inside the screen.
  useLayoutEffect(() => {
    const place = () => {
      const vw = window.innerWidth - (p.right ?? 0), vh = window.innerHeight;
      const r = p.getCard()?.getBoundingClientRect();
      const width = Math.min(400, vw - 24), height = Math.min(640, vh - 32);
      const cx = r ? r.left + r.width / 2 : vw / 2, cy = r ? r.top + r.height / 2 : vh / 2;
      setBox({
        width, height,
        left: Math.max(12, Math.min(vw - width - 12, cx - width / 2)),
        top: Math.max(16, Math.min(vh - height - 16, cy - height / 2)),
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [p]);

  // Open: the card turns away, then the wall turns in.
  useEffect(() => {
    const el = p.getCard();
    const ms = reduced() ? 1 : TURN_MS;
    const a = el ? turn(el, 0, 90, ms, "cubic-bezier(.55,0,.9,.45)", true) : null;
    cardAnim.current = a;
    const t = window.setTimeout(() => {
      setPhase("shown");
      if (panel.current) turn(panel.current, -90, 0, reduced() ? 1 : TURN_MS + 60, "cubic-bezier(.12,.6,.3,1)", false);
      panel.current?.focus({ preventScroll: true });
    }, ms);
    return () => { window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Whatever happens, never leave the card turned away.
  useEffect(() => () => { cardAnim.current?.cancel(); }, []);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setPhase("out");
    const ms = reduced() ? 1 : TURN_MS;
    const a = panel.current ? turn(panel.current, 0, -90, ms, "cubic-bezier(.55,0,.9,.45)", true) : null;
    const back = () => {
      const el = p.getCard();
      cardAnim.current?.cancel();
      cardAnim.current = null;
      if (el) turn(el, 90, 0, reduced() ? 1 : TURN_MS + 60, "cubic-bezier(.12,.6,.3,1)", false);
      p.onClosed();
    };
    if (a) a.onfinish = back; else back();
  };
  useEffect(() => { if (p.closing) close(); });
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (panel.current?.contains(document.activeElement ?? null) || document.activeElement === document.body) { e.stopPropagation(); close(); }
    };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  });

  const ink = look.color;
  const glass = look.opacity < 1;
  if (!box) return null;
  return (
    <div ref={panel} tabIndex={-1} data-mnemo-ui="" data-export-skip="" data-wall-panel="" role="dialog" aria-label={`Muro de @${p.ownerHandle}`}
      onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onKeyDown={e => { if (e.key !== "Escape") e.stopPropagation(); }}
      onWheel={e => e.stopPropagation()}
      style={{ position: "fixed", zIndex: 2147481500, ...box, display: "flex", flexDirection: "column", boxSizing: "border-box", outline: "none",
        visibility: phase === "in" ? "hidden" : "visible",
        background: hexAlpha(look.bg, look.opacity), color: ink, font: `500 14px ${UI_FONT}`, borderRadius: look.radius,
        border: `1px solid ${hexAlpha(ink, 0.12)}`, boxShadow: "0 30px 80px rgba(0,0,0,.45)", overflow: "hidden",
        backdropFilter: glass ? "blur(22px) saturate(140%)" : undefined, WebkitBackdropFilter: glass ? "blur(22px) saturate(140%)" : undefined }}>
      {look.bgImage && (
        <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url(${look.bgImage})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.22, pointerEvents: "none" }} />
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, padding: "12px 10px 10px 16px", borderBottom: `1px solid ${hexAlpha(ink, 0.1)}` }}>
        <PhoneIcon size={17} />
        <span style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{p.ownerHandle}</span>
        {count > 0 && <span style={{ color: hexAlpha(ink, 0.55), fontWeight: 600 }}>{formatViewCount(count)}</span>}
        <span style={{ flex: 1 }} />
        {p.onSettings && (
          <button type="button" onClick={p.onSettings} aria-label="Ajustes del muro" aria-expanded={!!p.settingsOpen} title="Ajustes"
            style={{ ...roundBtn, background: p.settingsOpen ? hexAlpha(ink, 0.16) : "transparent" }}>
            <GearIcon />
          </button>
        )}
        <button type="button" onClick={close} aria-label="Dar vuelta la card" title="Volver" style={{ ...roundBtn }}>
          <BackIcon />
        </button>
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <WallBody w={w} ink={ink} accent={look.accent} ownerHandle={p.ownerHandle} newTab={p.newTab}
          loginHref={`/login?next=${typeof location !== "undefined" ? encodeURIComponent(location.pathname + "?muro=1") : "/"}`} />
      </div>
    </div>
  );
}
