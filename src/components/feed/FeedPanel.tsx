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
// Grafito (2026-11-28): a solid old-Mac window; white groups; pink only for a given heart.
const ACC = "#FF3D8B";
const ON = "#4b6a00";
const INK = "#15171A";
const BG = "#ffffff";
const font = "var(--gf-font)";
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
      <PostView post={p} ink={INK} accent={ACC} onColor={ON} wallBg={BG} viewer={viewer} newTab={newTab}
        onLike={() => like(p)}
        onRepost={viewer && p.wallOwner !== viewer ? () => repost(p) : undefined}
        threadOpen={thread === key} onThread={() => setThread(t => (t === key ? null : key))} />
      {thread === key && <PostThread post={p} viewer={viewer} ink={INK} accent={ACC} wallBg={BG} newTab={newTab} lima
        onReplied={() => patchPost(p.id, x => ({ ...x, replies: x.replies + 1 }))} />}
    </>
  );

  const dock = mode === "dock";
  const shell: React.CSSProperties = dock
    ? { position: "fixed", top, right, bottom, width: `min(${FEED_DOCK_W}px, calc(100vw - 28px))`, borderRadius: 14, zIndex: 2147481050 }
    : { position: "fixed", inset: 0, bottom, zIndex: 2147481050 };
  const pad = dock ? 16 : 12;
  const thumbBtn: React.CSSProperties = { position: "relative", padding: 0, border: "none", borderRadius: 9, overflow: "hidden", cursor: "pointer" };

  return (
    <section id={FEED_PANEL_ID} data-mnemo-ui="" data-export-skip="" aria-label="Feed" className="gf-win"
      onMouseDown={e => e.stopPropagation()} onKeyDown={e => { if (e.key !== "Escape") e.stopPropagation(); }}
      style={{ ...shell, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className={dock ? "gf-bar" : "gf-bar gf-bar--phone"}>
        <button type="button" className="gf-btn" onClick={() => refresh("button")} aria-label="Actualizar" title="Actualizar" disabled={refreshing}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            style={{ animation: refreshing ? "mnemo-feed-spin .8s linear infinite" : undefined }}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 4v5h-5" /></svg>
        </button>
        <span className="gf-bar__title" aria-hidden>Feed</span>
        <span style={{ flex: 1 }} />
        {onClose && <button type="button" className="gf-btn" onClick={onClose} aria-label="Cerrar Feed">Listo</button>}
      </div>
      <style>{`@keyframes mnemo-feed-spin{to{transform:rotate(360deg)}}`}</style>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: `0 ${pad}px 24px`, WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
        <h2 className="gf-big" style={{ margin: `14px 4px 8px` }}>Feed</h2>
        {/* Pull to refresh */}
        <div aria-hidden={!pull && !refreshing} style={{ height: refreshing ? 40 : pull, overflow: "hidden", display: "grid", placeItems: "center", transition: pull ? "none" : "height .2s",
          color: "var(--gf-ink3)", font: `500 12.5px ${font}` }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: 8, border: "2px solid rgba(21,23,26,.14)", borderTopColor: "#6a6e74",
              animation: refreshing ? "mnemo-feed-spin .8s linear infinite" : undefined, transform: refreshing ? undefined : `rotate(${pull * 4}deg)` }} />
            {refreshing ? "Actualizando…" : pull >= PULL ? "Soltá para actualizar" : "Tirá para actualizar"}
          </span>
        </div>

        {viewer === null ? (
          <p style={{ color: "var(--gf-ink2)", margin: "16px 4px" }}>Iniciá sesión para ver lo que publican tus favoritos.</p>
        ) : (
          <>
            {viewer && (
              <div className="gf-group" style={{ padding: 10, marginBottom: 12 }}>
                <Composer ink={INK} accent={ACC} wallBg={BG} lima placeholder="¿Qué estás pensando?" onSend={postMine} />
              </div>
            )}
            {items === null && <div style={{ display: "grid", gap: 10 }}>{[0, 1, 2].map(i => <div key={i} className="gf-skel" style={{ height: 96, borderRadius: 12 }} />)}</div>}
            {items && entries.length === 0 && !failed && (
              <div style={{ display: "grid", placeItems: "center", gap: 10, padding: "48px 12px", color: "var(--gf-ink2)", textAlign: "center" }}>
                <HeartIcon size={28} />
                <span>Dale corazón a las cards que te gustan: lo que publiquen y reposteen aparece acá.</span>
              </div>
            )}
            {entries.map(e => {
              if (e.type === "suggested") {
                const fav = e.s.likedByFavs;
                return (
                  <div key={e.key} style={{ marginBottom: 12 }}>
                    <div className="gf-foot" style={{ padding: "4px 12px 6px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" /></svg>
                      <span>Sugerido · {fav > 0 ? (fav === 1 ? "le gustó a 1 de tus favoritos" : `le gustó a ${fav} de tus favoritos`) : "popular en myLand"}</span>
                    </div>
                    <div className="gf-group" style={{ padding: "2px 14px 4px" }}>{renderPost(e.s.post, e.key)}</div>
                  </div>
                );
              }
              if (e.type === "group") {
                const by = e.actor.handle ? `@${e.actor.handle}` : "alguien";
                const all = expanded.has(e.key);
                const n = e.resources.length;
                const shown = all ? e.resources : e.resources.slice(0, 4);
                return (
                  <div key={e.key} className="gf-group" style={{ padding: "10px 14px 14px", marginBottom: 12 }}>
                    <Meta><RepostGlyph /><span data-no-i18n="" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n === 1 ? `${by} reposteó un recurso de @${e.resources[0].ownerHandle || "?"}` : `${by} reposteó ${n} cosas`}</span>
                      <span style={{ marginLeft: "auto", flex: "none", color: "var(--gf-ink3)", fontWeight: 400 }}>{timeAgo(e.at)}</span></Meta>
                    {n === 1 ? (
                      <button type="button" className="gf-check" aria-label={`Abrir recurso de @${e.resources[0].ownerHandle}`} onClick={() => openRes(e.resources[0])}
                        style={{ ...thumbBtn, display: "block", width: "100%", marginTop: 10, borderRadius: 12 }}>
                        <img src={thumbOf(e.resources[0].src, 480)} alt="" loading="lazy" draggable={false} style={{ display: "block", width: "100%", maxHeight: 340, objectFit: "contain" }} />
                      </button>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10 }}>
                        {shown.map((r, i) => {
                          const rest = !all && i === 3 && n > 4 ? n - 3 : 0;
                          return (
                            <button key={`${r.ownerId}:${r.key}:${i}`} type="button" className="gf-check" aria-label={rest ? `Ver las ${n}` : `Abrir recurso de @${r.ownerHandle}`}
                              onClick={() => (rest ? setExpanded(s => new Set(s).add(e.key)) : openRes(r))}
                              style={{ ...thumbBtn, aspectRatio: "1" }}>
                              <img src={thumbOf(r.src, 200)} alt="" loading="lazy" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                              {rest > 0 && <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(240,242,244,.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", font: `600 18px ${font}`, color: INK }}>+{rest}</span>}
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
                <div key={e.key} className="gf-group" style={{ padding: "2px 14px 4px", marginBottom: 12 }}>
                  {it.kind === "repost_post" && <Meta><RepostGlyph /><span data-no-i18n="">{by} reposteó</span></Meta>}
                  {renderPost(it.post, e.key)}
                </div>
              );
            })}
            <div ref={endRef} aria-hidden style={{ height: 1 }} />
            {failed && <button type="button" className="gf-btn gf-btn--pill" onClick={() => load(items?.length ? cursor : null)} style={{ display: "flex", width: "100%", marginTop: 10 }}>Reintentar</button>}
            {busy && !!items?.length && !refreshing && <p style={{ textAlign: "center", color: "var(--gf-ink3)" }}>Cargando…</p>}
          </>
        )}
      </div>
      {open && <ResourceViewer target={open} accent={ACC} newTab={newTab} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--gf-ink2)", font: `500 13px ${font}`, marginTop: 8, minWidth: 0 }}>{children}</div>;
}

/** The button next to Explorar (computer: inside the glass dock; phone: a round glass button) — with the count of new things. */
export function FeedButton({ open, onToggle, count, compact }: { open: boolean; onToggle: () => void; count: number; compact?: boolean }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={FEED_PANEL_ID} aria-label={count ? `Feed, ${count} nuevos` : "Feed"}
      data-mnemo-ui="" data-export-skip="" className={compact ? "gf-glass gf-dockbtn" : "gf-dockbtn"}
      style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: compact ? 44 : 42, padding: compact ? 0 : "0 18px", width: compact ? 44 : undefined,
        borderRadius: 999, cursor: "pointer", border: "none", font: `500 15px ${font}`, color: open ? INK : "var(--gf-ink2)",
        ...(compact ? {} : { background: open ? undefined : "transparent", boxShadow: open ? undefined : "none" }) }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="3.5" width="16" height="7" rx="2.2" /><rect x="4" y="13.5" width="16" height="7" rx="2.2" /></svg>
      {!compact && "Feed"}
      {count > 0 && <span className="gf-badge" style={compact ? { position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, fontSize: 10.5 } : undefined}>{count > 99 ? "99+" : count}</span>}
    </button>
  );
}
