"use client";
/**
 * Acceso directo (2026-11-06): a bar at the bottom — the profiles I gave a
 * favorite, like the editor's left rail but horizontal. Each is the card's
 * photo; a note shows as a small bubble above it in the note's own color /
 * font (fixed size, the font normalized), with a ring while I have not seen
 * it. Tap = go to that profile. Right-click / long press = pin or hide.
 * "Editar" lists them all (hidden ones too). The lupa is always there (the
 * editor's opens the dock panel; on a profile it opens a small search here).
 * A pink dot marks a profile that published changes since I last saw it.
 * (2026-11-06: no mute bell, no fold chevron.) In the editor and on other
 * people's profiles while signed in.
 */
import React, { useEffect, useRef, useState } from "react";
import { useShortcuts } from "@/hooks/useShortcuts";
import { barShortcuts, changedSince, readSeenSigs, writeSeenSigs, type Shortcut } from "@/lib/shortcuts";
import { cleanSearchQuery, type SearchHit } from "@/lib/userSearch";
import { resolveNoteBox, noteSurface, noteText } from "@/lib/noteBox";
import { HeartIcon } from "./StatsRow";

export const SHORTCUTS_BAR_H = 76;
const AVATAR = 46;
/** An item with a note is as wide as its bubble (so the row never cuts it). */
const NOTE_ITEM_W = 84;

const glass: React.CSSProperties = {
  background: "var(--ui-shell-glass, rgba(22,20,28,.82))", color: "var(--ui-shell-glass-ink, #fff)",
  WebkitBackdropFilter: "var(--ui-material-blur, blur(18px))", backdropFilter: "var(--ui-material-blur, blur(18px))",
  boxShadow: "var(--ui-shadow-panel, 0 12px 40px rgba(0,0,0,.35))", border: "1px solid rgba(255,255,255,0.08)",
};
const iconBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 999, border: "none", display: "grid", placeItems: "center", flex: "none",
  background: "var(--ui-shell-glass-btn, rgba(255,255,255,.08))", color: "inherit", cursor: "pointer", padding: 0,
};

