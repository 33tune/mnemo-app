"use client";
/**
 * Recursos (2026-11-28) — "Compartí fragmentos de tu alma". The back of a card
 * gets a Recursos tab: on top, the card's own resources (its stickers and the
 * room's images / GIFs) in a row that scrolls sideways; below, what the card
 * reposted from other cards, in a grid, each "vía @x". Tapping one opens the
 * viewer: the picture, who uploaded it, its numbers, comments, and Repostear /
 * Descargar (locked when the owner says so) / me gusta / Reportar. The owner,
 * on their own card, also gets: Permitir descargas, descripción, Ocultar de
 * recursos and (in the editor) Borrar, which takes it out of the card / room
 * and removes its reposts.
 *
 * Pictures are shown small through /api/thumb (GIFs as their first frame) —
 * a row of full GIFs is what makes iPhones reload the page.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HeartIcon, CommentIcon } from "@/components/canvas/StatsRow";
import { hexAlpha, timeAgo } from "@/lib/comments";
import { formatViewCount } from "@/lib/profileCardLayout";
import { thumbUrl, isOwnStorageUrl } from "@/lib/thumbImages";
import { CAPTION_MAX, RESOURCE_COMMENT_MAX, visibleResources, type Resource, type ResourceStats } from "@/lib/resources";
import type { PostAuthor } from "@/lib/wall";
import { useViewerId } from "@/lib/viewer";
import { track } from "@/lib/track";
import {
  useResources, useResourceStats, useResourceComments, emptyStats,
  toggleResourceRepost, toggleResourceLike, postResourceComment, deleteResourceComment, reportResource,
  setResourceMeta, deleteResourceData, downloadResource,
} from "@/hooks/useResources";
import HRow from "@/components/explore/HRow";
import { Avatar, CloseIcon, FlagIcon, MoreIcon, SendIcon, TrashIcon, roundBtn, UI_FONT } from "./WallParts";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const thumbOf = (src: string, w: number) => (isOwnStorageUrl(src, SB_URL) ? thumbUrl(src, w) : src);

// ── Icons ────────────────────────────────────────────────────────────────────
const svg = (d: React.ReactNode, size = 18, sw = 2) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block", flex: "none" }}>{d}</svg>
);
export const RepostIcon = ({ size = 16 }: { size?: number }) => svg(<><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>, size);
export const DownloadIcon = ({ size = 16 }: { size?: number }) => svg(<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>, size);
export const LockIcon = ({ size = 14 }: { size?: number }) => svg(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>, size);
export const ResourcesIcon = ({ size = 18 }: { size?: number }) => svg(<><rect x="7" y="3" width="14" height="14" rx="2.5" /><path d="M3 7.5V19a2 2 0 0 0 2 2h11.5" /><circle cx="12" cy="8" r="1.6" /><path d="m21 13.5-3.6-3.6a1.4 1.4 0 0 0-2 0L9 16.4" /></>, size);
const EyeOffIcon = ({ size = 14 }: { size?: number }) => svg(<><path d="M3 3l18 18" /><path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 9 5 9 7a9 9 0 0 1-2.2 3.2M6.6 6.6C4.4 8 3 10.3 3 12c0 2 4 7 9 7 1.6 0 3-.4 4.3-1" /></>, size);

/** What the viewer opens. */
export interface ResourceTarget { ownerId: string; ownerHandle: string; owner?: PostAuthor; key: string; src: string }

