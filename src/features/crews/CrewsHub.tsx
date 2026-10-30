"use client";
/**
 * Crews in the editor (v3, 2026-10-31): the viewer's crews and their unread
 * notices, shared by the rail (up to 10 pinned crews as emblems, a dot when
 * there is something new), the dashboard messages (CrewInbox) and the Crew
 * part of the card. Refreshed on load, on focus, every minute while visible
 * and whenever something changes them (crewsChanged()).
 * When the database isn't reachable it stays quiet: `mine` stays null and
 * nothing that depends on it (like dropping a card's chip) runs.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { T, ActionButton, Icon } from "@/ui";
import { EDITOR_UI_ATTR } from "@/lib/editorGuards";
import { crewApi, CREWS_CHANGED_EVENT } from "./crewApi";
import { crewFontStyle, googleFontsHref } from "./crewLook";
import { CREW_MAX_PINS, inkOn, timeAgo, type Crew, type CrewInboxItem, type MyCrew } from "./crewTypes";

export interface CrewsHub {
  /** null until loaded (or while the database can't be reached). */
  mine: MyCrew[] | null;
  pinned: MyCrew[];
  inbox: CrewInboxItem[];
  /** Crew ids with unread notices. */
  unread: Set<string>;
  reload: () => void;
  markRead: (ids: string[]) => void;
}

export function useCrewsHub(enabled: boolean): CrewsHub {
  const [mine, setMine] = useState<MyCrew[] | null>(null);
  const [inbox, setInbox] = useState<CrewInboxItem[]>([]);

  const reload = useCallback(() => {
    crewApi.mine().then(setMine).catch(() => { /* keep what we had */ });
    crewApi.inbox().then(setInbox).catch(() => { /* keep what we had */ });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    reload();
    const onFocus = () => { if (document.visibilityState === "visible") reload(); };
    window.addEventListener(CREWS_CHANGED_EVENT, reload);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const t = setInterval(() => { if (document.visibilityState === "visible") crewApi.inbox().then(setInbox).catch(() => {}); }, 60_000);
    return () => {
      window.removeEventListener(CREWS_CHANGED_EVENT, reload);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(t);
    };
  }, [enabled, reload]);

  const markRead = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setInbox(list => list.filter(p => !ids.includes(p.id)));
    crewApi.markRead(ids).catch(() => {});
  }, []);

  const pinned = useMemo(() => (mine ?? []).filter(m => m.pinned).slice(0, CREW_MAX_PINS), [mine]);
  const unread = useMemo(() => new Set(inbox.map(p => p.crew.id)), [inbox]);
  return { mine, pinned, inbox, unread, reload, markRead };
}

/** A crew's emblem (or its initial on its color). */
export function CrewEmblem({ crew, size }: { crew: Pick<Crew, "emblem_url" | "color" | "name" | "font">; size: number }) {
  return crew.emblem_url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={crew.emblem_url} alt="" draggable={false} style={{ width: size, height: size, objectFit: "contain", borderRadius: 999, flex: "none", display: "block" }} />
    : <span aria-hidden style={{ width: size, height: size, borderRadius: 999, background: crew.color, color: inkOn(crew.color), flex: "none", display: "grid", placeItems: "center", fontFamily: crewFontStyle(crew.font), fontWeight: 800, fontSize: Math.round(size * 0.44), lineHeight: 1 }}>{(crew.name || "?").trim().charAt(0).toUpperCase()}</span>;
}

