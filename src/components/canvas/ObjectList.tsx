"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/ui";
import {
  PART_IDS, PART_ORDER, chipAccessibleName, inspectorObject, nextTabIndex, objectModified, type ChipContext, type ObjectId,
} from "@/lib/inspectorObjects";
import { detectPlatform, PLATFORM_LABELS } from "./SocialIcons";

interface ObjectListProps {
  active:   ObjectId;
  onSelect: (id: ObjectId) => void;
  ctx:      ChipContext;
  /** id of the tabpanel the tabs control. */
  panelId:  string;
  /** Bottom sheet (touch): same 44px parts. */
  sheet?:   boolean;
}

export const objectTabId = (id: ObjectId) => `mnemo-object-tab-${id}`;
const platformLabel = (url: string) => PLATFORM_LABELS[detectPlatform(url)];

/** Each part's glyph (design menu-schema.js OBJECTS[*].icon). */
const PART_ICON: Record<ObjectId, IconName> = {
  photo: "user", name: "text", handle: "at", descriptor: "quote", location: "pin", bio: "align-left", views: "eye",
  links: "link", logo: "shapes", cardBg: "palette", cardFx: "sparkles", allText: "case",
};
export const partIcon = (id: ObjectId): IconName => PART_ICON[id];

// Liquid glass (L2, DS PartPicker): ONE row of round 44px part buttons under
// the dock's title — the photo as a thumbnail, the background as a swatch,
// the rest as glyphs; the selected part sits on the neutral `on` fill and
// pops; the accent dot marks a part with its own values (objectModified).
// The tooltip is the part's name. Still an APG tablist (roving tabindex,
// arrows + Home/End move AND select); the accessible name starts with the
// visible tooltip label and adds the content ("Nombre: Mara", 2.5.3).
export function ObjectList({ active, onSelect, ctx, panelId, sheet }: ObjectListProps) {
  const refs = useRef<Partial<Record<ObjectId, HTMLButtonElement | null>>>({});
  const rowRef = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);
  const activeIndex = Math.max(0, PART_IDS.indexOf(active));

  function onKeyDown(e: React.KeyboardEvent) {
    const next = nextTabIndex(e.key, activeIndex, PART_IDS.length);
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    const id = PART_IDS[next];
    onSelect(id);
    refs.current[id]?.focus();
  }

  // Keep the active part in view (it may have been picked on the card) —
  // horizontally only, the panel never jumps.
  useLayoutEffect(() => {
    const row = rowRef.current, el = refs.current[active];
    if (!row || !el) return;
    const l = el.offsetLeft - 20, r = el.offsetLeft + el.offsetWidth + 20;
    if (l < row.scrollLeft) row.scrollTo({ left: l, behavior: "smooth" });
    else if (r > row.scrollLeft + row.clientWidth) row.scrollTo({ left: r - row.clientWidth, behavior: "smooth" });
    force(x => x);
  }, [active, sheet]);

  const bg = ctx.effective;
  const swatch = bg.gradient ? `linear-gradient(135deg, ${bg.gradient.from}, ${bg.gradient.to})` : bg.bg?.color;

  return (
    <div ref={rowRef} role="tablist" aria-label="Partes de la tarjeta" aria-orientation="horizontal" onKeyDown={onKeyDown}
      // A vertical mouse wheel scrolls the row sideways.
      onWheel={e => { const row = rowRef.current; if (row && Math.abs(e.deltaY) > Math.abs(e.deltaX)) row.scrollLeft += e.deltaY; }}
      className="mn-parts" data-sheet={sheet || undefined}>
      {PART_ORDER.map((p, i) => {
        if (p === "|") return <span key={`sep${i}`} role="none" aria-hidden="true" className="mn-parts__sep" />;
        const o = inspectorObject(p);
        const selected = p === active;
        const modified = objectModified(p, ctx.card);
        const name = chipAccessibleName(o, o.chip(ctx), platformLabel);
        const caption = o.shortCaption ?? o.caption;
        return (
          <button
            key={p}
            ref={el => { refs.current[p] = el; }}
            type="button"
            role="tab"
            id={objectTabId(p)}
            data-part={p}
            aria-selected={selected}
            aria-controls={panelId}
            aria-label={modified ? `${name}, con cambios` : name}
            data-tip={caption}
            tabIndex={selected ? 0 : -1}
            className="mn-part mn-tip"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onSelect(p); }}
          >
            {p === "photo" && ctx.card.photo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={ctx.card.photo} alt="" className="mn-part__img" draggable={false} />
              : p === "cardBg" && swatch
                ? <span className="mn-part__sw" style={{ background: swatch }} />
                : <Icon name={PART_ICON[p]} size={18} />}
            {modified && <span className="mn-part__dot" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
