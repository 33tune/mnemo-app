"use client";
/**
 * Comentarios (2026-11-17): the panel with a profile's comments. On the
 * public profile it opens from the bubble by the heart; in the editor, from
 * the bubble at the start of the bottom bar (with a blinking dot when there
 * are new ones). Signed in to comment (150 characters); the author's @ and
 * photo are shown. The owner deletes any and gives a heart to each; an author
 * deletes theirs. Its look (card.commentsBox) is minimal: roundness, colors,
 * opacity — edited in its own panel (CommentsInspector, the gear here).
 */
import React, { useEffect, useRef, useState } from "react";
import type { CommentsBoxStyle } from "@/types";
import { useComments } from "@/hooks/useComments";
import { COMMENT_MAX, resolveCommentsBox, hexAlpha, timeAgo } from "@/lib/comments";
import { CommentIcon, HeartIcon } from "./StatsRow";
import { formatViewCount } from "@/lib/profileCardLayout";

export const COMMENTS_STYLE_PANEL_ID = "mnemo-comments-style";
export const COMMENTS_BUTTON_ID = "mnemo-comments-btn";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const BLINK_CSS = `@keyframes mnemo-comment-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.7)}}
@media (prefers-reduced-motion: reduce){[data-comment-dot]{animation:none!important}}`;

