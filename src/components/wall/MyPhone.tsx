"use client";
/**
 * Muro (2026-11-25): "tu card en miniatura", always at the bottom-left (home
 * from anywhere), and "tu celular" — what it opens: Feed (what the cards I
 * gave a heart to wrote), Mi muro (my own wall) and Avisos (posts on my wall,
 * replies, likes). Icons, not words; a dot when there is something new.
 */
import React, { useEffect, useRef, useState } from "react";
import { HeartIcon, CommentIcon } from "@/components/canvas/StatsRow";
import { useMe, useUnreadActivity, useFeed, useActivity, useWall } from "@/hooks/useWall";
import { timeAgo, hexAlpha } from "@/lib/comments";
import { Avatar, PostView, WallBody, PhoneIcon, CloseIcon, ReplyArrow, roundBtn, UI_FONT } from "./WallParts";

const INK = "#f4f2f7";
const BG = "#0f0e13";
const ACCENT = "#ff4d6d";

type Tab = "feed" | "wall" | "news";

const FeedIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block" }}>
    <rect x="4" y="3.5" width="16" height="7" rx="2.2" /><rect x="4" y="13.5" width="16" height="7" rx="2.2" />
  </svg>
);
const BellIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block" }}>
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
  </svg>
);
const PencilIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block" }}>
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export interface MyCardDockProps {
  /** Px from the left edge (the editor's rail). */
  left?: number;
  bottom?: number;
  /** In the editor the "my card" shortcut is pointless (you're on it). */
  inEditor?: boolean;
  /** Phone editor: no dock, the phone is opened from elsewhere. */
  hideDock?: boolean;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export default function MyCardDock(p: MyCardDockProps) {
  const me = useMe();
  const unread = useUnreadActivity(!!me);
  const [openSelf, setOpenSelf] = useState(false);
  const open = p.open ?? openSelf;
  const setOpen = (v: boolean) => { if (p.onOpenChange) p.onOpenChange(v); else setOpenSelf(v); };
  const left = (p.left ?? 0) + 16;
  const bottom = p.bottom ?? 16;

  if (me === undefined) return null;
  if (me === null) {
    if (p.hideDock) return null;
    return (
      <a href="/" aria-label="myLand" data-export-skip="" data-mnemo-ui=""
        style={{ position: "fixed", left, bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, zIndex: 2147481000, width: 44, height: 44, borderRadius: 14,
          display: "grid", placeItems: "center", background: "rgba(14,14,18,0.6)", border: "1px solid rgba(255,255,255,0.18)",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
        <img src="/logo.png" alt="" width={26} height={26} style={{ display: "block", objectFit: "contain" }} />
      </a>
    );
  }
  return (
    <>
      {!p.hideDock && (
        <button type="button" data-export-skip="" data-mnemo-ui="" aria-label={`Tu celular${unread ? `, ${unread} nuevos` : ""}`} aria-expanded={open} title={`@${me.handle}`}
          onClick={() => setOpen(!open)} onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
          style={{ position: "fixed", left, bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, zIndex: 2147481000,
            width: 40, height: 54, padding: 4, borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: me.bg, border: `1px solid ${hexAlpha(me.nameColor, 0.25)}`, boxShadow: open ? `0 0 0 2px ${INK}` : "0 8px 24px rgba(0,0,0,.35)",
            transform: open ? "translateY(-2px)" : undefined, transition: "transform .15s, box-shadow .15s" }}>
          <Avatar a={me} size={24} />
          <span aria-hidden style={{ width: 22, height: 3, borderRadius: 2, background: hexAlpha(me.nameColor, 0.7) }} />
          <span aria-hidden style={{ width: 14, height: 3, borderRadius: 2, background: hexAlpha(me.nameColor, 0.4) }} />
          {unread > 0 && (
            <span aria-hidden style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 99, boxSizing: "border-box",
              background: ACCENT, color: "#fff", font: `700 10px/16px ${UI_FONT}`, boxShadow: `0 0 0 2px ${BG}` }}>{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      )}
      {open && <Phone meId={me.id} meHandle={me.handle} unread={unread} left={left} bottom={p.hideDock ? bottom : bottom + 62} inEditor={p.inEditor} onClose={() => setOpen(false)} />}
    </>
  );
}

function Phone({ meId, meHandle, unread, left, bottom, inEditor, onClose }: {
  meId: string; meHandle: string; unread: number; left: number; bottom: number; inEditor?: boolean; onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(unread > 0 ? "news" : "feed");
  const ref = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)");
    const on = () => setNarrow(m.matches);
    on(); m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && ref.current?.contains(document.activeElement ?? null)) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const pos: React.CSSProperties = narrow
    ? { left: 8, right: 8, bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, height: `min(72dvh, 620px)` }
    : { left, bottom, width: 360, height: "min(640px, calc(100vh - 110px))" };
  const tabs: { id: Tab; label: string; icon: React.ReactNode; dot?: boolean }[] = [
    { id: "feed", label: "Feed", icon: <FeedIcon /> },
    { id: "wall", label: "Mi muro", icon: <PhoneIcon size={20} /> },
    { id: "news", label: "Avisos", icon: <BellIcon />, dot: unread > 0 },
  ];

  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-label="Tu celular" data-mnemo-ui="" data-export-skip=""
      onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}
      style={{ position: "fixed", zIndex: 2147481600, ...pos, display: "flex", flexDirection: "column", outline: "none", overflow: "hidden",
        background: BG, color: INK, font: `500 14px ${UI_FONT}`, borderRadius: 30, border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 30px 80px rgba(0,0,0,.55), inset 0 0 0 4px #000" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 12px 6px 14px" }}>
        {!inEditor && (
          <a href="/dashboard" aria-label="Editar mi card" title="Mi card" style={{ ...roundBtn, color: INK, background: "rgba(255,255,255,0.08)" }}><PencilIcon /></a>
        )}
        <span style={{ flex: 1 }} />
        <span aria-hidden style={{ width: 70, height: 20, borderRadius: 99, background: "#000" }} />
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onClose} aria-label="Cerrar" style={{ ...roundBtn, color: INK, background: "rgba(255,255,255,0.08)" }}><CloseIcon /></button>
      </div>
      <div role="tabpanel" aria-label={tabs.find(t => t.id === tab)?.label} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {tab === "feed" && <FeedTab meId={meId} />}
        {tab === "wall" && <MyWallTab meId={meId} meHandle={meHandle} />}
        {tab === "news" && <NewsTab />}
      </div>
      <div role="tablist" aria-label="Tu celular" style={{ display: "flex", justifyContent: "space-around", padding: "6px 10px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {tabs.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-label={t.label} title={t.label} onClick={() => setTab(t.id)}
            style={{ ...roundBtn, position: "relative", width: 56, height: 40, borderRadius: 14, color: tab === t.id ? INK : hexAlpha(INK, 0.45),
              background: tab === t.id ? "rgba(255,255,255,0.1)" : "transparent" }}>
            {t.icon}
            {t.dot && tab !== t.id && <span aria-hidden style={{ position: "absolute", top: 7, right: 14, width: 8, height: 8, borderRadius: 99, background: ACCENT }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function Empty({ icon }: { icon: React.ReactNode }) {
  return <div style={{ display: "grid", placeItems: "center", padding: "64px 16px", color: hexAlpha(INK, 0.35) }}>{icon}</div>;
}

function FeedTab({ meId }: { meId: string }) {
  const f = useFeed(true);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 10px", overscrollBehavior: "contain" }}>
      {!f.loaded && <Empty icon={<FeedIcon size={28} />} />}
      {f.loaded && f.posts.length === 0 && <Empty icon={<HeartIcon size={30} />} />}
      {f.posts.map(post => (
        <PostView key={post.id} post={post} ink={INK} accent={ACCENT} viewer={meId} wallHandle={post.wallHandle}
          onLike={() => f.like(post.id)}
          onReply={() => { location.href = `/${post.wallHandle || post.author.handle}?muro=1`; }} />
      ))}
      {f.more && <button type="button" onClick={f.loadMore} aria-label="Ver más" style={{ display: "block", margin: "8px auto", ...roundBtn, color: hexAlpha(INK, 0.6) }}>···</button>}
    </div>
  );
}

function MyWallTab({ meId, meHandle }: { meId: string; meHandle: string }) {
  const w = useWall(meId, true);
  return <WallBody w={w} ink={INK} accent={ACCENT} ownerHandle={meHandle} loginHref="/login" />;
}

function NewsTab() {
  const a = useActivity(true);
  const kindIcon = (k: string) => (k === "like" ? <HeartIcon size={12} filled /> : k === "reply" ? <ReplyArrow size={12} /> : <CommentIcon size={12} />);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 10px", overscrollBehavior: "contain" }}>
      {!a.loaded && <Empty icon={<BellIcon size={28} />} />}
      {a.loaded && a.items.length === 0 && <Empty icon={<BellIcon size={30} />} />}
      {a.items.map((it, i) => (
        <a key={`${it.postId}-${it.kind}-${i}`} href={it.wallHandle ? `/${it.wallHandle}?muro=1` : undefined}
          aria-label={`${it.actor.handle ? "@" + it.actor.handle : "alguien"} · ${it.body}`}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", borderRadius: 14, color: INK, textDecoration: "none" }}>
          <span style={{ position: "relative", flex: "none" }}>
            <Avatar a={it.actor} size={36} />
            <span aria-hidden style={{ position: "absolute", right: -4, bottom: -4, width: 20, height: 20, borderRadius: 99, display: "grid", placeItems: "center",
              background: it.kind === "like" ? ACCENT : "#2c2b33", color: "#fff", boxShadow: `0 0 0 2px ${BG}` }}>{kindIcon(it.kind)}</span>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 650, fontSize: 13 }}>@{it.actor.handle || "?"}</span>
            <span style={{ display: "block", color: hexAlpha(INK, 0.6), fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.body}</span>
          </span>
          <span style={{ color: hexAlpha(INK, 0.45), fontSize: 11.5, flex: "none" }}>{timeAgo(it.at)}</span>
        </a>
      ))}
    </div>
  );
}