/** The rail's crew shortcuts: tap one and its room unfolds. */
export function CrewShortcuts({ hub, onOpen }: { hub: CrewsHub; onOpen: (crew: Crew, from: DOMRect) => void }) {
  if (!hub.pinned.length) return null;
  return (
    <>
      <span aria-hidden style={{ display: "block", height: 1, margin: "4px 8px", background: T.ui.line.strong, flex: "none" }} />
      <div role="group" aria-label="Tus crews" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {hub.pinned.map(m => {
          const news = hub.unread.has(m.crew.id);
          return (
            <button key={m.crew.id} type="button" className="mn-rail__btn mn-tip" data-tip-side="right"
              data-tip={news ? `${m.crew.name} · aviso nuevo` : m.crew.name}
              aria-label={`Abrir la sala de ${m.crew.name}${news ? " (aviso nuevo)" : ""}`}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onOpen(m.crew, e.currentTarget.getBoundingClientRect()); }}
              // Up to 10: a bit shorter than the tools so the rail fits a laptop screen.
              style={{ flex: "none", height: 40 }}>
              <CrewEmblem crew={m.crew} size={30} />
              {news && <span aria-hidden style={{ position: "absolute", top: 5, right: 5, width: 10, height: 10, borderRadius: 99, background: m.crew.color, boxShadow: `0 0 0 2px ${T.ui.surface.panelOpaque}` }} />}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Dashboard messages: the unread notices of the pinned crews. */
export function CrewInbox({ hub, onOpen }: { hub: CrewsHub; onOpen: (crew: Crew) => void }) {
  const items = hub.inbox;
  const fonts = useMemo(() => googleFontsHref(items.flatMap(p => [p.crew.font, p.crew.body_font])), [items]);
  if (!items.length) return null;
  const shown = items.slice(0, 3);
  const more = items.length - shown.length;
  const byId = new Map((hub.mine ?? []).map(m => [m.crew.id, m.crew]));
  return (
    <section aria-label="Avisos de tus crews" {...{ [EDITOR_UI_ATTR]: "" }}
      style={{ position: "fixed", left: T.ui.size.railW + T.ui.size.dockMargin + 12, bottom: 64, zIndex: 900, width: "min(340px, calc(100vw - 120px))",
        display: "flex", flexDirection: "column", gap: 8, fontFamily: T.uiFont.sans }}>
      {fonts && <link rel="stylesheet" href={fonts} precedence="default" />}
      {shown.map(p => (
        <article key={p.id} role="status" style={{ position: "relative", padding: "12px 12px 10px 14px", borderRadius: 20, background: T.ui.surface.popover,
          WebkitBackdropFilter: "var(--ui-material-blur)", backdropFilter: "var(--ui-material-blur)", boxShadow: "var(--ui-shadow-panel)", color: T.ui.text.primary,
          display: "flex", flexDirection: "column", gap: 6, animation: "crew-inbox-in 320ms cubic-bezier(.2,.85,.2,1) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 30 }}>
            <CrewEmblem crew={p.crew} size={22} />
            <span style={{ fontFamily: crewFontStyle(p.crew.font), fontWeight: 800, fontSize: 14, color: p.crew.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.crew.name}</span>
            <span style={{ font: `500 11px ${T.uiFont.mono}`, color: T.ui.text.tertiary, flex: "none" }}>{timeAgo(p.created_at)}</span>
          </div>
          <p style={{ margin: 0, fontFamily: p.crew.body_font ? crewFontStyle(p.crew.body_font) : T.uiFont.sans, fontSize: 14, lineHeight: 1.4, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
            display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.body}</p>
          {p.link && (
            <a href={p.link} target="_blank" rel="noopener noreferrer" onClick={() => hub.markRead([p.id])}
              style={{ alignSelf: "flex-start", maxWidth: "100%", font: `600 12px ${T.uiFont.sans}`, color: T.ui.text.primary, textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.link.replace(/^https:\/\//, "")}
            </a>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
            <ActionButton variant="secondary" onClick={() => hub.markRead([p.id])}><Icon name="check" size={14} />Marcar como leído</ActionButton>
            <ActionButton variant="ghost" onClick={() => { hub.markRead([p.id]); const c = byId.get(p.crew.id); if (c) onOpen(c); }}>Ver sala</ActionButton>
          </div>
          <button type="button" aria-label="Cerrar aviso" title="Cerrar" onClick={() => hub.markRead([p.id])} className="mn-iconbtn"
            style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, border: "none", borderRadius: 999, background: "transparent", color: T.ui.text.secondary, cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="close" size={14} />
          </button>
        </article>
      ))}
      {more > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px" }}>
          <span style={{ font: `600 12px ${T.uiFont.sans}`, color: T.ui.text.secondary, flex: 1 }}>{more === 1 ? "1 aviso más" : `${more} avisos más`}</span>
          <ActionButton variant="ghost" onClick={() => hub.markRead(items.map(p => p.id))}>Marcar todo como leído</ActionButton>
        </div>
      )}
      <style>{"@keyframes crew-inbox-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){[aria-label='Avisos de tus crews'] article{animation:none!important}}"}</style>
    </section>
  );
}
