"use client";
/**
 * Buscar (rail, 2026-11-03): find other people's cards by @handle or name.
 * The dock panel, built with the editor's parts so it follows the editor's
 * theme. Each result shows the card's photo, name and colors; tapping one
 * opens that profile in a new tab (the editor stays as it was).
 */
import { useEffect, useRef, useState } from "react";
import { InspectorShell, MenuNote, TextInput, Icon, T } from "@/ui";
import { cleanSearchQuery, type SearchHit } from "@/lib/userSearch";

export interface SearchPanelProps {
  id?: string;
  onClose: () => void;
  returnFocusTo: () => HTMLElement | null;
  top: number;
  width: number;
  mode: "dock" | "sheet";
  height?: number;
  collapsed: boolean;
  onExpand: () => void;
}

export default function SearchPanel(p: SearchPanelProps) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);
  const query = cleanSearchQuery(q);

  useEffect(() => {
    if (!query) { setHits(null); setFailed(false); return; }
    const my = ++seq.current;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then(r => r.json())
        .then((d: { results?: SearchHit[] }) => { if (my === seq.current) { setHits(d.results ?? []); setFailed(false); } })
        .catch(e => { if (my === seq.current && (e as Error).name !== "AbortError") setFailed(true); });
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  return (
    <InspectorShell
      id={p.id}
      title="Buscar"
      icon="search"
      path="cards de myLand"
      onClose={p.onClose}
      returnFocusTo={p.returnFocusTo}
      top={p.top}
      width={p.width}
      mode={p.mode}
      height={p.height}
      collapsed={p.collapsed}
      onExpand={p.onExpand}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <TextInput label="Buscar cards" placeholder="Nombre o @usuario" value={q} maxLength={40} onChange={setQ} />
        {!query && <MenuNote>Escribí un nombre o un @usuario para encontrar su card.</MenuNote>}
        {failed && <MenuNote tone="warn">No pudimos buscar. Probá de nuevo.</MenuNote>}
        {query && hits && hits.length === 0 && !failed && <MenuNote>No hay cards con “{q.trim()}”.</MenuNote>}
        {hits && hits.length > 0 && (
          <ul role="list" aria-label="Resultados" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {hits.map(h => (
              <li key={h.handle}>
                <a href={`/${h.handle}`} target="_blank" rel="noopener" className="mn-searchhit"
                  aria-label={`${h.name}, @${h.handle}. Abrir su card en otra pestaña`}
                  style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "6px 10px 6px 6px", borderRadius: 16,
                    background: T.ui.surface.control, color: T.ui.text.primary, textDecoration: "none" }}>
                  <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: h.bg, flex: "none", display: "grid", placeItems: "center", overflow: "hidden" }}>
                    {h.photo
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={h.photo} alt="" loading="lazy" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: h.pfpRadius }} />
                      : <span style={{ color: h.nameColor, display: "grid" }}><Icon name="user" size={18} /></span>}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ font: `600 14px ${T.uiFont.sans}`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                    <span style={{ font: `500 12px ${T.uiFont.mono}`, color: T.ui.text.tertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{h.handle}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </InspectorShell>
  );
}
