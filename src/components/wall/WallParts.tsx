"use client";
/**
 * Muro (2026-11-25, v2 2026-11-26): the pieces of the wall (the back of the
 * card): a post (author, the bubble in the author's style — contrast fixed
 * automatically —, heart / reply / more, pinned), the composer (a compact bar:
 * font picker with search, text color, bubble color, size, animation, recent
 * looks — previews, not words) and the wall body (list + composer).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HeartIcon, CommentIcon } from "@/components/canvas/StatsRow";
import { hexAlpha, timeAgo } from "@/lib/comments";
import { formatViewCount } from "@/lib/profileCardLayout";
import { CANVAS_FONTS } from "@/lib/fontList";
import {
  POST_MAX, POST_COLORS, POST_BGS, POST_SIZES, POST_FX, postFontFamily, postLength, resolvePostStyle, sameStyle, cleanPostStyle, bubbleNeedsEdge,
  type PostAuthor, type PostStyle, type WallPost, type PostFx,
} from "@/lib/wall";
import { usePostStyle, type WallState } from "@/hooks/useWall";
import { PostText, FX_LABEL, useCss as usePostCss } from "./PostText";

export const UI_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// ── Icons (24×24, currentColor) ──────────────────────────────────────────────
const svg = (d: React.ReactNode, size = 18, sw = 2) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block", flex: "none" }}>{d}</svg>
);
/** Two speech bubbles: the wall (the button on the card, the wall tab). */
export const WallIcon = ({ size = 18 }: { size?: number }) => svg(<><path d="M14 9.5c0 3-2.7 5.3-6 5.3-.8 0-1.6-.1-2.3-.4L3 15.5l.9-2.6A5 5 0 0 1 2 9.5c0-3 2.7-5.3 6-5.3s6 2.4 6 5.3Z" /><path d="M10.5 17.6c.9.5 2 .8 3.2.8.8 0 1.6-.1 2.3-.4l2.7 1.1-.9-2.6A5 5 0 0 0 20 13c0-1.6-.8-3-2-4" /></>, size);
export const BackIcon = ({ size = 18 }: { size?: number }) => svg(<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>, size);
export const CloseIcon = ({ size = 16 }: { size?: number }) => svg(<path d="M18 6 6 18M6 6l12 12" />, size, 2.2);
export const SendIcon = ({ size = 17 }: { size?: number }) => svg(<path d="M12 19V5M5 12l7-7 7 7" />, size, 2.2);
export const MoreIcon = ({ size = 16 }: { size?: number }) => svg(<><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>, size, 2.4);
export const TrashIcon = ({ size = 15 }: { size?: number }) => svg(<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />, size);
export const FlagIcon = ({ size = 15 }: { size?: number }) => svg(<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>, size);
export const BlockIcon = ({ size = 15 }: { size?: number }) => svg(<><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>, size);
export const PinIcon = ({ size = 15 }: { size?: number }) => svg(<><path d="M9 4h6l-1 5 3 3H7l3-3z" /><path d="M12 15v6" /></>, size);
export const ReplyArrow = ({ size = 13 }: { size?: number }) => svg(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 6 6v5" /></>, size);
export const FeedIcon = ({ size = 18 }: { size?: number }) => svg(<><rect x="4" y="3.5" width="16" height="7" rx="2.2" /><rect x="4" y="13.5" width="16" height="7" rx="2.2" /></>, size);
export const BellIcon = ({ size = 18 }: { size?: number }) => svg(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" /></>, size);
export const SparkIcon = ({ size = 16 }: { size?: number }) => svg(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />, size);

export const roundBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", padding: 0,
  border: "none", background: "transparent", cursor: "pointer", color: "inherit",
};

// ── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ a, size = 30, ink, round }: { a: Pick<PostAuthor, "photo" | "handle" | "pfpRadius" | "bg" | "nameColor">; size?: number; ink?: string; round?: boolean }) {
  return (
    <span aria-hidden style={{ width: size, height: size, flex: "none", borderRadius: round ? "50%" : a.pfpRadius, overflow: "hidden", display: "grid", placeItems: "center",
      background: a.bg, color: a.nameColor, font: `700 ${Math.round(size * 0.42)}px ${UI_FONT}`, textDecoration: "none", boxShadow: ink ? `0 0 0 1px ${hexAlpha(ink, 0.18)}` : undefined }}>
      {a.photo ? <img src={a.photo} alt="" width={size} height={size} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (a.handle || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

// ── One post ─────────────────────────────────────────────────────────────────
export interface PostViewProps {
  post: WallPost;
  ink: string;
  accent: string;
  /** The wall's background (the bubble gets an outline when it melts into it). */
  wallBg: string;
  viewer: string | null | undefined;
  wallOwner?: boolean;
  newTab?: boolean;
  compact?: boolean;
  onLike: () => void;
  onReply?: () => void;
  threadOpen?: boolean;
  onThread?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  onPin?: () => void;
}

export function PostView(p: PostViewProps) {
  const { post, ink } = p;
  const st = resolvePostStyle(post.style, post.author);
  const dim = hexAlpha(ink, 0.62);
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
  const canPin = !!p.wallOwner && !post.parentId && !!p.onPin;
  const avatar = p.compact ? 24 : 30;
  const lastTap = useRef(0);

  return (
    <article aria-label={`${who}: ${post.body}`} style={{ display: "flex", gap: 9, padding: p.compact ? "6px 0" : "10px 2px" }}>
      <a href={href} target={p.newTab ? "_blank" : undefined} rel="noreferrer" aria-label={who} tabIndex={-1} style={{ textDecoration: "none" }}>
        <Avatar a={post.author} size={avatar} ink={ink} />
      </a>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, fontSize: 12.5, marginBottom: 4 }}>
          <a href={href} target={p.newTab ? "_blank" : undefined} rel="noreferrer"
            style={{ color: ink, fontWeight: 650, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{who}</a>
          <span style={{ color: dim, flex: "none" }}>{timeAgo(post.createdAt)}</span>
          {post.pinned && <span aria-label="Fijado" title="Fijado" style={{ color: p.accent, display: "flex" }}><PinIcon size={13} /></span>}
        </div>
        <div
          // Double tap = like (phones).
          onPointerUp={e => {
            if (e.pointerType !== "touch" || !p.viewer) return;
            const now = Date.now();
            if (now - lastTap.current < 320) { if (!post.liked) p.onLike(); lastTap.current = 0; } else lastTap.current = now;
          }}
          style={{ display: "inline-block", maxWidth: "100%", padding: p.compact ? "7px 11px" : "9px 13px", borderRadius: 16, borderTopLeftRadius: 5,
            background: st.bg, color: st.color, fontFamily: postFontFamily(st.font), fontSize: p.compact ? Math.max(12, st.size - 2) : st.size,
            lineHeight: 1.35, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
            boxShadow: bubbleNeedsEdge(st.bg, p.wallBg) ? `inset 0 0 0 1px ${hexAlpha(st.color, 0.35)}` : undefined }}>
          <PostText text={post.body} fx={st.fx} color={st.color} />
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
          {(canDelete || canReport || canPin) && (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button type="button" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-label="Más" style={{ ...roundBtn, width: 28, height: 28, color: dim }}>
                <MoreIcon />
              </button>
              {menu && (
                <div role="menu" style={{ position: "absolute", left: 0, bottom: 30, zIndex: 5, display: "flex", gap: 2, padding: 3, borderRadius: 999,
                  background: "#111114", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.12)" }}>
                  {canPin && <button type="button" role="menuitem" aria-label={post.pinned ? "Soltar" : "Fijar arriba"} title={post.pinned ? "Soltar" : "Fijar"} onClick={() => { setMenu(false); p.onPin?.(); }} style={{ ...roundBtn, width: 32, height: 32, color: post.pinned ? p.accent : "#fff" }}><PinIcon /></button>}
                  {canDelete && <button type="button" role="menuitem" aria-label="Borrar" title="Borrar" onClick={() => { setMenu(false); p.onDelete?.(); }} style={{ ...roundBtn, width: 32, height: 32 }}><TrashIcon /></button>}
                  {canReport && <button type="button" role="menuitem" aria-label="Reportar" title="Reportar" onClick={() => { setMenu(false); p.onReport?.(); setDone("report"); }} style={{ ...roundBtn, width: 32, height: 32 }}><FlagIcon /></button>}
                  {canBlock && <button type="button" role="menuitem" aria-label={`Bloquear a ${who} en mi muro`} title="Bloquear" onClick={() => { setMenu(false); p.onBlock?.(); setDone("block"); }} style={{ ...roundBtn, width: 32, height: 32 }}><BlockIcon /></button>}
                </div>
              )}
            </div>
          )}
          {done && <span role="status" aria-label={done === "report" ? "Reportado" : "Bloqueado"} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: p.accent }}>{done === "report" ? <FlagIcon size={12} /> : <BlockIcon size={12} />}</span>}
        </div>
      </div>
    </article>
  );
}

// ── Popover (anchored above a button, portaled so the card's layers never clip it) ──
function Pop({ anchor, onClose, children, width = 260 }: { anchor: HTMLElement | null; onClose: () => void; children: React.ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.left + r.width / 2 - width / 2));
    setPos({ left, top: r.top - 8 });
    const off = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("pointerdown", off, true);
    window.addEventListener("keydown", esc, true);
    return () => { window.removeEventListener("pointerdown", off, true); window.removeEventListener("keydown", esc, true); };
  }, [anchor, onClose, width]);
  if (!pos || typeof document === "undefined") return null;
  return createPortal(
    <div ref={ref} data-mnemo-ui="" onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
      style={{ position: "fixed", left: pos.left, top: pos.top, transform: "translateY(-100%)", width, zIndex: 2147483000,
        background: "#141318", color: "#f4f2f7", borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 18px 50px rgba(0,0,0,.5)",
        padding: 10, font: `500 13px ${UI_FONT}` }}>
      {children}
    </div>, document.body);
}

