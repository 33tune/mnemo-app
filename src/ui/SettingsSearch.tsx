"use client";
import React, { useEffect, useMemo, useRef } from "react";
import { Icon } from "./icons";
import { IconButton } from "./IconButton";
import { searchSettings, normalizeSearch, settingsOf, type SettingHit, type SearchObject } from "@/lib/settingsIndex";

/** What an inspector offers to "Buscar ajuste" (Liquid glass L6). */
export interface SettingsSearchConfig {
  /** "Buscar en la tarjeta…" / "Buscar en Texto…". */
  placeholder: string;
  hits:        readonly SettingHit[];
  objectLabel: (o: SearchObject) => string;
  /** Switch to the hit's object first (a part of the card); the shell then
   * opens its card and flashes the control. */
  go?:         (hit: SettingHit) => void;
}

/** Anyone (the canvas' `/` and ⌘K) can ask the open inspector to search. */
export const OPEN_SETTINGS_SEARCH_EVENT = "mnemo:open-settings-search";
export function openSettingsSearch(): void {
  window.dispatchEvent(new Event(OPEN_SETTINGS_SEARCH_EVENT));
}
/** The visible labels the index was built from (settingsIndex.ts): the
 * shell finds the control to flash by the same text. */
export const SETTING_LABEL_SELECTOR =
  ".mn-field > span[id], .mn-lslider__label, .mn-switchrow__label, .mn-colorrow__label, .mn-tile__name, .mn-numfield__label, .mn-label, .mn-corners__label";

/** True for a `/` that should open the search (not typing in a field). */
export function isSearchShortcut(e: KeyboardEvent | React.KeyboardEvent): boolean {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") return true;
  if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return false;
  const t = e.target as HTMLElement | null;
  return !(t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"));
}

// DS dock search (Editor.dc.html): the field replaces the header row (with
// "Cerrar búsqueda"), the body lists the matching settings — icon well, the
// control (· its tile), "Objeto › Card" — and Enter takes the first one.
// A combobox-free pattern on purpose: a search field + a plain list of
// buttons (Tab / ↓ reach them; the count is announced politely).
export function SettingsSearchRow({ query, placeholder, onQuery, onClose, onFirst, onDown }: {
  query: string; placeholder: string; onQuery: (q: string) => void; onClose: () => void; onFirst: () => void; onDown: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div className="mn-search">
        <Icon name="search" size={16} />
        <input ref={ref} type="search" value={query} placeholder={placeholder} aria-label="Buscar ajuste" autoComplete="off" spellCheck={false}
          onChange={e => onQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
            else if (e.key === "Enter") { e.preventDefault(); onFirst(); }
            else if (e.key === "ArrowDown") { e.preventDefault(); onDown(); }
          }} />
      </div>
      <IconButton icon="close" aria-label="Cerrar búsqueda" title="Cerrar búsqueda   esc" size={44} iconSize={14}
        className="mn-iconbtn--filled" onClick={() => onClose()} />
    </div>
  );
}

export function SettingsSearchResults({ config, query, onGo, listRef }: {
  config: SettingsSearchConfig; query: string; onGo: (hit: SettingHit) => void; listRef: React.RefObject<HTMLDivElement | null>;
}) {
  const results = useMemo(() => searchSettings(config.hits, query, config.objectLabel), [config, query]);
  const label = normalizeSearch(query) ? `${results.length} ajuste${results.length === 1 ? "" : "s"}` : "Todos los ajustes";
  const move = (e: React.KeyboardEvent, d: 1 | -1) => {
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>(".mn-result") ?? [])];
    const i = items.indexOf(e.target as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    if (i + d < 0) (listRef.current?.closest("aside")?.querySelector<HTMLInputElement>(".mn-search input"))?.focus();
    else items[Math.min(items.length - 1, i + d)]?.focus();
  };
  return (
    <div ref={listRef} className="mn-results" role="group" aria-label="Resultados">
      <div className="mn-label mn-results__label" aria-live="polite">{label}</div>
      {results.map(h => (
        <button key={`${h.object}|${h.card}|${h.tile ?? ""}|${h.label ?? ""}`} type="button" className="mn-result"
          onKeyDown={e => { if (e.key === "ArrowDown") move(e, 1); else if (e.key === "ArrowUp") move(e, -1); }}
          onClick={() => onGo(h)}>
          <span className="mn-result__well" aria-hidden><Icon name={h.icon} size={16} /></span>
          <span className="mn-result__text">
            <span className="mn-result__label">{h.label ? (h.tile ? `${h.label} · ${h.tile}` : h.label) : h.card}</span>
            <span className="mn-result__path">{config.objectLabel(h.object)} › {h.card}</span>
          </span>
          <Icon name="chevron-right" size={14} />
        </button>
      ))}
      {results.length === 0 && <div className="mn-results__empty">Nada con ese nombre en este objeto</div>}
    </div>
  );
}

