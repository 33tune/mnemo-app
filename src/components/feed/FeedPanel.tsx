"use client";
/**
 * Feed (2026-11-28, pedido del usuario: "que el feed salga de Explorar, con un
 * botón al lado, que se pueda postear desde ahí, que para recargar scrollees
 * para arriba"). Its own panel — a dock on a computer, the whole screen on a
 * phone — with:
 *   - a composer on top that posts on YOUR wall;
 *   - pull to refresh (finger) / keep scrolling up at the top (wheel), or the button;
 *   - what the cards you keep in favorites post and repost, a burst of picture
 *     reposts as one block (lib/feed.ts › groupFeed), and now and then a post
 *     from someone else with many interactions (withSuggested);
 *   - replies right here (PostThread), never sending you to the other profile.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupFeed, withSuggested, type FeedItem, type FeedResource, type SuggestedPost } from "@/lib/feed";
import { cleanPostStyle, wallError, type PostStyle, type WallPost } from "@/lib/wall";
import { timeAgo } from "@/lib/comments";
import { PostView, RepostGlyph, Composer } from "@/components/wall/WallParts";
import { PostThread } from "@/components/wall/PostThread";
import { ResourceViewer, thumbOf, type ResourceTarget } from "@/components/wall/Resources";
import { HeartIcon } from "@/components/canvas/StatsRow";
import { togglePostLike, togglePostRepost } from "@/hooks/useWall";
import { useViewerId } from "@/lib/viewer";
import { isVerifyError, requestVerify } from "@/lib/verify";
import { track } from "@/lib/track";
import { markFeedSeen } from "./feedBadge";

export const FEED_PANEL_ID = "mnemo-feed";
export const FEED_DOCK_W = 560;
const ACC = "#FF4F94";
const INK = "#F6F3F8";
const BG = "#100e15";
const font = "var(--font-sans, system-ui), -apple-system, 'Segoe UI', sans-serif";
const PULL = 70;

export default function FeedPanel({ mode, onClose, top = 14, bottom = 14, right = 14, newTab }: {
  mode: "dock" | "screen"; onClose?: () => void; top?: number; bottom?: number; right?: number; newTab?: boolean;
}) {
  const viewer = useViewerId();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [sugg, setSugg] = useState<SuggestedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<ResourceTarget | null>(null);
  const [thread, setThread] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pull, setPull] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (before: string | null) => {
    setBusy(true); setFailed(false);
    try {
      const r = await fetch(`/api/feed${before ? `?before=${encodeURIComponent(before)}` : ""}`, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json() as { items: FeedItem[]; suggested?: SuggestedPost[]; more: boolean; cursor: string | null };
      setItems(prev => (before ? [...(prev ?? []), ...j.items] : j.items));
      if (!before) setSugg(j.suggested ?? []);
      setMore(!!j.more); setCursor(j.cursor);
    } catch { setFailed(true); setItems(prev => prev ?? []); }
    finally { setBusy(false); }
  }, []);
  const refresh = useCallback(async (how: "pull" | "button" | "post" = "button") => {
    if (refreshing) return;
    setRefreshing(true);
    if (how !== "post") track("feed_refresh", { how });
    await load(null);
    markFeedSeen();
    setRefreshing(false);
  }, [load, refreshing]);

  useEffect(() => { if (viewer) { load(null); markFeedSeen(); track("feed_open", { mode }); } }, [viewer, load, mode]);
  useEffect(() => {
    if (!onClose) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !open) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose, open]);

  // Endless scroll.
  const endRef = useRef<HTMLDivElement>(null);
  const st = useRef({ more, busy, cursor, failed });
  st.current = { more, busy, cursor, failed };
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      const s = st.current;
      if (e.isIntersecting && s.more && !s.busy && !s.failed && s.cursor) load(s.cursor);
    }, { root: scrollRef.current, rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [load, items === null]);

  // Pull to refresh: a finger pulling down at the top, or the wheel going on up.
  const touch = useRef<{ y: number; active: boolean } | null>(null);
  const wheelAcc = useRef(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => { touch.current = { y: e.touches[0].clientY, active: el.scrollTop <= 0 }; };
    const onMove = (e: TouchEvent) => {
      const t = touch.current; if (!t?.active) return;
      const dy = e.touches[0].clientY - t.y;
      if (dy > 0 && el.scrollTop <= 0) { setPull(Math.min(PULL * 1.6, dy * 0.55)); if (e.cancelable) e.preventDefault(); }
      else setPull(0);
    };
    const onEnd = () => {
      const was = touch.current?.active; touch.current = null;
      setPull(p => { if (was && p >= PULL) void refresh("pull"); return 0; });
    };
    let tm = 0;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollTop > 0 || e.deltaY >= 0) { wheelAcc.current = 0; setPull(0); return; }
      wheelAcc.current += -e.deltaY;
      setPull(Math.min(PULL * 1.4, wheelAcc.current / 3));
      window.clearTimeout(tm);
      if (wheelAcc.current > PULL * 3) { wheelAcc.current = 0; setPull(0); void refresh("pull"); return; }
      tm = window.setTimeout(() => { wheelAcc.current = 0; setPull(0); }, 260);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart); el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd); el.removeEventListener("wheel", onWheel); window.clearTimeout(tm);
    };
  }, [refresh]);

  const patchPost = (id: string, f: (p: WallPost) => WallPost) => {
    setItems(list => list?.map(it => (it.post?.id === id ? { ...it, post: f(it.post) } : it)) ?? list);
    setSugg(list => list.map(s => (s.post.id === id ? { ...s, post: f(s.post) } : s)));
  };
  const like = (p: WallPost) => {
    const flip = (x: WallPost) => ({ ...x, liked: !x.liked, likes: Math.max(0, x.likes + (x.liked ? -1 : 1)) });
    patchPost(p.id, flip);
    togglePostLike(p.id).then(r => { if (!r) patchPost(p.id, flip); else patchPost(p.id, x => ({ ...x, liked: r.liked, likes: r.n })); });
  };
  const repost = (p: WallPost) => {
    const flip = (x: WallPost) => ({ ...x, reposted: !x.reposted, reposts: Math.max(0, (x.reposts ?? 0) + (x.reposted ? -1 : 1)) });
    patchPost(p.id, flip);
    togglePostRepost(p.id).then(r => { if (!r) patchPost(p.id, flip); else patchPost(p.id, x => ({ ...x, reposted: r.reposted, reposts: r.n })); });
  };
  const postMine = async (body: string, style: PostStyle): Promise<string | null> => {
    if (!viewer) return "Iniciá sesión para escribir.";
    const s = cleanPostStyle(style);
    const { error } = await createClient().rpc("post_wall", { p_owner: viewer, p_body: body, p_parent: null, p_style: Object.keys(s).length ? s : null });
    if (error) { if (isVerifyError(error)) requestVerify(); return wallError(error.message); }
    track("feed_post");
    void refresh("post");
    return null;
  };
  const openRes = (r: FeedResource) => { setOpen({ ownerId: r.ownerId, ownerHandle: r.ownerHandle, owner: r.owner, key: r.key, src: r.src }); track("resource_open", { from: "feed" }); };

  const entries = useMemo(() => withSuggested(groupFeed(items ?? []), sugg), [items, sugg]);

  const renderPost = (p: WallPost, key: string) => (
    <>
      <PostView post={p} ink={INK} accent={ACC} wallBg={BG} viewer={viewer} newTab={newTab}
        onLike={() => like(p)}
        onRepost={viewer && p.wallOwner !== viewer ? () => repost(p) : undefined}
        threadOpen={thread === key} onThread={() => setThread(t => (t === key ? null : key))} />
      {thread === key && <PostThread post={p} viewer={viewer} ink={INK} accent={ACC} wallBg={BG} newTab={newTab}
        onReplied={() => patchPost(p.id, x => ({ ...x, replies: x.replies + 1 }))} />}
    </>
  );

  const dock = mode === "dock";
  const shell: React.CSSProperties = dock
    ? { position: "fixed", top, right, bottom, width: `min(${FEED_DOCK_W}px, calc(100vw - 28px))`, borderRadius: 24, zIndex: 2147481050,
        background: "rgba(16,14,21,.985)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 24px 60px rgba(0,0,0,.45)" }
    : { position: "fixed", inset: 0, bottom, zIndex: 2147481050, background: "#0E0C12" };

  return (
    <section id={FEED_PANEL_ID} data-mnemo-ui="" data-export-skip="" aria-label="Feed"
      onMouseDown={e => e.stopPropagation()} onKeyDown={e => { if (e.key !== "Escape") e.stopPropagation(); }}
      style={{ ...shell, color: INK, font: `500 14px ${font}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: dock ? "18px 18px 10px" : "calc(env(safe-area-inset-top, 0px) + 18px) 16px 10px", display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
        <h2 style={{ margin: 0, font: "800 22px 'Unbounded', var(--font-sans), sans-serif", letterSpacing: "-.01em" }}>Feed</h2>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => refresh("button")} aria-label="Actualizar" title="Actualizar" disabled={refreshing}
          style={{ width: 36, height: 36, borderRadius: 18, border: "none", background: "rgba(255,255,255,.08)", color: INK, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            style={{ animation: refreshing ? "mnemo-feed-spin .8s linear infinite" : undefined }}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 4v5h-5" /></svg>
        </button>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Cerrar Feed"
            style={{ width: 36, height: 36, borderRadius: 18, border: "none", background: "rgba(255,255,255,.08)", color: INK, display: "grid", placeItems: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      <style>{`@keyframes mnemo-feed-spin{to{transform:rotate(360deg)}}`}</style>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: dock ? "0 18px 18px" : "0 16px 24px", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
        {/* Pull to refresh */}
        <div aria-hidden={!pull && !refreshing} style={{ height: refreshing ? 44 : pull, overflow: "hidden", display: "grid", placeItems: "center", transition: pull ? "none" : "height .2s",
          color: "rgba(246,243,248,.6)", font: `600 12px ${font}` }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 18, height: 18, borderRadius: 9, border: "2.5px solid rgba(255,255,255,.16)", borderTopColor: ACC,
              animation: refreshing ? "mnemo-feed-spin .8s linear infinite" : undefined, transform: refreshing ? undefined : `rotate(${pull * 4}deg)` }} />
            {refreshing ? "Actualizando…" : pull >= PULL ? "Soltá para actualizar" : "Tirá para actualizar"}
          </span>
        </div>

        {viewer === null ? (
          <p style={{ color: "rgba(246,243,248,.65)", marginTop: 16 }}>Iniciá sesión para ver lo que publican tus favoritos.</p>
        ) : (
          <>
            {viewer && (
              <div style={{ padding: 10, borderRadius: 18, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 6 }}>
                <Composer ink={INK} accent={ACC} wallBg={BG} placeholder="¿Qué estás pensando?" onSend={postMine} />
              </div>
            )}
            {items === null && <div style={{ marginTop: 14, display: "grid", gap: 10 }}>{[0, 1, 2].map(i => <div key={i} style={{ height: 86, borderRadius: 16, background: "rgba(255,255,255,.05)" }} />)}</div>}
            {items && entries.length === 0 && !failed && (
              <div style={{ display: "grid", placeItems: "center", gap: 10, padding: "48px 12px", color: "rgba(246,243,248,.6)", textAlign: "center" }}>
                <HeartIcon size={28} />
                <span>Dale corazón a las cards que te gustan: lo que publiquen y reposteen aparece acá.</span>
              </div>
            )}
            {entries.map(e => {
              if (e.type === "suggested") {
                const fav = e.s.likedByFavs;
                return (
                  <div key={e.key} style={{ borderBottom: "1px solid rgba(255,255,255,.06)", padding: "6px 0 4px" }}>
                    <Meta><span style={{ padding: "2px 8px", borderRadius: 99, background: "rgba(255,79,148,.14)", color: "#ff8ab8" }}>Sugerido</span>
                      <span>{fav > 0 ? (fav === 1 ? "le gustó a 1 de tus favoritos" : `le gustó a ${fav} de tus favoritos`) : "popular en myLand"}</span></Meta>
                    {renderPost(e.s.post, e.key)}
                  </div>
                );
              }
              if (e.type === "group") {
                const by = e.actor.handle ? `@${e.actor.handle}` : "alguien";
                const all = expanded.has(e.key);
                const n = e.resources.length;
                const shown = all ? e.resources : e.resources.slice(0, 4);
                return (
                  <div key={e.key} style={{ borderBottom: "1px solid rgba(255,255,255,.06)", padding: "10px 0 12px" }}>
                    <Meta><RepostGlyph /><span data-no-i18n="">{n === 1 ? `${by} reposteó un recurso de @${e.resources[0].ownerHandle || "?"}` : `${by} reposteó ${n} cosas`}</span>
                      <span style={{ marginLeft: "auto", flex: "none" }}>{timeAgo(e.at)}</span></Meta>
                    {n === 1 ? (
                      <button type="button" aria-label={`Abrir recurso de @${e.resources[0].ownerHandle}`} onClick={() => openRes(e.resources[0])}
                        style={{ display: "block", width: "100%", marginTop: 6, padding: 0, border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, overflow: "hidden", cursor: "pointer",
                          background: "repeating-conic-gradient(rgba(255,255,255,.05) 0 25%, transparent 0 50%) 0 0 / 16px 16px" }}>
                        <img src={thumbOf(e.resources[0].src, 480)} alt="" loading="lazy" draggable={false} style={{ display: "block", width: "100%", maxHeight: 340, objectFit: "contain" }} />
                      </button>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 6 }}>
                        {shown.map((r, i) => {
                          const rest = !all && i === 3 && n > 4 ? n - 3 : 0;
                          return (
                            <button key={`${r.ownerId}:${r.key}:${i}`} type="button" aria-label={rest ? `Ver las ${n}` : `Abrir recurso de @${r.ownerHandle}`}
                              onClick={() => (rest ? setExpanded(s => new Set(s).add(e.key)) : openRes(r))}
                              style={{ position: "relative", aspectRatio: "1", padding: 0, borderRadius: 12, overflow: "hidden", cursor: "pointer", border: "1px solid rgba(255,255,255,.08)",
                                background: "repeating-conic-gradient(rgba(255,255,255,.05) 0 25%, transparent 0 50%) 0 0 / 14px 14px" }}>
                              <img src={thumbOf(r.src, 200)} alt="" loading="lazy" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              {rest > 0 && <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.6)", font: `800 20px ${font}`, color: "#fff" }}>+{rest}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              const it = e.item;
              if (!it.post) return null;
              const by = it.actor.handle ? `@${it.actor.handle}` : "alguien";
              return (
                <div key={e.key} style={{ borderBottom: "1px solid rgba(255,255,255,.06)", padding: "2px 0 4px" }}>
                  {it.kind === "repost_post" && <Meta><RepostGlyph /><span data-no-i18n="">{by} reposteó</span></Meta>}
                  {renderPost(it.post, e.key)}
                </div>
              );
            })}
            <div ref={endRef} aria-hidden style={{ height: 1 }} />
            {failed && <button type="button" onClick={() => load(items?.length ? cursor : null)} style={{ display: "block", width: "100%", height: 42, marginTop: 10, borderRadius: 999, border: "none", background: "rgba(255,255,255,.08)", color: INK, cursor: "pointer", font: `600 13px ${font}` }}>Reintentar</button>}
            {busy && !!items?.length && !refreshing && <p style={{ textAlign: "center", color: "rgba(246,243,248,.5)" }}>Cargando…</p>}
          </>
        )}
      </div>
      {open && <ResourceViewer target={open} accent={ACC} newTab={newTab} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(246,243,248,.55)", font: `650 11.5px ${font}`, marginTop: 8, minWidth: 0 }}>{children}</div>;
}

/** The button next to Explorar (computer) — with the count of new things. */
export function FeedButton({ open, onToggle, count, compact }: { open: boolean; onToggle: () => void; count: number; compact?: boolean }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={FEED_PANEL_ID} aria-label={count ? `Feed, ${count} nuevos` : "Feed"}
      data-mnemo-ui="" data-export-skip=""
      style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, height: compact ? 44 : 48, padding: compact ? 0 : "0 20px", width: compact ? 44 : undefined, borderRadius: 999, cursor: "pointer",
        font: `700 15px ${font}`, border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        background: open ? INK : "rgba(14,13,18,.86)", color: open ? "#141118" : "#fff", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="3.5" width="16" height="7" rx="2.2" /><rect x="4" y="13.5" width="16" height="7" rx="2.2" /></svg>
      {!compact && "Feed"}
      {count > 0 && <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: ACC, color: "#fff", font: `700 11.5px ${font}`, display: "grid", placeItems: "center",
        ...(compact ? { position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, fontSize: 10.5 } : {}) }}>{count > 99 ? "99+" : count}</span>}
    </button>
  );
}
