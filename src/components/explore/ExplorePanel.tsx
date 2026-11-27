"use client";
/**
 * Explorar (2026-11-26, pedido del usuario): one place for search, your
 * favorites and the community's cards (/api/explore: only cards made with
 * care, rotating). On a computer it is a panel on the right ("dock"); on a
 * phone, a full screen ("screen"). Replaces the old favorites bar.
 * myLand's look: #0E0C12, the pink #FF4F94, Unbounded titles, glass.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import ExploreThumb, { type ExploreItem } from "./ExploreThumb";
import { VerifyExploreNotice } from "@/components/verify/Verify";
import { isVerifyError, requestVerify } from "@/lib/verify";
import { EXPLORE_TABS, type ExploreTab } from "@/lib/explore";
import { useShortcuts } from "@/hooks/useShortcuts";
import { barShortcuts, changedSince, readSeenSigs, writeSeenSigs, type Shortcut } from "@/lib/shortcuts";
import { cleanSearchQuery, type SearchHit } from "@/lib/userSearch";
import { createClient } from "@/lib/supabase/client";
import { useViewerId } from "@/lib/viewer";
import { track } from "@/lib/track";

export const EXPLORE_PANEL_ID = "mnemo-explore";
const ACC = "#FF4F94";
const INK = "#F6F3F8";
const font = "var(--font-sans, system-ui), -apple-system, 'Segoe UI', sans-serif";

let fontLinked = false;
function useDisplayFont() {
  useEffect(() => {
    if (fontLinked || typeof document === "undefined") return;
    fontLinked = true;
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800&display=swap";
    document.head.appendChild(l);
  }, []);
}

function Label({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 10px",
      font: `700 11.5px ${font}`, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(246,243,248,.45)" }}>
      <span>{children}</span>{action}
    </div>
  );
}

function FavAvatar({ s, changed, onOpen }: { s: Shortcut; changed: boolean; onOpen: (s: Shortcut) => void }) {
  return (
    <a href={`/${s.handle}`} draggable={false} onClick={() => onOpen(s)} title={`@${s.handle}`} aria-label={`@${s.handle}${changed ? ", cambió su card" : ""}`}
      style={{ width: 64, flex: "none", textAlign: "center", textDecoration: "none", color: "rgba(246,243,248,.7)", font: `500 11px ${font}` }}>
      <span style={{ width: 56, height: 56, borderRadius: 28, margin: "0 auto 5px", display: "grid", placeItems: "center", overflow: "hidden",
        background: s.bg, color: s.nameColor, font: `700 18px ${font}`,
        boxShadow: changed ? `0 0 0 3px ${ACC}, 0 0 0 6px rgba(255,79,148,.22)` : "0 0 0 2px rgba(255,255,255,.12)" }}>
        {s.photo ? <img src={s.photo} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : (s.name || s.handle).slice(0, 1).toUpperCase()}
      </span>
      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{s.handle}</span>
    </a>
  );
}

/** A row that scrolls sideways with a finger, the mouse wheel, dragging with
 * the mouse, or the arrows that show up when there is more to see. */