// ── The tab ──────────────────────────────────────────────────────────────────
export function ResourcesTab({ ownerId, ownerHandle, owner, resources, ink, accent, own, newTab, onDeleteResource }: {
  ownerId: string; ownerHandle: string; owner?: PostAuthor; resources: Resource[]; ink: string; accent: string; own: boolean; newTab?: boolean;
  /** Editor only: take it out of the card / room. */
  onDeleteResource?: (key: string) => void;
}) {
  const r = useResources(ownerId, resources, true);
  const [open, setOpen] = useState<ResourceTarget | null>(null);
  const dim = hexAlpha(ink, 0.58);
  const mine = useMemo(() => visibleResources(resources, r.stats, own), [resources, r.stats, own]);
  const allHidden = r.settings.hidden;
  const showMine = own || !allHidden;
  const openOne = (t: ResourceTarget) => { setOpen(t); track("resource_open", { own: t.ownerId === ownerId }); };

  return (
    <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "10px 0 12px" }}>
      {showMine && (
        <section aria-label={own ? "Tus recursos" : `Recursos de @${ownerHandle}`} style={{ opacity: allHidden ? 0.5 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px 8px", color: dim, font: `700 10.5px ${UI_FONT}`, letterSpacing: ".08em", textTransform: "uppercase" }}>
            <ResourcesIcon size={13} /> {own ? "Fragmentos de tu alma" : "Fragmentos"}
            {allHidden && <span title="Ocultos" aria-label="Ocultos" style={{ display: "flex" }}><EyeOffIcon size={13} /></span>}
          </div>
          {r.loaded && mine.length === 0 ? (
            <p style={{ margin: "0 14px 6px", color: dim, font: `500 12.5px ${UI_FONT}`, lineHeight: 1.4 }}>
              {own ? "Compartí fragmentos de tu alma: los stickers de tu card y las imágenes de tu sala aparecen acá." : "Todavía no hay recursos."}
            </p>
          ) : (
            // Sideways with a finger, the wheel, dragging with the mouse or the arrows (HRow).
            <div style={{ padding: "0 14px 4px" }}><HRow label={own ? "Tus recursos" : "Recursos"}>
              {mine.map(res => {
                const st = r.stats.get(res.key);
                const locked = st ? st.noDownload : r.settings.locked;
                return (
                  <button key={res.key} type="button" aria-label={`Abrir recurso${locked ? " (sin descarga)" : ""}`}
                    onClick={() => openOne({ ownerId, ownerHandle, owner, key: res.key, src: res.src })}
                    style={{ flex: "none", position: "relative", width: 92, height: 92, padding: 0, borderRadius: 14, overflow: "hidden", cursor: "pointer", scrollSnapAlign: "start",
                      border: `1px solid ${hexAlpha(ink, 0.12)}`, background: `repeating-conic-gradient(${hexAlpha(ink, 0.07)} 0 25%, transparent 0 50%) 0 0 / 14px 14px`,
                      opacity: st?.hidden ? 0.45 : 1 }}>
                    <img src={thumbOf(res.src, 200)} alt="" loading="lazy" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                    {locked && <Badge><LockIcon size={11} /></Badge>}
                    {st?.hidden && <Badge left><EyeOffIcon size={11} /></Badge>}
                  </button>
                );
              })}
            </HRow></div>
          )}
        </section>
      )}

      <section aria-label="Reposteados" style={{ marginTop: showMine ? 14 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px 8px", color: dim, font: `700 10.5px ${UI_FONT}`, letterSpacing: ".08em", textTransform: "uppercase" }}>
          <RepostIcon size={13} /> Reposteados
        </div>
        {r.loaded && r.reposts.length === 0 && (
          <p style={{ margin: "0 14px", color: dim, font: `500 12.5px ${UI_FONT}` }}>{own ? "Lo que repostees de otras cards aparece acá." : "Nada todavía."}</p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "0 14px" }}>
          {r.reposts.map(it => (
            <button key={it.id} type="button" aria-label={`Recurso vía @${it.ownerHandle}`}
              onClick={() => openOne({ ownerId: it.ownerId, ownerHandle: it.ownerHandle, owner: it.owner, key: it.key, src: it.src })}
              style={{ position: "relative", aspectRatio: "1", padding: 0, borderRadius: 12, overflow: "hidden", cursor: "pointer",
                border: `1px solid ${hexAlpha(ink, 0.12)}`, background: `repeating-conic-gradient(${hexAlpha(ink, 0.07)} 0 25%, transparent 0 50%) 0 0 / 14px 14px` }}>
              <img src={thumbOf(it.src, 200)} alt="" loading="lazy" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <span data-no-i18n="" style={{ position: "absolute", left: 4, right: 4, bottom: 4, padding: "2px 6px", borderRadius: 999, background: "rgba(0,0,0,.6)", color: "#fff",
                font: `600 10px ${UI_FONT}`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>vía @{it.ownerHandle || "?"}</span>
            </button>
          ))}
        </div>
        {r.more && (
          <button type="button" onClick={r.loadMore} aria-label="Ver más"
            style={{ display: "block", margin: "10px auto 0", padding: "6px 18px", borderRadius: 999, border: `1px solid ${hexAlpha(ink, 0.16)}`, background: "transparent", color: dim, cursor: "pointer" }}>
            <MoreIcon />
          </button>
        )}
      </section>

      {open && (
        <ResourceViewer target={open} accent={accent} newTab={newTab}
          initial={open.ownerId === ownerId ? r.stats.get(open.key) ?? { ...emptyStats(open.key), noDownload: r.settings.locked } : undefined}
          onChange={s => { if (open.ownerId === ownerId) r.patch(open.key, s); }}
          onDeleted={() => { setOpen(null); r.reload(); }}
          onDeleteResource={open.ownerId === ownerId ? onDeleteResource : undefined}
          onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

function Badge({ children, left }: { children: React.ReactNode; left?: boolean }) {
  return (
    <span aria-hidden style={{ position: "absolute", top: 5, [left ? "left" : "right"]: 5, width: 20, height: 20, borderRadius: 99, display: "grid", placeItems: "center",
      background: "rgba(0,0,0,.62)", color: "#fff" }}>{children}</span>
  );
}

// ── The viewer ───────────────────────────────────────────────────────────────
// Grafito (2026-11-28): the viewer is a light old-Mac window; Aqua gel buttons, the main one in lime.
const GEL = "linear-gradient(180deg,#fdfdfd,#e6e8ea 50%,#dadde0 51%,#e9ebed)";
const GEL_LIMA = "linear-gradient(180deg,#f2ffc4 0%,#d4fa5a 46%,#bde826 52%,#d0f74e 100%)";
const btn = (on?: boolean, danger?: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 38, padding: "0 12px", borderRadius: 999, cursor: "pointer", border: "none",
  background: danger ? "linear-gradient(180deg,#ff8a80,#ff3b30)" : on ? GEL_LIMA : GEL,
  color: danger ? "#fff" : on ? "#2B3A00" : "#2c2f33", textShadow: danger ? "none" : "0 1px 0 rgba(255,255,255,.6)",
  boxShadow: on ? "inset 0 1px 0 rgba(255,255,255,.85), 0 0 0 .5px rgba(70,100,0,.55), 0 2px 6px rgba(110,160,0,.25)" : "inset 0 1px 0 #fff, 0 0 0 .5px rgba(0,0,0,.3), 0 1px 2px rgba(0,0,0,.08)",
  font: `600 13.5px var(--gf-font)`, flex: "1 1 0", minWidth: 0,
});

export function ResourceViewer({ target, accent, newTab, initial, onChange, onClose, onDeleted, onDeleteResource }: {
  target: ResourceTarget; accent: string; newTab?: boolean; initial?: ResourceStats;
  onChange?: (s: Partial<ResourceStats>) => void; onClose: () => void; onDeleted?: () => void;
  onDeleteResource?: (key: string) => void;
}) {
  const viewer = useViewerId();
  const { s, setS } = useResourceStats(target.ownerId, target.key, initial);
  const c = useResourceComments(target.ownerId, target.key);
  const own = !!viewer && viewer === target.ownerId;
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "dl" | "rp">(null);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [menu, setMenu] = useState(false);
  const [text, setText] = useState("");
  const shell = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 720);
  useEffect(() => {
    const r = () => setWide(window.innerWidth >= 720);
    window.addEventListener("resize", r);
    shell.current?.focus({ preventScroll: true });
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", esc, true);
    return () => { window.removeEventListener("resize", r); window.removeEventListener("keydown", esc, true); };
  }, [onClose]);
  const set = (p: Partial<ResourceStats>) => { setS(prev => ({ ...prev, ...p })); onChange?.(p); };
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(cur => (cur === m ? null : cur)), 2600); };
  const loginHref = `/login?next=${typeof location !== "undefined" ? encodeURIComponent(location.pathname) : "/"}`;
  const needLogin = () => { if (viewer === null) { location.href = loginHref; return true; } return false; };

  const like = async () => {
    if (needLogin() || !viewer) return;
    set({ liked: !s.liked, likes: Math.max(0, s.likes + (s.liked ? -1 : 1)) });
    const res = await toggleResourceLike(target.ownerId, target.key);
    if (typeof res === "string") { set({ liked: s.liked, likes: s.likes }); flash(res); } else set({ liked: res.liked, likes: res.n });
  };
  const repost = async () => {
    if (needLogin() || !viewer || own || busy) return;
    setBusy("rp");
    const res = await toggleResourceRepost(target.ownerId, target.key, target.src);
    setBusy(null);
    if (typeof res === "string") flash(res);
    else { set({ reposted: res.reposted, reposts: res.n }); flash(res.reposted ? "Reposteado en tu card" : "Repost quitado"); }
  };
  const download = async () => {
    if (s.noDownload && !own) { flash("El dueño no permite descargarla."); return; }
    if (busy) return;
    setBusy("dl");
    const e = await downloadResource(target.ownerId, target.ownerHandle, target.key, target.src);
    setBusy(null);
    if (e) flash(e); else set({ downloads: s.downloads + 1 });
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const b = text.trim();
    if (!b || needLogin()) return;
    const err = await postResourceComment(target.ownerId, target.key, b);
    if (err) { flash(err); return; }
    setText(""); set({ comments: s.comments + 1 }); c.reload();
  };
  const owner = target.owner;
  const profileHref = target.ownerHandle ? `/${target.ownerHandle}` : undefined;

  const image = (
    <div style={{ position: "relative", flex: wide ? "1 1 55%" : "none", minHeight: wide ? 0 : 220, maxHeight: wide ? "none" : "46vh", display: "grid", placeItems: "center",
      background: "rgba(255,255,255,.4) repeating-conic-gradient(rgba(0,0,0,.045) 0 25%, transparent 0 50%) 0 0 / 18px 18px", overflow: "hidden",
      borderRight: wide ? ".5px solid rgba(0,0,0,.2)" : "none", borderBottom: wide ? "none" : ".5px solid rgba(0,0,0,.2)" }}>
      <img src={target.src} alt={s.caption ?? ""} draggable={false}
        onContextMenu={s.noDownload && !own ? e => e.preventDefault() : undefined}
        style={{ maxWidth: "100%", maxHeight: wide ? "min(76vh, 640px)" : "46vh", objectFit: "contain", display: "block", userSelect: "none", filter: "drop-shadow(0 14px 22px rgba(0,0,0,.25))",
          WebkitTouchCallout: s.noDownload && !own ? "none" : undefined } as React.CSSProperties} />
    </div>
  );

  const stats = [
    { label: "me gusta", n: s.likes, icon: <HeartIcon size={13} filled /> },
    { label: s.reposts === 1 ? "repost" : "reposts", n: s.reposts, icon: <RepostIcon size={13} /> },
    { label: s.downloads === 1 ? "descarga" : "descargas", n: s.downloads, icon: <DownloadIcon size={13} /> },
    { label: s.comments === 1 ? "comentario" : "comentarios", n: s.comments, icon: <CommentIcon size={13} /> },
  ];

  const node = (
    <div data-mnemo-ui="" data-export-skip="" onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}
      onKeyDown={e => { if (e.key !== "Escape") e.stopPropagation(); }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 2147482600, background: "rgba(10,11,14,.55)", display: "grid", placeItems: wide ? "center" : "stretch",
        padding: wide ? 24 : 0 }}>
      <div ref={shell} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Recurso" className="gf-win"
        style={{ outline: "none", borderRadius: wide ? 14 : 0, display: "flex", flexDirection: wide ? "row" : "column",
          width: wide ? "min(940px, 100%)" : "100%", height: wide ? "min(640px, 100%)" : "100%", overflow: "hidden" }}>
        {!wide && (
          <div className="gf-bar gf-bar--phone">
            <span className="gf-bar__title" aria-hidden>Fragmento</span>
            <span style={{ flex: 1 }} />
            <button type="button" className="gf-btn" onClick={onClose} aria-label="Cerrar">Listo</button>
          </div>
        )}
        {image}
        <div style={{ flex: wide ? "1 1 45%" : 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {wide && (
            <div className="gf-bar">
              <span className="gf-lights" aria-hidden><i /><i /><i /></span>
              <span className="gf-bar__title" aria-hidden>Fragmento</span>
              <span style={{ flex: 1 }} />
              <button type="button" className="gf-btn" onClick={onClose} aria-label="Cerrar">Listo</button>
            </div>
          )}
          {/* Who uploaded it */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 12px 10px 16px" }}>
            {owner ? <Avatar a={owner} size={36} round /> : <span style={{ width: 36, height: 36, borderRadius: 99, background: "#c9ccd0" }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div data-no-i18n="" style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{target.ownerHandle || "?"}</div>
              {profileHref && !own && (
                <a href={profileHref} target={newTab ? "_blank" : undefined} rel="noreferrer" className="gf-link">Ver perfil ›</a>
              )}
            </div>
            {!own && viewer && (
              <div style={{ position: "relative" }}>
                <button type="button" className="gf-btn gf-btn--round" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-label="Más"><MoreIcon /></button>
                {menu && (
                  <div role="menu" className="gf-group" style={{ position: "absolute", right: 0, top: 36, zIndex: 3, padding: 4, minWidth: 140, boxShadow: "0 0 0 .5px rgba(0,0,0,.2), 0 10px 24px rgba(0,0,0,.2)" }}>
                    <button type="button" role="menuitem" onClick={async () => { setMenu(false); flash((await reportResource(target.ownerId, target.key, target.src)) ? "Reportado. Gracias." : "No se pudo reportar."); }}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 10px", border: "none", borderRadius: 8, background: "transparent", color: "#15171A", cursor: "pointer", font: `500 13.5px var(--gf-font)` }}>
                      <FlagIcon /> Reportar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "0 16px 10px" }}>
            {/* Description */}
            {editing ? (
              <form onSubmit={async e => { e.preventDefault(); const v = caption.trim().slice(0, CAPTION_MAX); setEditing(false); set({ caption: v || null }); if (!(await setResourceMeta(target.key, { caption: v || null }))) flash("No se pudo guardar."); }}
                style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                <textarea value={caption} onChange={e => setCaption(e.target.value.slice(0, CAPTION_MAX))} rows={3} autoFocus aria-label="Descripción"
                  placeholder="Contá algo de esta imagen" className="gf-field" style={{ resize: "none", borderRadius: 12, padding: 10 }} />
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ flex: 1, color: "var(--gf-ink3)", fontSize: 11.5 }}>{caption.length}/{CAPTION_MAX}</span>
                  <button type="button" onClick={() => setEditing(false)} style={{ ...btn(), flex: "none" }}>Cancelar</button>
                  <button type="submit" style={{ ...btn(true), flex: "none" }}>Guardar</button>
                </div>
              </form>
            ) : s.caption ? (
              <p data-no-i18n="" style={{ margin: "0 0 10px", whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.4, fontSize: 15.5 }}>{s.caption}</p>
            ) : null}

            {/* Numbers */}
            <div aria-label="Estadísticas" style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", color: "var(--gf-ink3)", fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
              {stats.map(x => <span key={x.label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{x.icon}<span>{formatViewCount(x.n)}</span><span>{x.label}</span></span>)}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <button type="button" onClick={like} aria-pressed={s.liked} aria-label="Me gusta" style={{ ...btn(), flex: "none", width: 44, padding: 0, color: s.liked ? "#FF3D8B" : "#2c2f33" }}>
                <HeartIcon size={17} filled={s.liked} />
              </button>
              {!own && (
                <button type="button" onClick={repost} aria-pressed={s.reposted} disabled={busy === "rp"} style={btn(!s.reposted)}>
                  <RepostIcon /> {s.reposted ? "Reposteado" : "Repostear"}
                </button>
              )}
              <button type="button" onClick={download} disabled={busy === "dl"} aria-disabled={s.noDownload && !own}
                style={{ ...btn(), opacity: s.noDownload && !own ? 0.5 : 1, cursor: s.noDownload && !own ? "not-allowed" : "pointer" }}>
                {s.noDownload && !own ? <LockIcon /> : <DownloadIcon />} {busy === "dl" ? "…" : "Descargar"}
              </button>
            </div>
            {msg && <p role="status" style={{ margin: "-4px 0 10px", color: "#4b6a00", fontSize: 13, fontWeight: 600 }}>{msg}</p>}

            {/* The owner's options */}
            {own && (
              <div aria-label="Opciones del recurso" className="gf-group" style={{ display: "flex", flexDirection: "column", gap: 2, padding: 6, marginBottom: 14 }}>
                <OptRow label="Permitir descargas" on={!s.noDownload} onToggle={async () => { const v = !s.noDownload; set({ noDownload: v }); if (!(await setResourceMeta(target.key, { noDownload: v }))) set({ noDownload: !v }); }} />
                <OptRow label="Ocultar de recursos" on={s.hidden} onToggle={async () => { const v = !s.hidden; set({ hidden: v }); if (!(await setResourceMeta(target.key, { hidden: v }))) set({ hidden: !v }); }} />
                <button type="button" onClick={() => { setCaption(s.caption ?? ""); setEditing(true); }} style={optBtn}>{s.caption ? "Editar descripción" : "Agregar descripción"}</button>
                {onDeleteResource && (
                  confirmDel ? (
                    <div role="alertdialog" aria-label="Borrar recurso" style={{ padding: 10, borderRadius: 10, background: "rgba(255,59,48,.08)", display: "flex", flexDirection: "column", gap: 8 }}>
                      <span style={{ fontSize: 13, lineHeight: 1.4 }}>Se borra de tu card o tu sala, y de todos los que lo repostearon. No se puede deshacer.</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => setConfirmDel(false)} style={btn()}>Cancelar</button>
                        <button type="button" onClick={async () => { await deleteResourceData(target.key); onDeleteResource(target.key); onDeleted?.(); }}
                          style={btn(false, true)}><TrashIcon /> Borrar</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDel(true)} style={{ ...optBtn, color: "#c62a20", display: "flex", alignItems: "center", gap: 8 }}><TrashIcon /> Borrar</button>
                  )
                )}
              </div>
            )}

            {/* Comments */}
            <div aria-label="Comentarios" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {c.loaded && c.list.length === 0 && !own && s.noDownload && (
                <p style={{ margin: 0, color: "var(--gf-ink3)", fontSize: 13 }}>¿La querés? Pedíselo en un comentario.</p>
              )}
              {c.list.map(cm => (
                <div key={cm.id} style={{ display: "flex", gap: 8 }}>
                  <a href={cm.author.handle ? `/${cm.author.handle}` : undefined} target={newTab ? "_blank" : undefined} rel="noreferrer" tabIndex={-1}><Avatar a={cm.author} size={26} /></a>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, fontSize: 12, alignItems: "center" }}>
                      <span data-no-i18n="" style={{ fontWeight: 650 }}>@{cm.author.handle || "?"}</span>
                      <span style={{ color: "var(--gf-ink3)" }}>{timeAgo(cm.at)}</span>
                      <span style={{ flex: 1 }} />
                      {viewer && (viewer === cm.author.id || own) && (
                        <button type="button" aria-label="Borrar comentario" onClick={async () => { c.setList(l => l.filter(x => x.id !== cm.id)); set({ comments: Math.max(0, s.comments - 1) }); if (!(await deleteResourceComment(cm.id))) c.reload(); }}
                          style={{ ...roundBtn, width: 24, height: 24, color: "var(--gf-ink3)" }}><TrashIcon size={13} /></button>
                      )}
                    </div>
                    <p data-no-i18n="" style={{ margin: "2px 0 0", fontSize: 13.5, lineHeight: 1.35, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{cm.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Write */}
          <form onSubmit={send} style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px calc(12px + env(safe-area-inset-bottom, 0px))", borderTop: ".5px solid rgba(0,0,0,.15)" }}>
            {viewer === null ? (
              <a href={loginHref} style={{ ...btn(true), textDecoration: "none" }}>Iniciá sesión para comentar</a>
            ) : (
              <>
                <input value={text} onChange={e => setText(e.target.value.slice(0, RESOURCE_COMMENT_MAX))} placeholder="Escribí un comentario" aria-label="Escribí un comentario"
                  className="gf-field" style={{ flex: 1, minWidth: 0, height: 38, padding: "0 14px" }} />
                <button type="submit" disabled={!text.trim()} style={{ ...btn(true), flex: "none", height: 34, padding: "0 14px", opacity: text.trim() ? 1 : 0.55 }}>Enviar</button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(node, document.body);
}

const optBtn: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", padding: "10px", border: "none", borderRadius: 8, background: "transparent", color: "#15171A", cursor: "pointer", font: `500 14px var(--gf-font)` };

function OptRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle} style={{ ...optBtn, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ flex: 1 }}>{label}</span>
      <span aria-hidden style={{ width: 40, height: 24, borderRadius: 99, background: on ? GEL_LIMA : "linear-gradient(180deg,#c9ccd0,#e2e4e7)", position: "relative", transition: "background .15s",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,.25), 0 0 0 .5px rgba(0,0,0,.3)" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 20, height: 20, borderRadius: 99, background: "linear-gradient(180deg,#fff,#e6e8ea)", boxShadow: "0 1px 2px rgba(0,0,0,.3)", transition: "left .15s" }} />
      </span>
    </button>
  );
}
