"use client";
/**
 * The crew's house over the whole screen (Crews, 2026-10-30) — still the
 * dashboard, nothing navigates away. Esc or "Cerrar" goes back.
 * It opens like a glass window unfolding from the button that opened it.
 * The founder and admins edit the crew here (`edit`): the menu slides in on the right
 * and the room redraws with every change (CrewEditPanel).
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { EDITOR_UI_ATTR } from "@/lib/editorGuards";
import { crewApi } from "./crewApi";
import CrewHouseView from "./CrewHouseView";
import { CrewEditPanel, CREW_EDIT_PANEL_W } from "./CrewEditPanel";
import { isAdminRole, type Crew, type CrewHouse } from "./crewTypes";

/** Over the dock and the beta bits; under the first-time tour. */
const OVERLAY_Z = 2147481800;
const OPEN_MS = 560, CLOSE_MS = 320;

export interface CrewOverlayEdit {
  /** Open straight into the editor. */
  start?: boolean;
  /** Saved: the panel's list refreshes. */
  onSaved?: () => void;
  /** The crew was deleted, or the viewer left it. */
  onGone: () => void;
}

export function CrewHouseOverlay({ slug, onClose, inEditor = true, from, initial, edit }: {
  slug: string;
  onClose: () => void;
  /** Over the editor: profiles open in a new tab. Over a public profile (its
   * crew chip): they open here. */
  inEditor?: boolean;
  /** Where it unfolds from (the button that opened it). */
  from?: DOMRect | null;
  /** The house already loaded (no blank frame while it fetches). */
  initial?: CrewHouse | null;
  /** In the editor: the founder and admins edit the crew here. */
  edit?: CrewOverlayEdit;
}) {
  const [house, setHouse] = useState<CrewHouse | null | undefined>(initial ?? undefined);
  const [editing, setEditing] = useState(!!edit?.start);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  // While editing, the crew shown is the edit menu's draft; the rest refreshes.
  const reload = useCallback(() => {
    crewApi.house(slug)
      .then(h => setHouse(prev => (prev && h && editingRef.current && prev.crew.id === h.crew.id ? { ...h, crew: prev.crew } : h)))
      .catch(() => setHouse(h => h ?? null));
  }, [slug]);
  useEffect(() => { reload(); }, [reload]);

  const [closing, setClosing] = useState(false);
  const [frostDone, setFrostDone] = useState(false);
  // The menu waits for the window to open; switching to edit later, it comes in at once.
  const panelDelay = useRef(edit?.start ? Math.round(OPEN_MS * 0.55) : 0);
  const reduce = useReducedMotion();
  const narrow = useNarrow();

  const close = useCallback(() => {
    if (closing) return;
    if (reduce) { onClose(); return; }
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  }, [closing, reduce, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Inside the edit menu (or one of its pickers) Esc is theirs.
      const t = e.target as Element | null;
      if (t?.closest?.("[data-crew-editor],[data-mnemo-editor]")) return;
      e.stopPropagation(); close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [close]);

  const onDraft = useCallback((crew: Crew) => setHouse(h => (h ? { ...h, crew } : h)), []);

  if (typeof document === "undefined") return null;
  const canEdit = !!edit && isAdminRole(house?.me?.role);
  const showPanel = canEdit && editing;
  const fromClip = clipFrom(from);
  const side = showPanel && !narrow;

  return createPortal(
    <div {...{ [EDITOR_UI_ATTR]: "" }} data-popover-z={OVERLAY_Z + 10} role="dialog" aria-modal="true"
      aria-label={house ? `Sala de ${house.crew.name}` : "Sala del crew"}
      onKeyDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
      className={reduce ? undefined : closing ? "crew-fold" : "crew-unfold"}
      style={{ position: "fixed", inset: 0, zIndex: OVERLAY_Z, overflowY: "auto", overscrollBehavior: "contain", background: "#0E0C12",
        ["--crew-from" as string]: fromClip } as CSSProperties}>
      <style>{OVERLAY_CSS}</style>
      {house === undefined ? null : house === null ? (
        <div style={{ minHeight: "100%", display: "grid", placeItems: "center", color: "#fff", font: "600 15px var(--font-sans)" }}>
          No se pudo abrir la sala. <button type="button" onClick={close} style={{ marginTop: 12 }}>Cerrar</button>
        </div>
      ) : (
        <CrewHouseView house={house} reload={reload}
          onClose={close} closeSide="left" padRight={side ? CREW_EDIT_PANEL_W + 32 : 0}
          onEdit={canEdit && !editing ? () => setEditing(true) : undefined} editing={showPanel} newTabProfiles={inEditor}
          onLeft={() => { edit?.onGone(); close(); }} />
      )}
      {/* The frosted glass the window unfolds from; it clears as it opens. */}
      {!reduce && (closing || !frostDone) && (
        <div aria-hidden className={closing ? "crew-frost crew-frost--in" : "crew-frost"} onAnimationEnd={() => { if (!closing) setFrostDone(true); }} />
      )}
      {showPanel && house && (
        <div className={reduce ? undefined : "crew-panel-in"} style={{ ["--crew-panel-delay" as string]: `${panelDelay.current}ms` } as CSSProperties}
          onAnimationEnd={() => { panelDelay.current = 0; }}>
          <CrewEditPanel crew={house.crew} isOwner={house.me?.role === "owner"} onDraft={onDraft} sheet={narrow}
            onDone={() => { setEditing(false); reload(); }} onSaved={edit?.onSaved}
            onGone={() => { edit?.onGone(); onClose(); }} />
        </div>
      )}
    </div>,
    document.body,
  );
}

/** clip-path inset() that shows only `r` (a rounded window), or a centered one. */
function clipFrom(r?: DOMRect | null): string {
  if (typeof window === "undefined") return "inset(0)";
  const W = window.innerWidth, H = window.innerHeight;
  if (!r) return `inset(${H * 0.18}px ${W * 0.18}px ${H * 0.18}px ${W * 0.18}px round 32px)`;
  const t = Math.max(0, r.top), l = Math.max(0, r.left);
  return `inset(${t}px ${Math.max(0, W - r.right)}px ${Math.max(0, H - r.bottom)}px ${l}px round 22px)`;
}

function useReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

/** Below this the edit menu is a bottom sheet (the room keeps the width). */
function useNarrow(): boolean {
  const [n, setN] = useState(false);
  useEffect(() => {
    const on = () => setN(window.innerWidth < 900);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return n;
}

const OVERLAY_CSS = `
@keyframes crew-unfold { from { clip-path: var(--crew-from); } to { clip-path: inset(0 round 0); } }
@keyframes crew-fold { from { clip-path: inset(0 round 0); opacity: 1; } to { clip-path: var(--crew-from); opacity: 0; } }
@keyframes crew-frost-out { from { opacity: 1; } 55% { opacity: .85; } to { opacity: 0; } }
@keyframes crew-frost-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes crew-panel-fade { from { opacity: 0; } to { opacity: 1; } }
.crew-unfold { animation: crew-unfold ${OPEN_MS}ms cubic-bezier(.2,.85,.2,1) both; }
.crew-fold { animation: crew-fold ${CLOSE_MS}ms cubic-bezier(.4,0,.8,.4) both; }
.crew-frost { position: fixed; inset: 0; pointer-events: none; z-index: 2;
  background: linear-gradient(135deg, rgba(255,255,255,.22), rgba(255,255,255,.06) 45%, rgba(255,255,255,.14));
  -webkit-backdrop-filter: blur(22px) saturate(160%); backdrop-filter: blur(22px) saturate(160%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.35);
  animation: crew-frost-out ${OPEN_MS + 140}ms ease-out both; }
.crew-frost--in { animation: crew-frost-in ${CLOSE_MS}ms ease-in both; }
/* Opacity only on the wrapper (a transform would trap the fixed dock); the dock slides in by itself. */
.crew-panel-in { animation: crew-panel-fade 380ms ease-out var(--crew-panel-delay, 0ms) both; }
`;
