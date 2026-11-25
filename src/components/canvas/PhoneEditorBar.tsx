"use client";
import { useEffect, useRef, useState } from "react";
import type { PublishState } from "@/types";
import { T, Icon } from "@/ui";
import { EDITOR_UI_ATTR } from "@/lib/editorGuards";

const PUBLISH_LABEL: Record<PublishState, string> = {
  idle: "En vivo", pending: "Guardando…", publishing: "Guardando…", success: "En vivo",
};
const MORE_ID = "mnemo-phone-more";

/**
 * Editor de celular (2026-11-23): the top bar — one glass strip with
 * Deshacer, Rehacer, "Más" (Fondo de la sala, Ver mi perfil, Compartir,
 * Salir) and Publicar. 44px targets; respects the notch (safe-area).
 */
export default function PhoneEditorBar({
  handle, canUndo, canRedo, onUndo, onRedo, publishState, onPublish, onShare, onRoom, roomOpen, onLogout, onComments, unreadComments, onPreview, onSearch, onFavorites,
}: {
  handle: string;
  canUndo: boolean; canRedo: boolean;
  onUndo: () => void; onRedo: () => void;
  publishState: PublishState;
  onPublish: () => void;
  onShare?: () => void;
  onRoom: () => void;
  roomOpen: boolean;
  onLogout: () => Promise<void>;
  /** Muro: opens "tu celular" (Feed, Mi muro, Avisos); a dot when there are new notices. */
  onComments?: () => void;
  unreadComments?: boolean;
  /** Vista previa: the card as visitors see it (no editing chrome). */
  onPreview: () => void;
  /** Buscar cards (the search sheet). */
  onSearch: () => void;
  /** Tus favoritos: folds the sheet, the favorites bar shows under the card. */
  onFavorites: () => void;
}) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !moreRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);
  const run = (fn?: () => void) => () => { setOpen(false); fn?.(); };
  const dirty = publishState === "pending";

  return (
    <header {...{ [EDITOR_UI_ATTR]: "" }} className="mn-phonebar" style={{ fontFamily: T.uiFont.sans }}>
      <div className="mn-phonebar__brand">
        <img src="/logo.png" alt="" width={28} height={28} draggable={false} />
        <span className="mn-phonebar__handle">@{handle}</span>
        <span className="mn-capsule__status" data-dirty={dirty || undefined} aria-hidden="true" />
      </div>
      <div className="mn-phonebar__actions">
        <button type="button" className="mn-gbtn" aria-label="Deshacer" aria-disabled={!canUndo || undefined}
          onClick={() => { if (canUndo) onUndo(); }}>
          <Icon name="undo" size={18} />
        </button>
        <button type="button" className="mn-gbtn" aria-label="Rehacer" aria-disabled={!canRedo || undefined}
          onClick={() => { if (canRedo) onRedo(); }}>
          <Icon name="redo" size={18} />
        </button>
        <button type="button" className="mn-gbtn" aria-label="Vista previa" onClick={onPreview}>
          <Icon name="eye" size={18} />
        </button>
        <button ref={moreRef} type="button" className="mn-gbtn" aria-label="Más opciones"
          aria-expanded={open} aria-controls={open ? MORE_ID : undefined} onClick={() => setOpen(o => !o)}>
          <Icon name="more" size={18} />
          {unreadComments && <span className="mn-phonebar__dot" aria-hidden="true" />}
        </button>
        <button type="button" className="mn-pill mn-pill--live" data-state={publishState} data-tour="publish"
          onClick={dirty ? onPublish : undefined} aria-disabled={!dirty || undefined} aria-live="polite">
          {publishState === "success" && <Icon name="check" size={15} />}
          {PUBLISH_LABEL[publishState]}
        </button>
        {open && (
          <div ref={menuRef} id={MORE_ID} role="group" aria-label="Más opciones" className="mn-glassmenu mn-glassmenu--more"
            onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); setOpen(false); moreRef.current?.focus(); } }}>
            <button type="button" className="mn-glassmenu__item" onClick={run(onSearch)}>
              <Icon name="search" size={16} /><span>Buscar cards</span>
            </button>
            <button type="button" className="mn-glassmenu__item" onClick={run(onFavorites)}>
              <Icon name="star" size={16} /><span>Tus favoritos</span>
            </button>
            <button type="button" className="mn-glassmenu__item" aria-pressed={roomOpen} onClick={run(onRoom)}>
              <Icon name="room" size={16} /><span>Fondo de la sala</span>
            </button>
            <a className="mn-glassmenu__item" href={`/${handle}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              <Icon name="eye" size={16} /><span>Ver mi perfil</span>
            </a>
            {onComments && (
              <button type="button" className="mn-glassmenu__item" onClick={run(onComments)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><rect x="6.5" y="2.5" width="11" height="19" rx="2.6" /><path d="M10.5 18.2h3" /></svg><span>Tu celular{unreadComments ? " · nuevos" : ""}</span>
              </button>
            )}
            {onShare && (
              <button type="button" className="mn-glassmenu__item" onClick={run(onShare)}>
                <Icon name="share" size={16} /><span>Compartir como historia</span>
              </button>
            )}
            <button type="button" className="mn-glassmenu__item" onClick={run(() => { void onLogout(); })}>
              <span>Salir</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