function HRow({ children, gap = 8, label }: { children: React.ReactNode; gap?: number; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const update = useCallback(() => {
    const el = ref.current; if (!el) return;
    setEdge({ l: el.scrollLeft > 2, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    update();
    const ro = new ResizeObserver(update); ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);
    // A vertical wheel over the row moves it sideways (only while it can move).
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      const before = el.scrollLeft;
      el.scrollLeft += e.deltaY;
      if (el.scrollLeft !== before) e.preventDefault();
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => { ro.disconnect(); el.removeEventListener("wheel", wheel); };
  }, [update, children]);
  const by = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  const arrow = (dir: -1 | 1): React.CSSProperties => ({ position: "absolute", top: "50%", [dir < 0 ? "left" : "right"]: -4, transform: "translateY(-60%)",
    width: 30, height: 30, borderRadius: 15, border: "none", background: "rgba(246,243,248,.95)", color: "#141118", display: "grid", placeItems: "center",
    cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,.4)", zIndex: 2, padding: 0 });
  return (
    <div style={{ position: "relative" }} role={label ? "group" : undefined} aria-label={label}>
      <div ref={ref} onScroll={update}
        onPointerDown={e => { if (e.pointerType === "mouse" && e.button === 0) drag.current = { x: e.clientX, left: ref.current!.scrollLeft, moved: false }; }}
        onPointerMove={e => {
          const d = drag.current; if (!d || !ref.current) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) > 4) { d.moved = true; ref.current.setPointerCapture(e.pointerId); }
          if (d.moved) ref.current.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => { const d = drag.current; drag.current = null; if (d?.moved) { const stop = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); }; ref.current?.addEventListener("click", stop, { capture: true, once: true }); window.setTimeout(() => ref.current?.removeEventListener("click", stop, { capture: true }), 0); } }}
        onPointerCancel={() => { drag.current = null; }}
        style={{ display: "flex", gap, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2, overscrollBehaviorX: "contain", WebkitOverflowScrolling: "touch",
          maskImage: edge.l || edge.r ? `linear-gradient(90deg, ${edge.l ? "transparent, #000 28px" : "#000"}, ${edge.r ? "#000 calc(100% - 28px), transparent" : "#000"})` : undefined }}>
        {children}
      </div>
      {edge.l && <button type="button" aria-label="Ver anteriores" onClick={() => by(-1)} style={arrow(-1)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg></button>}
      {edge.r && <button type="button" aria-label="Ver más" onClick={() => by(1)} style={arrow(1)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg></button>}
    </div>
  );
}

export default function ExplorePanel({ mode, onClose, top = 14, bottom = 14, right = 14 }: {
  mode: "dock" | "screen"; onClose?: () => void; top?: number; bottom?: number; right?: number;
}) {
  useDisplayFont();
  const viewer = useViewerId();
  const sc = useShortcuts(true);
  const [tab, setTab] = useState<ExploreTab>("para");
  const [items, setItems] = useState<ExploreItem[] | null>(null);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [editFavs, setEditFavs] = useState(false);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const query = cleanSearchQuery(q);
  const reqId = useRef(0);
  // Para vos: one random seed per visit (a new mix each time Explorar opens).
  const seed = useRef(Math.random().toString(36).slice(2, 12));

  useEffect(() => { track("search", { explore: mode }); }, [mode]);
  useEffect(() => {
    if (!onClose) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const load = useCallback(async (t: ExploreTab, offset: number) => {
    const id = ++reqId.current;
    setFailed(false);
    try {
      const r = await fetch(`/api/explore?tab=${t}&offset=${offset}&limit=18&seed=${seed.current}`);
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json() as { items?: ExploreItem[]; more?: boolean };
      if (id !== reqId.current) return;
      setItems(prev => {
        if (!offset) return j.items ?? [];
        const seen = new Set((prev ?? []).map(x => x.userId));
        return [...(prev ?? []), ...(j.items ?? []).filter(x => !seen.has(x.userId))];
      });
      setMore(!!j.more);
    } catch {
      // A failed load is not "no cards": say so and offer to try again.
      if (id === reqId.current) { setFailed(true); if (!offset) setItems(prev => prev ?? []); }
    }
    finally { if (id === reqId.current) setLoadingMore(false); }
  }, []);
  useEffect(() => { setItems(null); load(tab, 0); }, [tab, load]);
  // Infinite scroll: the next page loads when the end of the grid comes near.
  const endRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef({ more, loadingMore, failed, n: 0, tab });
  moreRef.current = { more, loadingMore, failed, n: items?.length ?? 0, tab };
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      const m = moreRef.current;
      if (!e.isIntersecting || !m.more || m.loadingMore || m.failed || !m.n) return;
      setLoadingMore(true);
      load(m.tab, m.n);
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [load, items === null, !!query]);

  useEffect(() => {
    if (!query) { setHits(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal }).then(r => r.json())
        .then((d: { results?: SearchHit[] }) => setHits(d.results ?? [])).catch(() => {});
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  useEffect(() => {
    if (!sc.list) return;
    const r = changedSince(sc.list, readSeenSigs());
    if (r.dirty) writeSeenSigs(r.seen);
    setChanged(r.changed);
  }, [sc.list]);
  const markSeen = (s: Shortcut) => { if (s.sig) writeSeenSigs({ ...readSeenSigs(), [s.userId]: s.sig }); };

  const toggleFavorite = useCallback(async (it: ExploreItem) => {
    if (!viewer) return;
    const next = !it.favorite;
    setItems(list => list?.map(x => (x.userId === it.userId ? { ...x, favorite: next } : x)) ?? list);
    track(next ? "favorite_add" : "favorite_remove", { from: "explore" });
    const sb = createClient();
    const { error } = next
      ? await sb.from("favorites").insert({ user_id: viewer, target_user_id: it.userId })
      : await sb.from("favorites").delete().eq("user_id", viewer).eq("target_user_id", it.userId);
    if (error && !(next && error.code === "23505")) {
      setItems(list => list?.map(x => (x.userId === it.userId ? { ...x, favorite: !next } : x)) ?? list);
      if (next && isVerifyError(error)) requestVerify();
      return;
    }
    sc.reload();
  }, [viewer, sc]);

  const favs = sc.list ? barShortcuts(sc.list) : [];
  const dock = mode === "dock";
  const shell: React.CSSProperties = dock
    ? { position: "fixed", top, right, bottom, width: "min(400px, calc(100vw - 28px))", borderRadius: 24, zIndex: 2147481050,
        // Solid (no backdrop blur): the room behind animates, and the blur was
        // redone on every frame while scrolling the cards.
        background: "rgba(16,14,21,.985)",
        border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 24px 60px rgba(0,0,0,.45)" }
    : { position: "fixed", inset: 0, bottom, zIndex: 2147481050, background: "#0E0C12" };

  return (
    <section id={EXPLORE_PANEL_ID} data-mnemo-ui="" data-export-skip="" aria-label="Explorar"
      style={{ ...shell, color: INK, font: `500 14px ${font}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: dock ? "18px 18px 0" : "calc(env(safe-area-inset-top, 0px) + 18px) 16px 0", flex: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h2 style={{ margin: 0, font: "800 22px 'Unbounded', var(--font-sans), sans-serif", letterSpacing: "-.01em" }}>Explorar</h2>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Cerrar Explorar"
              style={{ marginLeft: "auto", width: 36, height: 36, borderRadius: 18, border: "none", background: "rgba(255,255,255,.08)", color: INK, display: "grid", placeItems: "center", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <label style={{ height: 46, borderRadius: 14, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(246,243,248,.55)" strokeWidth="2.4" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4.5 4.5" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} maxLength={40} placeholder="Buscar @usuario o nombre" aria-label="Buscar cards"
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: INK, font: `500 16px ${font}` }} />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Borrar búsqueda" style={{ border: "none", background: "transparent", color: "rgba(246,243,248,.6)", cursor: "pointer", font: `600 13px ${font}` }}>Borrar</button>}
        </label>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: dock ? "0 18px 18px" : "0 16px 24px", WebkitOverflowScrolling: "touch" }}>
        {query ? (
          <div style={{ marginTop: 12 }}>
            {hits === null && <p style={{ opacity: .6 }}>Buscando…</p>}
            {hits && hits.length === 0 && <p style={{ opacity: .65 }}>No hay cards con “{q.trim()}”.</p>}
            {hits && hits.map(h => (
              <a key={h.handle} href={`/${h.handle}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: "1px solid rgba(255,255,255,.07)", color: INK, textDecoration: "none" }}>
                <span style={{ width: 46, height: 46, borderRadius: 23, background: h.bg, flex: "none", overflow: "hidden", display: "grid", placeItems: "center" }}>
                  {h.photo && <img src={h.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", font: `700 15px ${font}`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} data-no-i18n="">{h.name}</span>
                  <span style={{ font: `500 13px ${font}`, color: "rgba(246,243,248,.55)" }}>@{h.handle}</span>
                </span>
              </a>
            ))}
          </div>
        ) : (
          <>
            {viewer && sc.list && (
              <>
                <Label action={favs.length > 0 && (
                  <button type="button" onClick={() => setEditFavs(v => !v)} aria-expanded={editFavs}
                    style={{ border: "none", background: "transparent", color: ACC, font: `600 12.5px ${font}`, letterSpacing: 0, textTransform: "none", cursor: "pointer" }}>
                    {editFavs ? "Listo" : "Editar"}
                  </button>)}>Tus favoritos</Label>
                {editFavs ? (
                  <div>
                    {sc.list.map(s => (
                      <div key={s.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", opacity: s.hidden ? .5 : 1 }}>
                        <span style={{ width: 32, height: 32, borderRadius: 16, overflow: "hidden", background: s.bg, flex: "none" }}>
                          {s.photo && <img src={s.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{s.handle}</span>
                        <button type="button" onClick={() => sc.setFlags(s.userId, { pinned: !s.pinned })} aria-pressed={s.pinned} style={chip(s.pinned)}>{s.pinned ? "Fijado" : "Fijar"}</button>
                        <button type="button" onClick={() => sc.setFlags(s.userId, { hidden: !s.hidden })} aria-pressed={!s.hidden} style={chip(!s.hidden)}>{s.hidden ? "Oculto" : "Visible"}</button>
                      </div>
                    ))}
                  </div>
                ) : favs.length ? (
                  <HRow label="Tus favoritos">
                    {favs.map(s => <FavAvatar key={s.userId} s={s} changed={changed.has(s.userId)} onOpen={x => { track("explore_card", { tab: "fav" }); markSeen(x); }} />)}
                  </HRow>
                ) : (
                  <p style={{ margin: 0, color: "rgba(246,243,248,.6)", font: `500 13.5px ${font}` }}>Tocá el corazón de una card y aparece acá.</p>
                )}
              </>
            )}
            <Label>Cards de la comunidad</Label>
            <VerifyExploreNotice />
            <div role="tablist" aria-label="Ordenar cards" style={{ marginBottom: 12 }}>
              <HRow gap={6}>
                {EXPLORE_TABS.map(t => (
                  <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => { if (t.id !== tab) { setTab(t.id); track("explore_tab", { tab: t.id }); } }} style={chip(tab === t.id)}>{t.label}</button>
                ))}
              </HRow>
            </div>
            {items === null ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {Array.from({ length: 6 }, (_, i) => <div key={i} style={{ aspectRatio: "4 / 5", borderRadius: 18, background: "rgba(255,255,255,.05)" }} />)}
              </div>
            ) : items.length === 0 && failed ? (
              <button type="button" onClick={() => { setItems(null); load(tab, 0); }} style={{ ...chip(false), width: "100%", height: 44, justifyContent: "center" }}>No se pudieron cargar. Reintentar</button>
            ) : items.length === 0 ? (
              <p style={{ color: "rgba(246,243,248,.6)" }}>Todavía no hay cards acá.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {items.map((it, i) => <ExploreThumb key={it.userId} item={it} canFavorite={!!viewer} onFavorite={toggleFavorite} onOpen={() => track("explore_card", { tab, pos: i })} />)}
              </div>
            )}
            <div ref={endRef} aria-hidden style={{ height: 1 }} />
            {items && items.length > 0 && failed && (
              <button type="button" onClick={() => { setLoadingMore(true); load(tab, items.length); }}
                style={{ ...chip(false), width: "100%", height: 44, marginTop: 12, justifyContent: "center" }}>Reintentar</button>
            )}
            {loadingMore && <p style={{ textAlign: "center", color: "rgba(246,243,248,.5)", font: `500 13px ${font}` }}>Cargando…</p>}
          </>
        )}
      </div>
    </section>
  );
}

function chip(on: boolean): React.CSSProperties {
  return { border: "none", borderRadius: 999, padding: "0 13px", height: 32, display: "inline-flex", alignItems: "center", flex: "none", whiteSpace: "nowrap",
    font: `600 12.5px ${font}`, cursor: "pointer", background: on ? INK : "rgba(255,255,255,.08)", color: on ? "#141118" : "rgba(246,243,248,.72)" };
}

/** The button that opens Explorar: replaces the favorites bar (computer). */
export function ExploreButton({ open, onToggle, left = 0, right = 0, bottom = 16, at, compact = false }: {
  open: boolean; onToggle: () => void; left?: number; right?: number; bottom?: number | string;
  /** Explicit position (a phone: next to the other buttons) instead of centered. */
  at?: React.CSSProperties; compact?: boolean;
}) {
  const viewer = useViewerId();
  const sc = useShortcuts(!!viewer);
  const [anyChanged, setAnyChanged] = useState(false);
  useEffect(() => {
    if (!sc.list) return;
    const seen = readSeenSigs();
    setAnyChanged(sc.list.some(s => s.sig && s.userId in seen && seen[s.userId] !== s.sig));
  }, [sc.list]);
  const favs = sc.list && !compact ? barShortcuts(sc.list).slice(0, 3) : [];
  const center = `calc(${left}px + (100vw - ${left + right}px) / 2)`;
  return (
    <button type="button" data-mnemo-ui="" data-export-skip="" onClick={onToggle} aria-expanded={open} aria-controls={open ? EXPLORE_PANEL_ID : undefined}
      aria-label={anyChanged ? "Explorar (hay favoritos con cambios)" : "Explorar"}
      style={{ position: "fixed", ...(at ?? { left: center, transform: "translateX(-50%)", bottom }), zIndex: 2147480900, height: compact ? 44 : 50, borderRadius: 999,
        display: "flex", alignItems: "center", gap: 10, padding: favs.length ? "0 8px 0 18px" : compact ? "0 16px" : "0 20px", cursor: "pointer",
        background: open ? "rgba(246,243,248,.95)" : "rgba(14,12,18,.86)", color: open ? "#141118" : INK,
        border: "1px solid rgba(255,255,255,.12)", WebkitBackdropFilter: "blur(18px)", backdropFilter: "blur(18px)",
        boxShadow: "0 12px 34px rgba(0,0,0,.35)", font: `700 ${compact ? 14 : 15}px ${font}` }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" /></svg>
      Explorar
      {favs.length > 0 && (
        <span aria-hidden style={{ display: "flex", marginLeft: 4 }}>
          {favs.map((s, i) => (
            <span key={s.userId} style={{ width: 30, height: 30, borderRadius: 15, marginLeft: i ? -9 : 0, overflow: "hidden", background: s.bg,
              boxShadow: `0 0 0 2px ${open ? "#f6f3f8" : "#0E0C12"}` }}>
              {s.photo && <img src={s.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </span>
          ))}
        </span>
      )}
      {anyChanged && <span aria-hidden style={{ width: 9, height: 9, borderRadius: 5, background: ACC, margin: "0 6px 0 2px" }} />}
    </button>
  );
}