function Bubble({ s }: { s: Shortcut }) {
  if (!s.note) return null;
  const st = resolveNoteBox(s.noteStyle);
  return (
    <div aria-hidden style={{
      position: "absolute", left: "50%", bottom: AVATAR + 4, transform: "translateX(-50%)", width: NOTE_ITEM_W - 4,
      ...noteSurface(st), borderRadius: Math.min(st.radius, 12), padding: "4px 7px", boxSizing: "border-box", pointerEvents: "none",
    }}>
      <div style={{ ...noteText(st, 10.5), textAlign: "center", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {s.note.body}
      </div>
    </div>
  );
}

function Avatar({ s, current, onMenu, changed, onOpen }: { s: Shortcut; current: boolean; onMenu: (s: Shortcut, x: number, y: number) => void; changed?: boolean; onOpen?: (s: Shortcut) => void }) {
  const unseen = !!s.note && !s.noteSeen;
  const press = useRef<number | null>(null);
  return (
    <a href={`/${s.handle}`} title={s.note ? `@${s.handle}: ${s.note.body}` : `@${s.handle}`}
      aria-label={`${s.name} (@${s.handle})${s.note ? `, nota: ${s.note.body}` : ""}${changed ? ", tiene cambios nuevos" : ""}${s.pinned ? ", fijado" : ""}`}
      onClick={() => onOpen?.(s)}
      aria-current={current ? "page" : undefined}
      draggable={false}
      onContextMenu={e => { e.preventDefault(); onMenu(s, e.clientX, e.clientY); }}
      onTouchStart={e => { const t = e.touches[0]; press.current = window.setTimeout(() => { press.current = null; onMenu(s, t.clientX, t.clientY); }, 520); }}
      onTouchEnd={e => { if (press.current) { clearTimeout(press.current); press.current = null; } else e.preventDefault(); }}
      style={{ position: "relative", flex: "none", width: s.note ? NOTE_ITEM_W : AVATAR + 8, height: AVATAR + 8, display: "grid", placeItems: "center",
        textDecoration: "none", alignSelf: "flex-end", pointerEvents: "auto" }}>
      <Bubble s={s} />
      <span style={{
        width: AVATAR + 6, height: AVATAR + 6, borderRadius: s.pfpRadius, display: "grid", placeItems: "center",
        background: unseen ? "conic-gradient(from 210deg, #ff3d8b, #ffb03b, #ff3d8b, #8a5cff, #ff3d8b)" : current ? "rgba(255,255,255,.6)" : "transparent",
        padding: 2, boxSizing: "border-box",
      }}>
        <span style={{
          width: AVATAR, height: AVATAR, borderRadius: s.pfpRadius, overflow: "hidden", display: "grid", placeItems: "center",
          background: s.bg, color: s.nameColor, font: "700 17px system-ui, -apple-system, 'Segoe UI', sans-serif",
          boxShadow: unseen ? "0 0 0 2px rgba(14,12,18,.9)" : "inset 0 0 0 1px rgba(255,255,255,.12)",
        }}>
          {s.photo
            ? <img src={s.photo} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : (s.name || s.handle).slice(0, 1).toUpperCase()}
        </span>
      </span>
      {changed && (
        <span aria-hidden style={{ position: "absolute", right: s.note ? (NOTE_ITEM_W - AVATAR) / 2 - 1 : 1, top: 2, width: 12, height: 12, borderRadius: 99,
          background: "#ff4fa3", boxShadow: "0 0 0 2px rgba(14,12,18,.92)" }} />
      )}
      {s.pinned && (
        <span aria-hidden style={{ position: "absolute", right: 0, bottom: 2, width: 14, height: 14, borderRadius: 99, background: "#fff", color: "#111", display: "grid", placeItems: "center" }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3l5 5-4 1-4 4 1 5-2 2-4-6-6 6v-2l5-5-5-4 2-2 5 1 4-4z" /></svg>
        </span>
      )}
    </a>
  );
}

/** Buscar (moved here from the rail, 2026-11-06): the editor's lupa. */
export interface BarSearch { open: boolean; onToggle: () => void; panelId: string; buttonId: string }

function SearchButton({ search }: { search: BarSearch }) {
  return (
    <button type="button" id={search.buttonId} style={{ ...iconBtn, width: 40, height: 40, ...(search.open ? { background: "rgba(255,255,255,.22)" } : {}) }}
      onClick={search.onToggle} aria-label="Buscar cards" title="Buscar cards" aria-expanded={search.open} aria-controls={search.open ? search.panelId : undefined}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
    </button>
  );
}

/** On a profile (no dock): a small search above the bar; results open that
 * profile here. Same search as the editor's panel (/api/search). */
function SearchPopover({ onClose, center }: { onClose: () => void; center: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const query = cleanSearchQuery(q);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  useEffect(() => {
    if (!query) { setHits(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal }).then(r => r.json())
        .then((d: { results?: SearchHit[] }) => setHits(d.results ?? [])).catch(() => {});
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);
  return (
    <div data-mnemo-ui="" data-export-skip="" role="dialog" aria-label="Buscar cards"
      style={{ ...glass, position: "fixed", left: center, transform: "translateX(-50%)", bottom: SHORTCUTS_BAR_H + 18, zIndex: 2147481000,
        width: "min(360px, calc(100vw - 32px))", maxHeight: "min(440px, 60vh)", overflowY: "auto", borderRadius: 18, padding: 10, boxSizing: "border-box",
        font: "500 14px system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <input ref={input} value={q} onChange={e => setQ(e.target.value)} maxLength={40} placeholder="Nombre o @usuario" aria-label="Buscar cards"
        style={{ width: "100%", boxSizing: "border-box", height: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)",
          color: "inherit", padding: "0 12px", font: "inherit", outline: "none" }} />
      {query && hits && hits.length === 0 && <p style={{ margin: "10px 4px 2px", opacity: 0.65 }}>No hay cards con “{q.trim()}”.</p>}
      {!query && <p style={{ margin: "10px 4px 2px", opacity: 0.65, fontSize: 13 }}>Escribí un nombre o un @usuario.</p>}
      {hits && hits.length > 0 && (
        <ul role="list" style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {hits.map(h => (
            <li key={h.handle}>
              <a href={`/${h.handle}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px", borderRadius: 12, color: "inherit", textDecoration: "none" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <span aria-hidden style={{ width: 36, height: 36, borderRadius: 10, background: h.bg, flex: "none", display: "grid", placeItems: "center", overflow: "hidden" }}>
                  {h.photo && <img src={h.photo} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: h.pfpRadius }} />}
                </span>
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>@{h.handle}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ShortcutsBar({ left = 0, right = 0, currentHandle, search }: {
  /** Space taken on each side (the editor's rail, the profile's buttons). */
  left?: number;
  right?: number;
  currentHandle?: string;
  search?: BarSearch;
}) {
  const sc = useShortcuts(true);
  const [menu, setMenu] = useState<{ s: Shortcut; x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [localSearch, setLocalSearch] = useState(false);
  // Pink dots: profiles that published since I last saw them. Being on a
  // profile (or opening it from the bar) marks it seen.
  const [changed, setChanged] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!sc.list) return;
    const r = changedSince(sc.list, readSeenSigs());
    const here = sc.list.find(s => s.handle === currentHandle);
    if (here?.sig && r.seen[here.userId] !== here.sig) { r.seen[here.userId] = here.sig; r.changed.delete(here.userId); r.dirty = true; }
    if (r.dirty) writeSeenSigs(r.seen);
    setChanged(r.changed);
  }, [sc.list, currentHandle]);
  const markSeen = (s: Shortcut) => {
    if (!s.sig) return;
    writeSeenSigs({ ...readSeenSigs(), [s.userId]: s.sig });
    setChanged(c => { const n = new Set(c); n.delete(s.userId); return n; });
  };
  const barSearch: BarSearch = search ?? { open: localSearch, onToggle: () => setLocalSearch(v => !v), panelId: "mnemo-bar-search", buttonId: "mnemo-bar-search-btn" };
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", close); };
  }, [menu]);
  if (!sc.signedIn || sc.list === null) return null;
  const items = barShortcuts(sc.list);
  const center = `calc(${left}px + (100vw - ${left + right}px) / 2)`;

  return (
    <>
      <nav data-mnemo-ui="" data-export-skip="" aria-label="Favoritos"
        style={{ position: "fixed", left: center, transform: "translateX(-50%)", bottom: 12, zIndex: 2147480900,
          maxWidth: `calc(100vw - ${left + right + 48}px)`, display: "flex", alignItems: "flex-end", pointerEvents: "none" }}>
        <div style={{ ...glass, position: "absolute", left: 0, right: 0, bottom: 0, height: 64, borderRadius: 22, pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 6, padding: "0 10px 5px", minWidth: 0 }}>
          <div style={{ paddingBottom: 7, flex: "none", pointerEvents: "auto" }}><SearchButton search={barSearch} /></div>
          <span aria-hidden style={{ width: 1, height: 30, background: "rgba(255,255,255,.14)", margin: "0 4px 12px", flex: "none" }} />
          {items.length ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, overflowX: "auto", overflowY: "hidden", paddingTop: 44, marginTop: -44,
              scrollbarWidth: "none", minWidth: 0, maxWidth: "100%", pointerEvents: "auto" }}>
              {items.map(s => <Avatar key={s.userId} s={s} current={s.handle === currentHandle} changed={changed.has(s.userId)} onOpen={markSeen}
                onMenu={(x, cx, cy) => setMenu({ s: x, x: cx, y: cy })} />)}
            </div>
          ) : (
            <span style={{ position: "relative", height: 54, display: "flex", alignItems: "center", gap: 8, padding: "0 6px", font: "500 13px system-ui, -apple-system, 'Segoe UI', sans-serif", opacity: 0.75, whiteSpace: "nowrap" }}>
              <HeartIcon size={15} /> Dale favorito a una card y aparece acá
            </span>
          )}
          {sc.list.length > 0 && <span aria-hidden style={{ width: 1, height: 30, background: "rgba(255,255,255,.14)", margin: "0 4px 12px", flex: "none" }} />}
          <div style={{ display: "flex", gap: 6, paddingBottom: 10, flex: "none", pointerEvents: "auto", position: "relative" }}>
            {sc.list.length > 0 && (
              <button type="button" style={iconBtn} onClick={() => setEditing(e => !e)} aria-label="Editar favoritos" aria-expanded={editing} title="Editar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 6h16M4 12h10M4 18h6" /></svg>
              </button>
            )}
          </div>
        </div>
      </nav>

      {!search && localSearch && <SearchPopover center={center} onClose={() => setLocalSearch(false)} />}

      {menu && (
        <div data-mnemo-ui="" data-export-skip="" role="menu" onPointerDown={e => e.stopPropagation()}
          style={{ ...glass, position: "fixed", left: Math.min(menu.x, window.innerWidth - 190), top: Math.max(8, menu.y - 104), zIndex: 2147481100,
            borderRadius: 14, padding: 6, display: "flex", flexDirection: "column", minWidth: 176, font: "500 14px system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
          <MenuItem onClick={() => { sc.setFlags(menu.s.userId, { pinned: !menu.s.pinned }); setMenu(null); }}>{menu.s.pinned ? "Desfijar" : "Fijar al principio"}</MenuItem>
          <MenuItem onClick={() => { sc.setFlags(menu.s.userId, { hidden: true }); setMenu(null); }}>Ocultar de la barra</MenuItem>
          <MenuItem onClick={() => { window.open(`/${menu.s.handle}`, "_blank"); setMenu(null); }}>Abrir en otra pestaña</MenuItem>
        </div>
      )}

      {editing && (
        <div data-mnemo-ui="" data-export-skip="" role="dialog" aria-label="Editar favoritos"
          style={{ ...glass, position: "fixed", left: center, transform: "translateX(-50%)", bottom: SHORTCUTS_BAR_H + 18, zIndex: 2147481000,
            width: "min(360px, calc(100vw - 32px))", maxHeight: "min(420px, 60vh)", overflowY: "auto", borderRadius: 18, padding: 10, boxSizing: "border-box",
            font: "500 14px system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px 8px" }}>
            <strong>Tus favoritos</strong>
            <button type="button" style={{ ...iconBtn, width: 28, height: 28 }} onClick={() => setEditing(false)} aria-label="Cerrar">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          {sc.list.map(s => (
            <div key={s.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", opacity: s.hidden ? 0.5 : 1 }}>
              <span style={{ width: 30, height: 30, borderRadius: s.pfpRadius, overflow: "hidden", background: s.bg, flex: "none" }}>
                {s.photo && <img src={s.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              </span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{s.handle}</span>
              <button type="button" onClick={() => sc.setFlags(s.userId, { pinned: !s.pinned })} aria-pressed={s.pinned} style={pill(s.pinned)}>{s.pinned ? "Fijado" : "Fijar"}</button>
              <button type="button" onClick={() => sc.setFlags(s.userId, { hidden: !s.hidden })} aria-pressed={!s.hidden} style={pill(!s.hidden)}>{s.hidden ? "Oculto" : "Visible"}</button>
            </div>
          ))}
          <p style={{ margin: "8px 4px 2px", fontSize: 12, opacity: 0.6 }}>El orden es por cuánto entrás a cada perfil. Los fijados van primero.</p>
        </div>
      )}
    </>
  );
}

function pill(on: boolean): React.CSSProperties {
  return { border: "none", borderRadius: 999, padding: "5px 10px", font: "600 12px system-ui, -apple-system, 'Segoe UI', sans-serif", cursor: "pointer",
    background: on ? "#fff" : "rgba(255,255,255,.1)", color: on ? "#111" : "inherit" };
}
function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="menuitem" onClick={onClick}
      style={{ textAlign: "left", border: "none", background: "transparent", color: "inherit", font: "inherit", padding: "9px 10px", borderRadius: 10, cursor: "pointer" }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
      {children}
    </button>
  );
}

/** Phones (2026-11-06): the same favorites as a row (the editor is
 * computer-only), with their note bubbles — like Instagram's notes row. */
export function ShortcutsRow() {
  const sc = useShortcuts(true);
  if (!sc.signedIn || !sc.list) return null;
  const items = barShortcuts(sc.list);
  return (
    <section aria-label="Tus favoritos" style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
      <span style={{ font: "600 13px system-ui, -apple-system, 'Segoe UI', sans-serif", opacity: 0.7 }}>Tus favoritos</span>
      {items.length ? (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 44, scrollbarWidth: "none" }}>
          {items.map(s => <Avatar key={s.userId} s={s} current={false} onMenu={() => {}} />)}
        </div>
      ) : (
        <span style={{ font: "500 14px system-ui, -apple-system, 'Segoe UI', sans-serif", opacity: 0.6 }}>Dale favorito a una card (el corazón) y aparece acá.</span>
      )}
    </section>
  );
}
