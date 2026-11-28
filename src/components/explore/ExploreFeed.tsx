"use client";
/**
 * Feed (2026-11-28, in Explorar; it used to live on the back of your card):
 * from the cards you keep in favorites — what they wrote on their own walls,
 * what they reposted (posts and resources) and who they added to favorites.
 * /api/feed, newest first, endless scroll.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { FeedItem } from "@/lib/feed";
import type { WallPost } from "@/lib/wall";
import { timeAgo } from "@/lib/comments";
import { PostView, Avatar, RepostGlyph } from "@/components/wall/WallParts";
import { ResourceViewer, thumbOf, type ResourceTarget } from "@/components/wall/Resources";
import { HeartIcon } from "@/components/canvas/StatsRow";
import { togglePostLike, togglePostRepost } from "@/hooks/useWall";
import { useViewerId } from "@/lib/viewer";
import { track } from "@/lib/track";

const ACC = "#FF4F94";
const INK = "#F6F3F8";
const BG = "#100e15";
const font = "var(--font-sans, system-ui), -apple-system, 'Segoe UI', sans-serif";

const keyOf = (it: FeedItem, i: number) => `${it.kind}-${it.at}-${it.post?.id ?? it.resource?.key ?? it.target?.id ?? i}`;

export default function ExploreFeed({ newTab }: { newTab?: boolean }) {
  const viewer = useViewerId();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<ResourceTarget | null>(null);

  const load = useCallback(async (before: string | null) => {
    setBusy(true); setFailed(false);
    try {
      const r = await fetch(`/api/feed${before ? `?before=${encodeURIComponent(before)}` : ""}`, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json() as { items: FeedItem[]; more: boolean; cursor: string | null };
      setItems(prev => (before ? [...(prev ?? []), ...j.items] : j.items));
      setMore(!!j.more); setCursor(j.cursor);
    } catch { setFailed(true); setItems(prev => prev ?? []); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { if (viewer) { load(null); track("feed_open"); } }, [viewer, load]);

  const endRef = useRef<HTMLDivElement>(null);
  const st = useRef({ more, busy, cursor, failed });
  st.current = { more, busy, cursor, failed };
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      const s = st.current;
      if (e.isIntersecting && s.more && !s.busy && !s.failed && s.cursor) load(s.cursor);
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [load, items === null]);

  const patch = (id: string, f: (p: WallPost) => WallPost) => setItems(list => list?.map(it => (it.post?.id === id ? { ...it, post: f(it.post) } : it)) ?? list);
  const like = (p: WallPost) => {
    const flip = (x: WallPost) => ({ ...x, liked: !x.liked, likes: Math.max(0, x.likes + (x.liked ? -1 : 1)) });
    patch(p.id, flip);
    togglePostLike(p.id).then(r => { if (!r) patch(p.id, flip); else patch(p.id, x => ({ ...x, liked: r.liked, likes: r.n })); });
  };
  const repost = (p: WallPost) => {
    const flip = (x: WallPost) => ({ ...x, reposted: !x.reposted, reposts: Math.max(0, (x.reposts ?? 0) + (x.reposted ? -1 : 1)) });
    patch(p.id, flip);
    togglePostRepost(p.id).then(r => { if (!r) patch(p.id, flip); else patch(p.id, x => ({ ...x, reposted: r.reposted, reposts: r.n })); });
  };
  const go = (u: string) => { if (newTab) window.open(u, "_blank"); else location.href = u; };

  if (viewer === null) return <p style={{ color: "rgba(246,243,248,.65)", marginTop: 16 }}>Iniciá sesión para ver lo que publican tus favoritos.</p>;
  if (items === null) return <div style={{ marginTop: 14, display: "grid", gap: 10 }}>{[0, 1, 2].map(i => <div key={i} style={{ height: 86, borderRadius: 16, background: "rgba(255,255,255,.05)" }} />)}</div>;
  return (
    <div style={{ marginTop: 6 }}>
      {items.length === 0 && !failed && (
        <div style={{ display: "grid", placeItems: "center", gap: 10, padding: "48px 12px", color: "rgba(246,243,248,.6)", textAlign: "center" }}>
          <HeartIcon size={28} />
          <span>Dale corazón a las cards que te gustan: lo que publiquen y reposteen aparece acá.</span>
        </div>
      )}
      {items.map((it, i) => {
        const by = it.actor.handle ? `@${it.actor.handle}` : "alguien";
        if (it.post) {
          return (
            <div key={keyOf(it, i)} style={{ borderBottom: "1px solid rgba(255,255,255,.06)", padding: "2px 0 4px" }}>
              {it.kind === "repost_post" && <Meta>{<RepostGlyph />}<span data-no-i18n="">{by} reposteó</span></Meta>}
              <PostView post={it.post} ink={INK} accent={ACC} wallBg={BG} viewer={viewer} newTab={newTab}
                onLike={() => like(it.post!)}
                onRepost={it.post.wallOwner !== viewer ? () => repost(it.post!) : undefined}
                onReply={() => go(`/${it.post!.wallHandle || it.post!.author.handle}?muro=1`)} />
            </div>
          );
        }
        if (it.resource) {
          const r = it.resource;
          return (
            <div key={keyOf(it, i)} style={{ borderBottom: "1px solid rgba(255,255,255,.06)", padding: "10px 0 12px" }}>
              <Meta><RepostGlyph /><span data-no-i18n="">{by} reposteó un recurso de @{r.ownerHandle || "?"}</span><span style={{ marginLeft: "auto", flex: "none" }}>{timeAgo(it.at)}</span></Meta>
              <button type="button" aria-label={`Abrir recurso de @${r.ownerHandle}`}
                onClick={() => { setOpen({ ownerId: r.ownerId, ownerHandle: r.ownerHandle, owner: r.owner, key: r.key, src: r.src }); track("resource_open", { from: "feed" }); }}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 0, border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, overflow: "hidden", cursor: "pointer",
                  background: "repeating-conic-gradient(rgba(255,255,255,.05) 0 25%, transparent 0 50%) 0 0 / 16px 16px" }}>
                <img src={thumbOf(r.src, 480)} alt="" loading="lazy" draggable={false} style={{ display: "block", width: "100%", maxHeight: 340, objectFit: "contain" }} />
              </button>
            </div>
          );
        }
        if (it.target) {
          const t = it.target;
          return (
            <a key={keyOf(it, i)} href={`/${t.handle}`} target={newTab ? "_blank" : undefined} rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,.06)", color: INK, textDecoration: "none" }}>
              <span style={{ position: "relative", flex: "none" }}>
                <Avatar a={t} size={40} />
                <span aria-hidden style={{ position: "absolute", right: -4, bottom: -4, width: 19, height: 19, borderRadius: 99, display: "grid", placeItems: "center", background: ACC, color: "#fff" }}><HeartIcon size={11} filled /></span>
              </span>
              <span style={{ flex: 1, minWidth: 0, font: `500 13.5px ${font}` }} data-no-i18n="">
                <b>{by}</b> agregó a <b>@{t.handle}</b> a favoritos
              </span>
              <span style={{ color: "rgba(246,243,248,.5)", fontSize: 11.5, flex: "none" }}>{timeAgo(it.at)}</span>
            </a>
          );
        }
        return null;
      })}
      <div ref={endRef} aria-hidden style={{ height: 1 }} />
      {failed && <button type="button" onClick={() => load(items.length ? cursor : null)} style={{ display: "block", width: "100%", height: 42, marginTop: 10, borderRadius: 999, border: "none", background: "rgba(255,255,255,.08)", color: INK, cursor: "pointer", font: `600 13px ${font}` }}>Reintentar</button>}
      {busy && items.length > 0 && <p style={{ textAlign: "center", color: "rgba(246,243,248,.5)" }}>Cargando…</p>}
      {open && <ResourceViewer target={open} accent={ACC} newTab={newTab} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(246,243,248,.55)", font: `650 11.5px ${font}`, marginTop: 8, minWidth: 0 }}>{children}</div>;
}
