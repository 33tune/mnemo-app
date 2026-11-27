"use client";
/**
 * Muro (2026-11-25, v2 2026-11-26): the BACK of the card. Opening it turns the
 * card to its edge; there the back takes over — the same card seen from
 * behind: its background, border, glow, holo, retro, floating, tilt… (CardLayers
 * with the card's own effects), at the wall's fixed size (WALL_W × WALL_H, the
 * same for every card). The owner can give it its own background, font and
 * colors, or turn the card's effects off for the back (card.commentsBox).
 *
 * Tabs: the wall (what everyone sees) and — only on your own card — Feed and
 * Avisos, which nobody else sees.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CardEffects, ProfileCardData } from "@/types";
import CardLayers from "@/components/canvas/CardLayers";
import { HeartIcon, CommentIcon } from "@/components/canvas/StatsRow";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import { useWall, useFeed, useActivity, useUnreadActivity } from "@/hooks/useWall";
import { useCommentCount } from "@/hooks/useComments";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import { cardIsLight } from "@/lib/cardColors";
import { fxCardColors } from "@/lib/cardPalette";
import { hexAlpha, timeAgo } from "@/lib/comments";
import { resolveWallLook, readableOn, postFontFamily, wallBackEffects, WALL_W, WALL_H } from "@/lib/wall";
import { formatViewCount } from "@/lib/profileCardLayout";
import { WallBody, PostView, Avatar, BackIcon, WallIcon, FeedIcon, BellIcon, ReplyArrow, roundBtn, UI_FONT } from "./WallParts";
import { useViewerId } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/track";

const TURN_MS = 230;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Turn an element by `from`→`to` degrees on Y, added to its own transform. */
export function turn(el: HTMLElement, from: number, to: number, ms: number, easing: string, keep: boolean): Animation | null {
  const kf = [{ transform: `perspective(1600px) rotateY(${from}deg)` }, { transform: `perspective(1600px) rotateY(${to}deg)` }];
  try {
    const a = el.animate(kf, { duration: ms, easing, fill: keep ? "forwards" : "none", composite: "add" } as KeyframeAnimationOptions);
    // Turned away = gone (its edge never peeks out); the fade rides on the same animation's lifetime.
    if (keep && Math.abs(to) === 90) {
      const fade = el.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.85 }, { opacity: 0, offset: 1 }], { duration: ms, fill: "forwards" });
      const cancel = a.cancel.bind(a);
      a.cancel = () => { fade.cancel(); cancel(); };
    }
    return a;
  } catch {
    return el.animate([{ opacity: from === 0 ? 1 : 0 }, { opacity: to === 0 ? 1 : 0 }], { duration: ms, easing, fill: keep ? "forwards" : "none" });
  }
}

/** The back's effects (wall.ts › wallBackEffects). */
export const backEffects = wallBackEffects;

type Tab = "wall" | "feed" | "news";

export interface WallPanelProps {
  card: ProfileCardData;
  ownerUserId: string;
  ownerHandle: string;
  getCard: () => HTMLElement | null;
  onClosed: () => void;
  closing?: boolean;
  /** Editor: the wall settings are open beside it (Esc belongs to the inspector). */
  editing?: boolean;
  newTab?: boolean;
  /** Px kept free at the right (the editor's dock) and at the bottom. */
  right?: number;
  bottom?: number;
  /** Open on this tab (Avisos from the dot). */
  startTab?: Tab;
}