function FontPicker({ value, onPick, sample }: { value: string; onPick: (f: string) => void; sample: string }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return CANVAS_FONTS.filter(f => /^[A-Za-z0-9 ]{1,40}$/.test(f.key) && (!n || f.label.toLowerCase().includes(n)));
  }, [q]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar fuente" aria-label="Buscar fuente"
        style={{ height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", padding: "0 12px", font: `500 16px ${UI_FONT}`, outline: "none" }} />
      <div role="listbox" aria-label="Fuente" style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, overscrollBehavior: "contain" }}>
        {list.map(f => (
          <button key={f.key} type="button" role="option" aria-selected={f.key === value} onClick={() => onPick(f.key)}
            style={{ flex: "none", display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer", color: "#fff",
              background: f.key === value ? "rgba(255,255,255,.14)" : "transparent", fontFamily: f.style, fontSize: 17, lineHeight: 1.2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", padding: "2px 0" }}>{sample || f.label}</span>
            {sample && <span style={{ display: "block", font: `500 11px ${UI_FONT}`, color: "rgba(255,255,255,.5)", marginTop: 2 }}>{f.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatches({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
      {colors.map(c => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} onClick={() => onPick(c)}
          style={{ aspectRatio: "1", borderRadius: 99, padding: 0, cursor: "pointer", background: c,
            border: `2px solid ${value === c ? "#fff" : "transparent"}`, outline: "1px solid rgba(255,255,255,.2)", outlineOffset: -1 }} />
      ))}
      <label aria-label={`${label}: otro`} title="Otro" style={{ aspectRatio: "1", borderRadius: 99, cursor: "pointer", position: "relative", overflow: "hidden",
        background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)", outline: "1px solid rgba(255,255,255,.2)", outlineOffset: -1 }}>
        <input type="color" value={value} onChange={e => onPick(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
      </label>
    </div>
  );
}

/** A tiny live preview of each animation on "Aa". */
function FxGrid({ value, onPick, color }: { value?: PostFx; onPick: (f?: PostFx) => void; color: string }) {
  const cell = (on: boolean): React.CSSProperties => ({ height: 50, borderRadius: 12, cursor: "pointer", display: "grid", placeItems: "center", gap: 0,
    border: `2px solid ${on ? "#fff" : "transparent"}`, background: "rgba(255,255,255,.06)", color, fontSize: 18, fontWeight: 700, padding: 0 });
  return (
    <div role="radiogroup" aria-label="Animación del texto" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
      <button type="button" role="radio" aria-checked={!value} aria-label="Sin animación" title="Sin animación" onClick={() => onPick(undefined)} style={cell(!value)}>Aa</button>
      {POST_FX.map(f => (
        <button key={f} type="button" role="radio" aria-checked={value === f} aria-label={FX_LABEL[f]} title={FX_LABEL[f]} onClick={() => onPick(f)} style={cell(value === f)}>
          <PostText text="Aa" fx={f} color={color} />
        </button>
      ))}
    </div>
  );
}

// ── Composer (write with a style) ────────────────────────────────────────────
export function Composer({ ink, accent, onSend, placeholder, replyTo, onCancelReply, autoFocus, wallBg }: {
  ink: string; accent: string; wallBg: string;
  onSend: (body: string, style: PostStyle) => Promise<string | null>;
  placeholder: string;
  replyTo?: PostAuthor | null;
  onCancelReply?: () => void;
  autoFocus?: boolean;
}) {
  usePostCss();
  const ps = usePostStyle();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [pop, setPop] = useState<null | { kind: "font" | "color" | "bg" | "fx"; el: HTMLElement }>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const box = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const st = resolvePostStyle(ps.style);
  const len = postLength(text);
  const set = (patch: PostStyle) => ps.setStyle(cleanPostStyle({ ...ps.style, ...patch }));
  const togglePop = (kind: "font" | "color" | "bg" | "fx", el: HTMLElement) => setPop(p => (p?.kind === kind ? null : { kind, el }));

  useEffect(() => { if (autoFocus || replyTo) input.current?.focus({ preventScroll: true }); }, [autoFocus, replyTo]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending || len > POST_MAX) return;
    setSending(true); setErr(null);
    const e = await onSend(body, ps.style);
    setSending(false);
    if (e) { setErr(e); return; }
    setText(""); setOpen(false); setPop(null);
    ps.remember(ps.style);
  };

  const tool = (on: boolean): React.CSSProperties => ({
    height: 32, minWidth: 32, padding: "0 8px", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    border: "none", cursor: "pointer", color: ink, background: on ? hexAlpha(ink, 0.18) : hexAlpha(ink, 0.07),
  });
  const fontLabel = CANVAS_FONTS.find(f => f.key === st.font)?.label ?? st.font;

  return (
    <form ref={box} onSubmit={e => { e.preventDefault(); send(); }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {replyTo && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: hexAlpha(ink, 0.7), fontSize: 12.5 }}>
          <ReplyArrow /><Avatar a={replyTo} size={18} /><span style={{ fontWeight: 650 }}>@{replyTo.handle}</span>
          <button type="button" onClick={onCancelReply} aria-label="No responder" style={{ ...roundBtn, width: 22, height: 22 }}><CloseIcon size={12} /></button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <textarea ref={input} value={text} rows={1} placeholder={placeholder} aria-label={placeholder} className="mnw-ta"
            onFocus={() => setOpen(true)}
            onChange={e => { setText(e.target.value.replace(/\n{3,}/g, "\n\n")); setErr(null); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); send(); } }}
            style={{ width: "100%", boxSizing: "border-box", resize: "none", minHeight: 42, maxHeight: 120, padding: "10px 14px", paddingRight: len > POST_MAX - 40 ? 44 : 14,
              borderRadius: 18, borderTopLeftRadius: 6, border: `1px solid ${hexAlpha(ink, bubbleNeedsEdge(st.bg, wallBg) ? 0.35 : 0.14)}`, background: st.bg, color: st.color,
              fontFamily: postFontFamily(st.font), fontSize: Math.max(16, st.size), lineHeight: 1.3, outline: "none", fieldSizing: "content",
              ["--ph" as string]: hexAlpha(st.color, 0.5) } as React.CSSProperties} />
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
      {open && (
        <div role="toolbar" aria-label="Estilo" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button type="button" aria-label={`Fuente: ${fontLabel}`} aria-expanded={pop?.kind === "font"} onClick={e => togglePop("font", e.currentTarget)}
            style={{ ...tool(pop?.kind === "font"), fontFamily: postFontFamily(st.font), fontSize: 15, maxWidth: 120 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fontLabel}</span>
          </button>
          <button type="button" aria-label="Color del texto" aria-expanded={pop?.kind === "color"} onClick={e => togglePop("color", e.currentTarget)} style={tool(pop?.kind === "color")}>
            <span aria-hidden style={{ fontWeight: 800, color: st.color, textShadow: `0 0 0 ${st.color}`, borderBottom: `3px solid ${st.color}`, lineHeight: 1 }}>A</span>
          </button>
          <button type="button" aria-label="Color del globo" aria-expanded={pop?.kind === "bg"} onClick={e => togglePop("bg", e.currentTarget)} style={tool(pop?.kind === "bg")}>
            <span aria-hidden style={{ width: 18, height: 14, borderRadius: 7, borderTopLeftRadius: 2, background: st.bg, boxShadow: `0 0 0 1px ${hexAlpha(ink, 0.4)}` }} />
          </button>
          <div role="radiogroup" aria-label="Tamaño" style={{ display: "flex", gap: 2, padding: 2, borderRadius: 10, background: hexAlpha(ink, 0.07) }}>
            {POST_SIZES.map(s => (
              <button key={s} type="button" role="radio" aria-checked={st.size === s} aria-label={`${s} px`} onClick={() => set({ size: s })}
                style={{ width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer", color: ink, fontWeight: 700, fontSize: s - 2, lineHeight: 1,
                  background: st.size === s ? hexAlpha(ink, 0.2) : "transparent" }}>A</button>
            ))}
          </div>
          <button type="button" aria-label={`Animación${st.fx ? `: ${FX_LABEL[st.fx]}` : ""}`} aria-expanded={pop?.kind === "fx"} onClick={e => togglePop("fx", e.currentTarget)}
            style={{ ...tool(pop?.kind === "fx" || !!st.fx), color: st.fx ? accent : ink }}>
            <SparkIcon />
          </button>
          {ps.recent.filter(r => !sameStyle(r, ps.style)).slice(0, 3).map((r, i) => {
            const rs = resolvePostStyle(r);
            return (
              <button key={i} type="button" aria-label="Estilo reciente" title="Reciente" onClick={() => ps.setStyle(r)}
                style={{ height: 32, padding: "0 10px", borderRadius: 14, borderTopLeftRadius: 4, cursor: "pointer", flex: "none",
                  background: rs.bg, color: rs.color, fontFamily: postFontFamily(rs.font), fontSize: 13, border: `1px solid ${hexAlpha(ink, 0.2)}` }}>Aa</button>
            );
          })}
        </div>
      )}
      {pop?.kind === "font" && <Pop anchor={pop.el} onClose={() => setPop(null)} width={280}><FontPicker value={st.font} sample={text.trim().slice(0, 22)} onPick={f => { set({ font: f }); setPop(null); input.current?.focus({ preventScroll: true }); }} /></Pop>}
      {pop?.kind === "color" && <Pop anchor={pop.el} onClose={() => setPop(null)}><Swatches label="Color del texto" colors={POST_COLORS} value={st.color} onPick={c => set({ color: c })} /></Pop>}
      {pop?.kind === "bg" && <Pop anchor={pop.el} onClose={() => setPop(null)}><Swatches label="Color del globo" colors={POST_BGS} value={st.bg} onPick={c => set({ bg: c })} /></Pop>}
      {pop?.kind === "fx" && <Pop anchor={pop.el} onClose={() => setPop(null)} width={250}><FxGrid value={st.fx} color={st.color} onPick={f => { ps.setStyle(cleanPostStyle({ ...ps.style, fx: f })); setPop(null); }} /></Pop>}
      {err && <p role="status" style={{ margin: "0 6px", fontSize: 12, color: accent }}>{err}</p>}
    </form>
  );
}

// ── Wall body (posts + composer) ─────────────────────────────────────────────
export function WallBody({ w, ink, accent, wallBg, ownerHandle, newTab, loginHref }: {
  w: WallState; ink: string; accent: string; wallBg: string; ownerHandle?: string; newTab?: boolean; loginHref: string;
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
        {!w.loaded && <div aria-label="Cargando" style={{ display: "grid", placeItems: "center", padding: 40, color: dim }}><WallIcon size={26} /></div>}
        {w.loaded && w.posts.length === 0 && (
          <div aria-label="Todavía no hay posts" style={{ display: "grid", placeItems: "center", gap: 10, padding: "56px 16px", color: dim }}>
            <span style={{ display: "flex", gap: 6, opacity: 0.8 }}>
              <span style={{ width: 54, height: 22, borderRadius: 11, borderTopLeftRadius: 4, background: hexAlpha(ink, 0.14) }} />
              <span style={{ width: 30, height: 22, borderRadius: 11, borderTopLeftRadius: 4, background: hexAlpha(ink, 0.1) }} />
            </span>
            <span style={{ width: 80, height: 22, borderRadius: 11, borderTopLeftRadius: 4, background: hexAlpha(ink, 0.08) }} />
          </div>
        )}
        {w.posts.map(post => (
          <div key={post.id}>
            <PostView post={post} ink={ink} accent={accent} wallBg={wallBg} viewer={w.viewer} wallOwner={w.isOwner} newTab={newTab}
              onLike={() => w.like(post.id)}
              threadOpen={thread === post.id} onThread={() => toggleThread(post)}
              onDelete={() => w.remove(post.id)} onReport={() => w.report(post.id)} onBlock={() => w.block(post.author.id)}
              onPin={() => w.pin(post.id, !post.pinned)} />
            {thread === post.id && (
              <div style={{ marginLeft: 38, paddingLeft: 10, borderLeft: `2px solid ${hexAlpha(ink, 0.14)}` }}>
                {(w.replies[post.id] ?? []).map(r => (
                  <PostView key={r.id} post={r} compact ink={ink} accent={accent} wallBg={wallBg} viewer={w.viewer} wallOwner={w.isOwner} newTab={newTab}
                    onLike={() => w.like(r.id)} onDelete={() => w.remove(r.id)} onReport={() => w.report(r.id)} onBlock={() => w.block(r.author.id)} />
                ))}
              </div>
            )}
          </div>
        ))}
        {w.more && (
          <button type="button" onClick={w.loadMore} aria-label="Ver más"
            style={{ display: "block", margin: "6px auto 10px", padding: "6px 18px", borderRadius: 999, border: `1px solid ${hexAlpha(ink, 0.16)}`, background: "transparent", color: dim, cursor: "pointer" }}>
            <MoreIcon />
          </button>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${hexAlpha(ink, 0.12)}`, padding: "10px 12px calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        {w.viewer === null ? (
          <a href={loginHref} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 999, background: accent, color: "#fff", fontWeight: 650, textDecoration: "none" }}>
            <WallIcon size={16} /> Iniciá sesión para escribir
          </a>
        ) : w.viewer && !w.canWrite ? (
          <p aria-label="Muro cerrado" style={{ margin: 4, display: "flex", justifyContent: "center", color: dim }}><BlockIcon size={18} /></p>
        ) : w.viewer ? (
          <Composer ink={ink} accent={accent} wallBg={wallBg}
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