/** The round bubble button (by the heart on a profile; in the editor's bar). */
export function CommentsButton({ count, unread, open, onClick, size = 44, id }: {
  count: number; unread?: boolean; open?: boolean; onClick: () => void; size?: number; id?: string;
}) {
  return (
    <>
      <style>{BLINK_CSS}</style>
      <button type="button" id={id} onClick={onClick} aria-expanded={!!open}
        aria-label={`Comentarios (${count})${unread ? ", hay nuevos" : ""}`} title="Comentarios"
        style={{ position: "relative", height: size, minWidth: size, padding: count ? "0 14px 0 12px" : 0, borderRadius: 999,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          border: "1px solid rgba(255,255,255,0.18)", background: open ? "rgba(255,255,255,0.22)" : "rgba(14,14,18,0.6)", color: "#fff",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", cursor: "pointer", font: `600 14px ${FONT}` }}>
        <CommentIcon size={18} />
        {count > 0 && <span>{formatViewCount(count)}</span>}
        {unread && (
          <span data-comment-dot="" aria-hidden style={{ position: "absolute", top: 2, right: 2, width: 11, height: 11, borderRadius: 99,
            background: "#ff4fa3", boxShadow: "0 0 0 2px rgba(14,12,18,.92)", animation: "mnemo-comment-dot 1.1s ease-in-out infinite" }} />
        )}
      </button>
    </>
  );
}

export interface CommentsPanelProps {
  ownerUserId?: string;
  ownerHandle?: string;
  style?: CommentsBoxStyle;
  count: number;
  onClose: () => void;
  /** Px kept free on the right (the editor's dock) and at the bottom (buttons). */
  right?: number;
  bottom?: number;
  /** Editor: the gear that opens the look panel. */
  onSettings?: () => void;
  settingsOpen?: boolean;
  /** The editor opens profiles in a new tab. */
  newTab?: boolean;
}

export default function CommentsPanel(p: CommentsPanelProps) {
  const c = useComments(p.ownerUserId, true);
  const st = resolveCommentsBox(p.style);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)");
    const on = () => setNarrow(m.matches);
    on(); m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && panel.current?.contains(document.activeElement ?? null)) p.onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [p]);
  useEffect(() => { panel.current?.focus({ preventScroll: true }); }, []);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setErr(null);
    const e = await c.post(body);
    setSending(false);
    if (e) setErr(e); else setText("");
  };

  const ink = st.color;
  const dim = hexAlpha(ink, 0.6);
  const line = hexAlpha(ink, 0.1);
  const glass = st.opacity < 1;
  const box: React.CSSProperties = narrow
    ? { left: 0, right: 0, bottom: 0, height: "min(74dvh, 640px)", borderRadius: `${st.radius}px ${st.radius}px 0 0` }
    : { right: (p.right ?? 0) + 16, bottom: (p.bottom ?? 0) + 16, top: 16, width: 360, borderRadius: st.radius };

  return (
    <div ref={panel} tabIndex={-1} data-mnemo-ui="" data-export-skip="" role="dialog" aria-label="Comentarios"
      onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
      style={{ position: "fixed", zIndex: 2147481500, display: "flex", flexDirection: "column", boxSizing: "border-box", outline: "none",
        background: hexAlpha(st.bg, st.opacity), color: ink, font: `500 14px ${FONT}`,
        border: `1px solid ${hexAlpha(ink, 0.12)}`, boxShadow: "0 24px 60px rgba(0,0,0,.4)",
        backdropFilter: glass ? "blur(22px) saturate(140%)" : undefined, WebkitBackdropFilter: glass ? "blur(22px) saturate(140%)" : undefined,
        overflow: "hidden", ...box }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 12px 10px 18px", borderBottom: `1px solid ${line}` }}>
        <CommentIcon size={18} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>Comentarios</span>
        <span style={{ color: dim, fontWeight: 600 }}>{formatViewCount(p.count)}</span>
        <span style={{ flex: 1 }} />
        {p.onSettings && (
          <button type="button" onClick={p.onSettings} aria-label="Estilo de los comentarios" aria-expanded={!!p.settingsOpen} title="Estilo"
            style={{ ...roundBtn, color: ink, background: p.settingsOpen ? hexAlpha(ink, 0.16) : "transparent" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
          </button>
        )}
        <button type="button" onClick={p.onClose} aria-label="Cerrar comentarios" title="Cerrar" style={{ ...roundBtn, color: ink }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", overscrollBehavior: "contain" }}>
        {!c.loaded && <p style={{ margin: 16, color: dim }}>Cargando…</p>}
        {c.loaded && c.items.length === 0 && (
          <div style={{ display: "grid", placeItems: "center", gap: 8, padding: "48px 16px", color: dim, textAlign: "center" }}>
            <CommentIcon size={30} />
            <span>{c.off ? "Sin comentarios" : "Sé el primero en comentar"}</span>
          </div>
        )}
        <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {c.items.map(it => {
            const mine = !!c.viewer && c.viewer === it.authorId;
            const canDelete = c.isOwner || mine;
            const who = it.handle ? `@${it.handle}` : "alguien";
            return (
              <li key={it.id} className="mnemo-comment" style={{ display: "flex", gap: 10, padding: "10px 8px", borderRadius: 12 }}>
                <a href={it.handle ? `/${it.handle}` : undefined} target={p.newTab ? "_blank" : undefined} rel="noreferrer" aria-label={who}
                  style={{ width: 34, height: 34, flex: "none", borderRadius: it.pfpRadius, overflow: "hidden", background: hexAlpha(ink, 0.12), display: "grid", placeItems: "center", color: dim }}>
                  {it.photo ? <img src={it.photo} alt="" width={34} height={34} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontWeight: 700 }}>{(it.handle || "?").slice(0, 1).toUpperCase()}</span>}
                </a>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
                    <a href={it.handle ? `/${it.handle}` : undefined} target={p.newTab ? "_blank" : undefined} rel="noreferrer"
                      style={{ color: ink, fontWeight: 650, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{who}</a>
                    <span style={{ color: dim, fontSize: 12, flex: "none" }}>{timeAgo(it.createdAt)}</span>
                  </div>
                  <p style={{ margin: "2px 0 0", lineHeight: 1.38, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{it.body}</p>
                  {!c.isOwner && it.ownerLiked && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, color: st.accent, fontSize: 12, fontWeight: 600 }}>
                      <HeartIcon size={12} filled /> {p.ownerHandle ? `a @${p.ownerHandle} le gustó` : "le gustó al dueño"}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: "none" }}>
                  {c.isOwner && (
                    <button type="button" onClick={() => c.like(it.id, !it.ownerLiked)} aria-pressed={it.ownerLiked}
                      aria-label={it.ownerLiked ? `Sacar corazón al comentario de ${who}` : `Dar corazón al comentario de ${who}`}
                      style={{ ...roundBtn, width: 30, height: 30, color: it.ownerLiked ? st.accent : dim }}>
                      <HeartIcon size={15} filled={it.ownerLiked} />
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" className="mnemo-comment__del" onClick={() => c.remove(it.id)} aria-label={`Borrar el comentario de ${who}`} title="Borrar"
                      style={{ ...roundBtn, width: 30, height: 30, color: dim }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {c.more && (
          <button type="button" onClick={c.loadMore} style={{ display: "block", margin: "6px auto 10px", padding: "6px 14px", borderRadius: 999, border: `1px solid ${line}`, background: "transparent", color: dim, font: "inherit", cursor: "pointer" }}>
            Ver más
          </button>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${line}`, padding: "10px 12px calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        {c.off ? (
          <p style={{ margin: "4px 6px", color: dim, textAlign: "center" }}>Los comentarios están apagados</p>
        ) : c.signedOut ? (
          <a href={`/login?next=${typeof location !== "undefined" ? encodeURIComponent(location.pathname) : "/"}`}
            style={{ display: "block", textAlign: "center", padding: "10px", borderRadius: 999, background: st.accent, color: "#fff", fontWeight: 650, textDecoration: "none" }}>
            Iniciá sesión para comentar
          </a>
        ) : (
          <form onSubmit={e => { e.preventDefault(); send(); }} style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <textarea ref={input} value={text} rows={1} maxLength={COMMENT_MAX} placeholder="Escribí un comentario…" aria-label="Escribí un comentario"
                onChange={e => { setText(e.target.value.replace(/\n{3,}/g, "\n\n")); setErr(null); }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                style={{ width: "100%", boxSizing: "border-box", resize: "none", minHeight: 40, maxHeight: 96, padding: "10px 44px 10px 14px", borderRadius: 20,
                  border: `1px solid ${hexAlpha(ink, 0.16)}`, background: hexAlpha(ink, 0.06), color: ink, font: "inherit", outline: "none", fieldSizing: "content" } as React.CSSProperties} />
              <span aria-live="polite" style={{ position: "absolute", right: 12, bottom: 11, fontSize: 11, color: text.length > COMMENT_MAX - 20 ? st.accent : dim, pointerEvents: "none" }}>
                {text.length ? COMMENT_MAX - text.length : ""}
              </span>
            </div>
            <button type="submit" disabled={!text.trim() || sending} aria-label="Enviar comentario"
              style={{ ...roundBtn, width: 40, height: 40, flex: "none", background: st.accent, color: "#fff", opacity: !text.trim() || sending ? 0.45 : 1 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
          </form>
        )}
        {err && <p role="status" style={{ margin: "6px 8px 0", fontSize: 12, color: st.accent }}>{err}</p>}
      </div>
    </div>
  );
}

const roundBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", padding: 0,
  border: "none", background: "transparent", cursor: "pointer",
};
