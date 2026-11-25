"use client";
/**
 * Muro (2026-11-25): the pieces shared by the wall (the back of the card) and
 * "tu celular": a post (its author, the bubble in the author's style, heart /
 * reply / more), the composer with its style picker (fonts, colors, size and
 * the recent looks — previews, not words) and the wall body (list + composer).
 */
import React, { useEffect, useRef, useState } from "react";
import { HeartIcon, CommentIcon } from "@/components/canvas/StatsRow";
import { hexAlpha, timeAgo } from "@/lib/comments";
import { formatViewCount } from "@/lib/profileCardLayout";
import {
  POST_MAX, POST_FONTS, POST_COLORS, POST_BGS, POST_SIZES, postFontFamily, postLength, resolvePostStyle, sameStyle, cleanPostStyle,
  type PostAuthor, type PostStyle, type WallPost,
} from "@/lib/wall";
import { usePostStyle, type WallState } from "@/hooks/useWall";

export const UI_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// ── Icons (24×24, currentColor) ──────────────────────────────────────────────
const svg = (d: React.ReactNode, size = 18, sw = 2) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block", flex: "none" }}>{d}</svg>
);
/** The phone that flips a card to its wall. */
export const PhoneIcon = ({ size = 18 }: { size?: number }) => svg(<><rect x="6.5" y="2.5" width="11" height="19" rx="2.6" /><path d="M10.5 18.2h3" /></>, size);
export const BackIcon = ({ size = 18 }: { size?: number }) => svg(<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>, size);
export const CloseIcon = ({ size = 16 }: { size?: number }) => svg(<path d="M18 6 6 18M6 6l12 12" />, size, 2.2);
export const SendIcon = ({ size = 17 }: { size?: number }) => svg(<path d="M12 19V5M5 12l7-7 7 7" />, size, 2.2);
export const MoreIcon = ({ size = 16 }: { size?: number }) => svg(<><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>, size, 2.4);
export const TrashIcon = ({ size = 15 }: { size?: number }) => svg(<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />, size);
export const FlagIcon = ({ size = 15 }: { size?: number }) => svg(<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>, size);
export const BlockIcon = ({ size = 15 }: { size?: number }) => svg(<><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>, size);
export const GearIcon = ({ size = 17 }: { size?: number }) => svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>, size);
export const ReplyArrow = ({ size = 13 }: { size?: number }) => svg(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 6 6v5" /></>, size);
export const ArrowRight = ({ size = 13 }: { size?: number }) => svg(<path d="M5 12h14M13 6l6 6-6 6" />, size);

export const roundBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", padding: 0,
  border: "none", background: "transparent", cursor: "pointer", color: "inherit",
};

// ── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ a, size = 30, ink }: { a: Pick<PostAuthor, "photo" | "handle" | "pfpRadius" | "bg" | "nameColor">; size?: number; ink?: string }) {
  return (
    <span aria-hidden style={{ width: size, height: size, flex: "none", borderRadius: a.pfpRadius, overflow: "hidden", display: "grid", placeItems: "center",
      background: a.bg, color: a.nameColor, font: `700 ${Math.round(size * 0.42)}px ${UI_FONT}`, boxShadow: ink ? `0 0 0 1px ${hexAlpha(ink, 0.18)}` : undefined }}>
      {a.photo ? <img src={a.photo} alt="" width={size} height={size} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (a.handle || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

// ── One post ─────────────────────────────────────────────────────────────────
export interface PostViewProps {
  post: WallPost;
  ink: string;
  accent: string;
  viewer: string | null | undefined;
  /** I own the wall this post is on (delete anything, block). */
  wallOwner?: boolean;
  newTab?: boolean;
  compact?: boolean;
  onLike: () => void;
  onReply?: () => void;
  /** Replies: count shown on the bubble; toggles the thread. */
  threadOpen?: boolean;
  onThread?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  /** Feed: the wall this was written on (tapping it opens that wall). */
  wallHandle?: string;
}

export function PostView(p: PostViewProps) {
  const { post, ink } = p;
  const st = resolvePostStyle(post.style, post.author);
  const dim = hexAlpha(ink, 0.58);
  const [menu, setMenu] = useState(false);
  const [done, setDone] = useState<null | "report" | "block">(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const off = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    window.addEventListener("pointerdown", off, true);
    return () => window.removeEventListener("pointerdown", off, true);
  }, [menu]);
  const who = post.author.handle ? `@${post.author.handle}` : "alguien";
  const href = post.author.handle ? `/${post.author.handle}` : undefined;
  const mine = !!p.viewer && p.viewer === post.author.id;
  const canDelete = mine || !!p.wallOwner;
  const canReport = !!p.viewer && !mine;
  const canBlock = !!p.wallOwner && !mine;
  const avatar = p.compact ? 24 : 30;

  return (
    <article aria-label={`${who}: ${post.body}`} style={{ display: "flex", gap: 9, padding: p.compact ? "6px 0" : "10px 2px" }}>
      <a href={href} target={p.newTab ? "_blank" : undefined} rel="noreferrer" aria-label={who} tabIndex={-1} style={{ textDecoration: "none" }}>
        <Avatar a={post.author} size={avatar} ink={ink} />
      </a>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, fontSize: 12.5, marginBottom: 4 }}>
          <a href={href} target={p.newTab ? "_blank" : undefined} rel="noreferrer"
            style={{ color: ink, fontWeight: 650, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{who}</a>
          {p.wallHandle && p.wallHandle !== post.author.handle && (
            <a href={`/${p.wallHandle}?muro=1`} aria-label={`en el muro de @${p.wallHandle}`} title={`muro de @${p.wallHandle}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 3, color: dim, textDecoration: "none", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              <ArrowRight size={11} /><span>@{p.wallHandle}</span>
            </a>
          )}
          <span style={{ color: dim, flex: "none" }}>{timeAgo(post.createdAt)}</span>
        </div>
        <div style={{ display: "inline-block", maxWidth: "100%", padding: p.compact ? "7px 11px" : "9px 13px", borderRadius: 16, borderTopLeftRadius: 5,
          background: st.bg, color: st.color, fontFamily: postFontFamily(st.font), fontSize: p.compact ? Math.max(12, st.size - 2) : st.size,
          lineHeight: 1.35, whiteSpace: "pre-wrap", overflowWrap: "anywhere", boxShadow: `0 0 0 1px ${hexAlpha(ink, 0.08)}` }}>
          {post.body}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 3, marginLeft: -6, color: dim, fontSize: 12, fontWeight: 600 }}>
          <button type="button" onClick={p.viewer ? p.onLike : undefined} aria-pressed={post.liked} disabled={!p.viewer}
            aria-label={`${post.liked ? "Quitar me gusta" : "Me gusta"} (${post.likes})`} title={p.viewer ? undefined : "Iniciá sesión"}
            style={{ ...roundBtn, width: "auto", height: 28, padding: "0 6px", gap: 4, display: "flex", color: post.liked ? p.accent : dim, cursor: p.viewer ? "pointer" : "default" }}>
            <HeartIcon size={15} filled={post.liked} />{post.likes > 0 && <span>{formatViewCount(post.likes)}</span>}
          </button>
          {(p.onThread || p.onReply) && (
            <button type="button" onClick={p.onThread ?? p.onReply} aria-expanded={p.onThread ? !!p.threadOpen : undefined}
              aria-label={`Respuestas (${post.replies})`}
              style={{ ...roundBtn, width: "auto", height: 28, padding: "0 6px", gap: 4, display: "flex", color: p.threadOpen ? ink : dim }}>
              <CommentIcon size={15} />{post.replies > 0 && <span>{formatViewCount(post.replies)}</span>}
            </button>
          )}
          {(canDelete || canReport) && (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button type="button" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-label="Más" style={{ ...roundBtn, width: 28, height: 28, color: dim }}>
                <MoreIcon />
              </button>
              {menu && (
                <div role="menu" style={{ position: "absolute", left: 0, bottom: 30, zIndex: 5, display: "flex", gap: 2, padding: 3, borderRadius: 999,
                  background: "#111114", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.12)" }}>
                  {canDelete && <button type="button" role="menuitem" aria-label="Borrar" title="Borrar" onClick={() => { setMenu(false); p.onDelete?.(); }} style={{ ...roundBtn, width: 32, height: 32 }}><TrashIcon /></button>}
                  {canReport && <button type="button" role="menuitem" aria-label="Reportar" title="Reportar" onClick={() => { setMenu(false); p.onReport?.(); setDone("report"); }} style={{ ...roundBtn, width: 32, height: 32 }}><FlagIcon /></button>}
                  {canBlock && <button type="button" role="menuitem" aria-label={`Bloquear a ${who} en mi muro`} title="Bloquear" onClick={() => { setMenu(false); p.onBlock?.(); setDone("block"); }} style={{ ...roundBtn, width: 32, height: 32 }}><BlockIcon /></button>}
                </div>
              )}
            </div>
          )}
          {done && <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: p.accent }}>{done === "report" ? <FlagIcon size={12} /> : <BlockIcon size={12} />}✓</span>}
        </div>
      </div>
    </article>
  );
}

// ── Composer (write with a style) ────────────────────────────────────────────
export function Composer({ ink, accent, onSend, placeholder, replyTo, onCancelReply, autoFocus }: {
  ink: string; accent: string;
  onSend: (body: string, style: PostStyle) => Promise<string | null>;
  placeholder: string;
  replyTo?: PostAuthor | null;
  onCancelReply?: () => void;
  autoFocus?: boolean;
}) {
  const ps = usePostStyle();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const box = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const st = resolvePostStyle(ps.style);
  const len = postLength(text);
  const set = (patch: PostStyle) => ps.setStyle(cleanPostStyle({ ...ps.style, ...patch }));

  useEffect(() => { if (autoFocus || replyTo) input.current?.focus({ preventScroll: true }); }, [autoFocus, replyTo]);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", off, true);
    return () => window.removeEventListener("pointerdown", off, true);
  }, [open]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending || len > POST_MAX) return;
    setSending(true); setErr(null);
    const e = await onSend(body, ps.style);
    setSending(false);
    if (e) { setErr(e); return; }
    setText(""); setOpen(false);
    ps.remember(ps.style);
  };

  const dot = (on: boolean): React.CSSProperties => ({
    width: 24, height: 24, borderRadius: 99, padding: 0, flex: "none", cursor: "pointer",
    border: `2px solid ${on ? ink : "transparent"}`, outline: `1px solid ${hexAlpha(ink, 0.2)}`, outlineOffset: -1,
  });

  return (
    <form ref={box} onSubmit={e => { e.preventDefault(); send(); }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {open && (
        <div role="group" aria-label="Estilo" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 2px 2px" }}>
          {ps.recent.length > 1 && (
            <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
              {ps.recent.map((r, i) => {
                const rs = resolvePostStyle(r);
                return (
                  <button key={i} type="button" aria-label="Estilo reciente" aria-pressed={sameStyle(r, ps.style)} onClick={() => ps.setStyle(r)}
                    style={{ flex: "none", height: 28, padding: "0 10px", borderRadius: 14, borderTopLeftRadius: 4, cursor: "pointer",
                      background: rs.bg, color: rs.color, fontFamily: postFontFamily(rs.font), fontSize: 13,
                      border: `2px solid ${sameStyle(r, ps.style) ? ink : hexAlpha(ink, 0.15)}` }}>Aa</button>
                );
              })}
            </div>
          )}
          <div role="radiogroup" aria-label="Fuente" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {POST_FONTS.map(f => (
              <button key={f} type="button" role="radio" aria-checked={st.font === f} aria-label={f} title={f} onClick={() => set({ font: f })}
                style={{ flex: "none", height: 30, minWidth: 38, padding: "0 9px", borderRadius: 9, cursor: "pointer", fontFamily: postFontFamily(f), fontSize: 15,
                  color: ink, background: st.font === f ? hexAlpha(ink, 0.16) : hexAlpha(ink, 0.05), border: `1px solid ${st.font === f ? hexAlpha(ink, 0.5) : "transparent"}` }}>Aa</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden style={{ width: 18, textAlign: "center", fontWeight: 800, color: ink, flex: "none" }}>A</span>
            <div role="radiogroup" aria-label="Color del texto" style={{ display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none" }}>
              {POST_COLORS.map(c => <button key={c} type="button" role="radio" aria-checked={st.color === c} aria-label={c} onClick={() => set({ color: c })} style={{ ...dot(st.color === c), background: c }} />)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden style={{ width: 18, height: 14, borderRadius: 7, borderTopLeftRadius: 2, background: hexAlpha(ink, 0.7), flex: "none" }} />
            <div role="radiogroup" aria-label="Color del globo" style={{ display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none" }}>
              {POST_BGS.map(c => <button key={c} type="button" role="radio" aria-checked={st.bg === c} aria-label={c} onClick={() => set({ bg: c })} style={{ ...dot(st.bg === c), background: c }} />)}
            </div>
          </div>
          <div role="radiogroup" aria-label="Tamaño" style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
            {POST_SIZES.map(s => (
              <button key={s} type="button" role="radio" aria-checked={st.size === s} aria-label={`${s} px`} onClick={() => set({ size: s })}
                style={{ width: 34, height: 30, borderRadius: 9, cursor: "pointer", color: ink, fontWeight: 700, fontSize: s, lineHeight: 1,
                  background: st.size === s ? hexAlpha(ink, 0.16) : hexAlpha(ink, 0.05), border: `1px solid ${st.size === s ? hexAlpha(ink, 0.5) : "transparent"}` }}>A</button>
            ))}
          </div>
        </div>
      )}
      {replyTo && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: hexAlpha(ink, 0.7), fontSize: 12.5 }}>
          <ReplyArrow /><Avatar a={replyTo} size={18} /><span style={{ fontWeight: 650 }}>@{replyTo.handle}</span>
          <button type="button" onClick={onCancelReply} aria-label="No responder" style={{ ...roundBtn, width: 22, height: 22 }}><CloseIcon size={12} /></button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <textarea ref={input} value={text} rows={1} placeholder={placeholder} aria-label={placeholder}
            onFocus={() => setOpen(true)}
            onChange={e => { setText(e.target.value.replace(/\n{3,}/g, "\n\n")); setErr(null); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); send(); } }}
            style={{ width: "100%", boxSizing: "border-box", resize: "none", minHeight: 42, maxHeight: 120, padding: "10px 14px", paddingRight: len > POST_MAX - 40 ? 44 : 14,
              borderRadius: 18, borderTopLeftRadius: 6, border: `1px solid ${hexAlpha(ink, 0.18)}`, background: st.bg, color: st.color,
              fontFamily: postFontFamily(st.font), fontSize: Math.max(16, st.size), lineHeight: 1.3, outline: "none", fieldSizing: "content" } as React.CSSProperties} />
          {len > POST_MAX - 40 && (
            <span aria-live="polite" style={{ position: "absolute", right: 12, bottom: 12, fontSize: 11, fontWeight: 700, color: len > POST_MAX ? "#ff453a" : hexAlpha(st.color, 0.6), pointerEvents: "none" }}>
              {POST_MAX - len}
            </span>
          )}
        </div>
        <button type="submit" disabled={!text.trim() || sending || len > POST_MAX} aria-label="Enviar"
          style={{ ...roundBtn, width: 42, height: 42, flex: "none", background: accent, color: "#fff", opacity: !text.trim() || sending || len > POST_MAX ? 0.4 : 1 }}>
          <SendIcon />
        </button>
      </div>
      {err && <p role="status" style={{ margin: "0 6px", fontSize: 12, color: accent }}>{err}</p>}
    </form>
  );
}

// ── Wall body (posts + composer) ─────────────────────────────────────────────
export function WallBody({ w, ink, accent, ownerHandle, newTab, loginHref }: {
  w: WallState; ink: string; accent: string; ownerHandle?: string; newTab?: boolean; loginHref: string;
}) {
  const [thread, setThread] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<WallPost | null>(null);
  const dim = hexAlpha(ink, 0.58);
  const toggleThread = (post: WallPost) => {
    const opening = thread !== post.id;
    setThread(opening ? post.id : null);
    if (opening && !w.replies[post.id]) w.loadReplies(post.id);
    setReplyTo(opening && w.canWrite ? post : null);
  };
  return (
    <>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 14px 8px", overscrollBehavior: "contain" }}>
        {!w.loaded && <div aria-label="Cargando" style={{ display: "grid", placeItems: "center", padding: 40, color: dim }}><PhoneIcon size={26} /></div>}
        {w.loaded && w.posts.length === 0 && (
          <div style={{ display: "grid", placeItems: "center", gap: 10, padding: "56px 16px", color: dim }}>
            <span style={{ display: "flex", gap: 6, opacity: 0.8 }}>
              <span style={{ width: 54, height: 22, borderRadius: 11, borderTopLeftRadius: 4, background: hexAlpha(ink, 0.12) }} />
              <span style={{ width: 30, height: 22, borderRadius: 11, borderTopLeftRadius: 4, background: hexAlpha(ink, 0.08) }} />
            </span>
            <span style={{ width: 80, height: 22, borderRadius: 11, borderTopLeftRadius: 4, background: hexAlpha(ink, 0.06) }} />
          </div>
        )}
        {w.posts.map(post => (
          <div key={post.id}>
            <PostView post={post} ink={ink} accent={accent} viewer={w.viewer} wallOwner={w.isOwner} newTab={newTab}
              onLike={() => w.like(post.id)}
              threadOpen={thread === post.id} onThread={() => toggleThread(post)}
              onDelete={() => w.remove(post.id)} onReport={() => w.report(post.id)} onBlock={() => w.block(post.author.id)} />
            {thread === post.id && (
              <div style={{ marginLeft: 38, paddingLeft: 10, borderLeft: `2px solid ${hexAlpha(ink, 0.12)}` }}>
                {(w.replies[post.id] ?? []).map(r => (
                  <PostView key={r.id} post={r} compact ink={ink} accent={accent} viewer={w.viewer} wallOwner={w.isOwner} newTab={newTab}
                    onLike={() => w.like(r.id)} onDelete={() => w.remove(r.id)} onReport={() => w.report(r.id)} onBlock={() => w.block(r.author.id)} />
                ))}
              </div>
            )}
          </div>
        ))}
        {w.more && (
          <button type="button" onClick={w.loadMore} aria-label="Ver más"
            style={{ display: "block", margin: "6px auto 10px", padding: "6px 18px", borderRadius: 999, border: `1px solid ${hexAlpha(ink, 0.14)}`, background: "transparent", color: dim, cursor: "pointer" }}>
            <MoreIcon />
          </button>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${hexAlpha(ink, 0.1)}`, padding: "10px 12px calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        {w.viewer === null ? (
          <a href={loginHref} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 999, background: accent, color: "#fff", fontWeight: 650, textDecoration: "none" }}>
            <PhoneIcon size={16} /> Iniciá sesión para escribir
          </a>
        ) : w.viewer && !w.canWrite ? (
          <p aria-label="Muro cerrado" style={{ margin: 4, display: "flex", justifyContent: "center", color: dim }}><BlockIcon size={18} /></p>
        ) : w.viewer ? (
          <Composer ink={ink} accent={accent}
            placeholder={replyTo ? `Responder a @${replyTo.author.handle}` : w.isOwner ? "¿Qué estás pensando?" : `Escribile a @${ownerHandle ?? ""}`}
            replyTo={replyTo?.author ?? null} onCancelReply={() => setReplyTo(null)}
            onSend={async (body, style) => {
              const e = await w.post(body, style, replyTo?.id ?? null);
              if (!e && replyTo) { setThread(replyTo.id); setReplyTo(null); }
              return e;
            }} />
        ) : null}
      </div>
    </>
  );
}