export default function WallPanel(p: WallPanelProps) {
  const look = resolveWallLook(p.card);
  const w = useWall(p.ownerUserId, true);
  const count = useCommentCount(p.ownerUserId);
  const own = w.isOwner;
  const unread = useUnreadActivity(own);
  const [tab, setTab] = useState<Tab>(p.startTab ?? "wall");
  const shell = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const cardAnim = useRef<Animation | null>(null);
  const [box, setBox] = useState<{ left: number; top: number; scale: number } | null>(null);
  const [phase, setPhase] = useState<"in" | "shown" | "out">("in");
  const closingRef = useRef(false);

  // Phones get the light back (see wallBackEffects) and no tilt by finger.
  const [lite] = useState(() => typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700));
  const fx = useMemo(() => backEffects(p.card, { lite }), [p.card, lite]);
  const light = useMemo(() => cardIsLight({ ...p.card, effects: fx } as ProfileCardData, fx), [p.card, fx]);
  const colors = useMemo(() => fxCardColors(p.card, getProfileCardEffects(p.card)), [p.card]);
  const ix = useCardInteractions(fx, face as React.RefObject<HTMLElement | null>, true);
  const ink = readableOn(look.color, look.bg);

  // Where it sits: centered on the card, the wall's fixed size, scaled down only to fit the screen.
  useLayoutEffect(() => {
    const place = () => {
      const vw = window.innerWidth - (p.right ?? 0), vh = window.innerHeight - (p.bottom ?? 0);
      const scale = Math.min(1, (vw - 24) / WALL_W, (vh - 32) / WALL_H);
      const width = WALL_W * scale, height = WALL_H * scale;
      const r = p.getCard()?.getBoundingClientRect();
      const cx = r ? r.left + r.width / 2 : vw / 2, cy = r ? r.top + r.height / 2 : vh / 2;
      setBox({
        scale,
        left: Math.max(12, Math.min(vw - width - 12, cx - width / 2)),
        top: Math.max(16, Math.min(vh - height - 16, cy - height / 2)),
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.right, p.bottom]);

  // Open: the card turns away, then the back turns in.
  useEffect(() => {
    const el = p.getCard();
    const ms = reduced() ? 1 : TURN_MS;
    cardAnim.current = el ? turn(el, 0, 90, ms, "cubic-bezier(.55,0,.9,.45)", true) : null;
    // Turned away = asleep: no animations, nothing drawn (frees the GPU on phones).
    if (el) window.setTimeout(() => { if (!closingRef.current) { el.setAttribute("data-fx-paused", ""); el.style.visibility = "hidden"; } }, ms + 20);
    const t = window.setTimeout(() => {
      setPhase("shown");
      if (shell.current) turn(shell.current, -90, 0, reduced() ? 1 : TURN_MS + 60, "cubic-bezier(.12,.6,.3,1)", false);
      shell.current?.focus({ preventScroll: true });
    }, ms);
    return () => { window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => {
    cardAnim.current?.cancel();
    const el = p.getCard();
    if (el) { el.style.visibility = ""; el.removeAttribute("data-fx-paused"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setPhase("out");
    const ms = reduced() ? 1 : TURN_MS;
    const a = shell.current ? turn(shell.current, 0, -90, ms, "cubic-bezier(.55,0,.9,.45)", true) : null;
    const back = () => {
      const el = p.getCard();
      if (el) { el.style.visibility = ""; el.removeAttribute("data-fx-paused"); }
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
      if (e.key !== "Escape" || p.editing) return;
      if (shell.current?.contains(document.activeElement ?? null) || document.activeElement === document.body) { e.stopPropagation(); close(); }
    };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  });

  if (!box) return null;
  const tabs: { id: Tab; label: string; icon: React.ReactNode; dot?: boolean }[] = [
    { id: "wall", label: "Muro", icon: <WallIcon size={17} /> },
    { id: "feed", label: "Feed", icon: <FeedIcon size={17} /> },
    { id: "news", label: "Avisos", icon: <BellIcon size={17} />, dot: unread > 0 },
  ];
  const owner = { handle: p.ownerHandle, photo: typeof p.card.photo === "string" && /^https?:\/\//.test(p.card.photo) ? p.card.photo : null,
    pfpRadius: `${Math.max(0, Math.min(100, p.card.pfpRadius ?? 100)) / 2}%`, bg: look.bg, nameColor: ink };

  return (
    <div ref={shell} tabIndex={-1} data-mnemo-ui="" data-export-skip="" data-wall-panel="" role="dialog" aria-label={`Muro de @${p.ownerHandle}`}
      onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onKeyDown={e => { if (e.key !== "Escape") e.stopPropagation(); }}
      onWheel={e => e.stopPropagation()}
      style={{ position: "fixed", zIndex: 2147481500, left: box.left, top: box.top, width: WALL_W * box.scale, height: WALL_H * box.scale, outline: "none",
        visibility: phase === "in" ? "hidden" : "visible" }}>
      <div ref={face}
        onMouseMove={ix.onMouseMove} onMouseEnter={ix.onMouseEnter} onMouseLeave={ix.onMouseLeave}
        style={{ position: "absolute", left: 0, top: 0, width: WALL_W, height: WALL_H, transform: `scale(${box.scale})`, transformOrigin: "0 0" }}>
        <CardLayers cardId={`${p.card.id}-wall`} effects={fx} borderRadius={look.radius} lightCard={light} cardW={WALL_W} cardH={WALL_H} cardColors={colors} entering={false}>
          <div style={{ position: "absolute", inset: 0, borderRadius: look.radius, overflow: "hidden", display: "flex", flexDirection: "column",
            color: ink, font: `500 14px ${UI_FONT}` }}>
            {look.bgImage && (
              <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none",
                background: light ? "linear-gradient(rgba(255,255,255,.35), rgba(255,255,255,.6))" : "linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.62))" }} />
            )}
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, padding: "12px 10px 10px 14px", borderBottom: `1px solid ${hexAlpha(ink, 0.12)}` }}>
              <Avatar a={owner} size={28} ink={ink} />
              <span style={{ fontFamily: postFontFamily(look.font), fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>@{p.ownerHandle}</span>
              {count > 0 && <span style={{ color: hexAlpha(ink, 0.6), fontWeight: 600 }}>{formatViewCount(count)}</span>}
              <span style={{ flex: 1 }} />
              {own && (
                <div role="tablist" aria-label="Tu muro" style={{ display: "flex", gap: 2, padding: 2, borderRadius: 12, background: hexAlpha(ink, 0.08) }}>
                  {tabs.map(t => (
                    <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-label={t.label} title={t.label} onClick={() => setTab(t.id)}
                      style={{ ...roundBtn, position: "relative", width: 34, height: 30, borderRadius: 10, color: tab === t.id ? ink : hexAlpha(ink, 0.55),
                        background: tab === t.id ? hexAlpha(ink, 0.16) : "transparent" }}>
                      {t.icon}
                      {t.dot && tab !== t.id && <span aria-hidden style={{ position: "absolute", top: 3, right: 5, width: 7, height: 7, borderRadius: 99, background: look.accent }} />}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={close} aria-label="Volver al frente" title="Volver al frente" style={{ ...roundBtn }}>
                <BackIcon />
              </button>
            </div>
            <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {tab === "wall" && (
                <WallBody w={w} ink={ink} accent={look.accent} wallBg={look.bg} ownerHandle={p.ownerHandle} newTab={p.newTab}
                  loginHref={`/login?next=${typeof location !== "undefined" ? encodeURIComponent(location.pathname + "?muro=1") : "/"}`} />
              )}
              {tab === "feed" && own && <FeedTab meId={p.ownerUserId} ink={ink} accent={look.accent} wallBg={look.bg} newTab={p.newTab} />}
              {tab === "news" && own && <NewsTab ink={ink} accent={look.accent} newTab={p.newTab} />}
            </div>
          </div>
        </CardLayers>
      </div>
    </div>
  );
}

function Empty({ icon, ink }: { icon: React.ReactNode; ink: string }) {
  return <div style={{ display: "grid", placeItems: "center", padding: "64px 16px", color: hexAlpha(ink, 0.4) }}>{icon}</div>;
}

/** Feed: what the cards I gave a heart to posted on their OWN walls. */
function FeedTab({ meId, ink, accent, wallBg, newTab }: { meId: string; ink: string; accent: string; wallBg: string; newTab?: boolean }) {
  const f = useFeed(true);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "4px 14px 10px", overscrollBehavior: "contain" }}>
      {!f.loaded && <Empty ink={ink} icon={<FeedIcon size={28} />} />}
      {f.loaded && f.posts.length === 0 && <Empty ink={ink} icon={<HeartIcon size={30} />} />}
      {f.posts.map(post => (
        <PostView key={post.id} post={post} ink={ink} accent={accent} wallBg={wallBg} viewer={meId} newTab={newTab}
          onLike={() => f.like(post.id)}
          onReply={() => { const url = `/${post.author.handle}?muro=1`; if (newTab) window.open(url, "_blank"); else location.href = url; }} />
      ))}
      {f.more && <button type="button" onClick={f.loadMore} aria-label="Ver más" style={{ display: "block", margin: "8px auto", ...roundBtn, color: hexAlpha(ink, 0.6) }}>···</button>}
    </div>
  );
}

/** Avisos: posts on my wall, replies to me, likes on my posts. */
function FavBack({ userId, accent, mutual }: { userId: string; accent: string; mutual?: boolean }) {
  const viewer = useViewerId();
  const [done, setDone] = useState(!!mutual);
  if (!viewer || !userId) return null;
  return (
    <button type="button" disabled={done} aria-pressed={done}
      onClick={e => {
        e.preventDefault(); e.stopPropagation(); setDone(true); track("favorite_add", { from: "notice" });
        createClient().from("favorites").insert({ user_id: viewer, target_user_id: userId }).then(({ error }) => { if (error && error.code !== "23505") setDone(false); });
      }}
      style={{ flex: "none", height: 30, padding: "0 12px", borderRadius: 999, border: "none", cursor: done ? "default" : "pointer",
        background: done ? "rgba(255,255,255,.12)" : accent, color: "#fff", font: "700 12px system-ui, sans-serif" }}>
      {done ? "Agregado" : "Agregar"}
    </button>
  );
}

function NewsTab({ ink, accent, newTab }: { ink: string; accent: string; newTab?: boolean }) {
  const a = useActivity(true);
  const kindIcon = (k: string) => (k === "like" || k === "favorite" ? <HeartIcon size={11} filled /> : k === "reply" ? <ReplyArrow size={11} /> : <CommentIcon size={11} />);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 10px", overscrollBehavior: "contain" }}>
      {!a.loaded && <Empty ink={ink} icon={<BellIcon size={28} />} />}
      {a.loaded && a.items.length === 0 && <Empty ink={ink} icon={<BellIcon size={30} />} />}
      {a.items.map((it, i) => (
        <a key={`${it.postId}-${it.kind}-${i}`} href={it.kind === "favorite" ? (it.actor.handle ? `/${it.actor.handle}` : undefined) : it.wallHandle ? `/${it.wallHandle}?muro=1` : undefined} target={newTab ? "_blank" : undefined} rel="noreferrer"
          aria-label={`${it.actor.handle ? "@" + it.actor.handle : "alguien"} · ${it.body}`}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", borderRadius: 14, color: ink, textDecoration: "none" }}>
          <span style={{ position: "relative", flex: "none" }}>
            <Avatar a={it.actor} size={36} />
            <span aria-hidden style={{ position: "absolute", right: -4, bottom: -4, width: 19, height: 19, borderRadius: 99, display: "grid", placeItems: "center",
              background: it.kind === "like" || it.kind === "favorite" ? accent : "#2c2b33", color: "#fff", boxShadow: "0 0 0 2px rgba(0,0,0,.4)" }}>{kindIcon(it.kind)}</span>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 650, fontSize: 13 }}>@{it.actor.handle || "?"}</span>
            <span style={{ display: "block", color: hexAlpha(ink, 0.65), fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} data-no-i18n={it.kind === "favorite" ? undefined : ""}>{it.body}</span>
          </span>
          {it.kind === "favorite"
            ? <FavBack userId={it.actor.id} accent={accent} mutual={it.mutual} />
            : <span style={{ color: hexAlpha(ink, 0.5), fontSize: 11.5, flex: "none" }}>{timeAgo(it.at)}</span>}
        </a>
      ))}
    </div>
  );
}
