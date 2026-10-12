"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  INSPECTOR_OBJECTS, OBJECT_GROUPS, chipAccessibleName, chipLabel, nextTabIndex, objectModified, type ChipContext, type ObjectId,
} from "@/lib/inspectorObjects";
import { detectPlatform, PLATFORM_LABELS } from "./SocialIcons";

interface ObjectListProps {
  active:   ObjectId;
  onSelect: (id: ObjectId) => void;
  ctx:      ChipContext;
  /** id of the tabpanel the tabs control. */
  panelId:  string;
  /** Bottom sheet: 44px chips (touch). */
  sheet?:   boolean;
}

export const objectTabId = (id: ObjectId) => `mnemo-object-tab-${id}`;
const platformLabel = (url: string) => PLATFORM_LABELS[detectPlatform(url)];

// Editor v3 Phase F (design screens 02 / 10): ONE horizontal row of object
// chips under the inspector's title — it replaces Phase 2's grouped map.
// Each chip is the object's name; the orange dot marks an object with its
// own style values (objectModified — what reset would remove). The row
// scrolls sideways (the active chip is kept in view) and the three groups
// (texts · blocks · the card) are separated by a hairline.
// Still an APG tablist: roving tabindex, arrows + Home/End move AND select,
// focus stays on the chip; the body is the tabpanel labelled by the h2. The
// accessible name starts with the visible label and adds the content
// ("Nombre: Mara", WCAG 2.5.3) and ", con cambios" for the dot.
export function ObjectList({ active, onSelect, ctx, panelId, sheet }: ObjectListProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ start: false, end: false });
  const activeIndex = Math.max(0, INSPECTOR_OBJECTS.findIndex(o => o.id === active));

  function onKeyDown(e: React.KeyboardEvent) {
    const next = nextTabIndex(e.key, activeIndex, INSPECTOR_OBJECTS.length);
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(INSPECTOR_OBJECTS[next].id);
    refs.current[next]?.focus();
  }

  const updateFade = () => {
    const el = rowRef.current;
    if (!el) return;
    const start = el.scrollLeft > 1;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setFade(f => (f.start === start && f.end === end ? f : { start, end }));
  };
  // Keep the active chip in view (it may have been picked from a link or
  // from the canvas) — horizontally only, the panel never jumps.
  useLayoutEffect(() => {
    const row = rowRef.current, chip = refs.current[activeIndex];
    if (!row || !chip) return;
    const l = chip.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft, r = l + chip.offsetWidth;
    // Clear of the 36px edge fades (editor.css), focus ring included.
    if (l < row.scrollLeft + 40) row.scrollLeft = Math.max(0, l - 40);
    else if (r > row.scrollLeft + row.clientWidth - 40) row.scrollLeft = r - row.clientWidth + 40;
    updateFade();
  }, [activeIndex, sheet]);
  useEffect(() => {
    window.addEventListener("resize", updateFade);
    return () => window.removeEventListener("resize", updateFade);
  }, []);

  return (
    <div ref={rowRef} role="tablist" aria-label="Partes de la tarjeta" aria-orientation="horizontal" onKeyDown={onKeyDown}
      // A vertical mouse wheel scrolls the row sideways (the header itself
      // never scrolls, so nothing else is lost).
      onWheel={e => { const row = rowRef.current; if (row && Math.abs(e.deltaY) > Math.abs(e.deltaX)) row.scrollLeft += e.deltaY; }}
      onScroll={updateFade} className="mn-objlist" data-sheet={sheet || undefined}
      data-fade-start={fade.start || undefined} data-fade-end={fade.end || undefined}>
      {OBJECT_GROUPS.map((group, gi) => (
        <React.Fragment key={group}>
          {gi > 0 && <span role="none" aria-hidden="true" className="mn-objlist__sep" />}
          {INSPECTOR_OBJECTS.map((o, i) => {
            if (o.group !== group) return null;
            const selected = o.id === active;
            const modified = objectModified(o.id, ctx.card);
            const name = chipAccessibleName(o, o.chip(ctx), platformLabel);
            return (
              <button
                key={o.id}
                ref={el => { refs.current[i] = el; }}
                type="button"
                role="tab"
                id={objectTabId(o.id)}
                aria-selected={selected}
                aria-controls={panelId}
                aria-label={modified ? `${name}, con cambios` : name}
                tabIndex={selected ? 0 : -1}
                className="mn-objchip"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onSelect(o.id); }}
              >
                {chipLabel(o)}
                {modified && <span className="mn-objchip__dot" aria-hidden="true" />}
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