const wait = () => new Promise<void>(r => requestAnimationFrame(() => r()));
const textOf = (el: Element) => normalizeSearch((el.firstChild?.nodeType === 3 ? el.firstChild.textContent : el.textContent) ?? "");
function cardTitle(c: Element): string {
  const h = c.classList.contains("mn-card--pinned") ? c.querySelector(":scope > .mn-label") : c.querySelector(".mn-card__title > span[id]");
  return normalizeSearch(h?.textContent ?? "");
}

/** After a search hit: wait for its card (the part may have just changed),
 * open its tile's "Ajustes de X" and any closed "Más ajustes", then scroll
 * the control into view, flash it (DS ml-flash) and move focus into it. */
export async function revealSetting(body: HTMLElement | null, hit: SettingHit, reducedMotion: boolean): Promise<void> {
  let card: Element | undefined;
  for (let i = 0; i < 24 && !card; i++) {
    await wait();
    card = [...(body?.querySelectorAll("section.mn-card, .mn-card--pinned") ?? [])].find(c => cardTitle(c) === normalizeSearch(hit.card));
    if (card?.matches("section.mn-card") && !card.hasAttribute("data-open")) card = undefined;
  }
  if (!card) return;
  if (hit.tile) {
    const more = card.querySelector<HTMLButtonElement>(`.mn-tile__more[aria-label="Ajustes de ${hit.tile}"]`);
    if (more && more.getAttribute("aria-expanded") !== "true") { more.click(); await wait(); }
  }
  const scope = (hit.tile ? card.querySelector(".mn-tile__detail") : null) ?? card;
  const find = () => hit.label
    ? [...scope.querySelectorAll(SETTING_LABEL_SELECTOR)].find(el => textOf(el) === normalizeSearch(hit.label!) && (hit.tile || !el.closest(".mn-tile__detail")))
    : undefined;
  let el = find();
  if (!el && hit.label) {
    for (const m of scope.querySelectorAll<HTMLButtonElement>(".mn-collapse__btn[aria-expanded='false']")) m.click();
    await wait();
    el = find();
  }
  const target = (el?.closest(".mn-tile, .mn-switchrow, .mn-colorrow, .mn-lslider-row, .mn-field, .mn-subsection, .mn-numfield") ?? el ?? card) as HTMLElement;
  target.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  target.removeAttribute("data-flash");
  void target.offsetWidth;
  target.setAttribute("data-flash", "");
  window.setTimeout(() => target.removeAttribute("data-flash"), 3000);
  const focusable = (target.tabIndex >= 0 ? target
    : target.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button, [tabindex='0']")) as HTMLElement | null;
  (focusable ?? card.querySelector<HTMLElement>(".mn-card__btn"))?.focus({ preventScroll: true });
}

const ELEMENT_SEARCH = new Map<SearchObject, SettingsSearchConfig>();
/** A loose element's / Tu sala's search: its own settings only (DS: "Buscar
 * en Texto…"). Stable per object, so the results memo holds. */
export function elementSearch(object: "text" | "image" | "music" | "room", title: string): SettingsSearchConfig {
  let c = ELEMENT_SEARCH.get(object);
  if (!c) {
    c = { placeholder: `Buscar en ${title}…`, hits: settingsOf([object]), objectLabel: () => title };
    ELEMENT_SEARCH.set(object, c);
  }
  return c;
}
