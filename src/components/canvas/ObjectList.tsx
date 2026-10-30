"use client";
import React, { useRef } from "react";
import { Icon, Tabs, type IconName } from "@/ui";
import {
  PART_GROUPS, partGroupOf, chipAccessibleName, inspectorObject, nextTabIndex, objectModified, type ChipContext, type ObjectId, type PartGroupId,
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
  photo: "user", name: "text", handle: "at", descriptor: "quote", location: "pin", bio: "align-left", about: "about", views: "eye",
  links: "link", buttons: "align-justify", crew: "crew", logo: "shapes", cardBg: "palette", cardFx: "sparkles", allText: "case", stickers: "star",
};
export const partIcon = (id: ObjectId): IconName => PART_ICON[id];

// Liquid glass (L2, DS PartPicker) + groups (user decision, 2026-10-14):
// a segmented control picks the group (Tarjeta / Perfil / Contenido) and
// under it the group's round 44px part buttons, each with its name below
// (always visible — the glyphs alone hid what they were, and the old single
// row hid half the parts off-screen). The photo is a thumbnail, the
// background a swatch; the selected part sits on the neutral `on` fill and
// pops; the accent dot marks a part with its own values (objectModified).
// Picking a group opens the part last used in it (else its first one), so
// the group is always the active part's group — one state, never two.
// The parts row is an APG tablist (roving tabindex, arrows + Home/End move
// AND select inside the group); the accessible name starts with the visible
// name and adds the content ("Nombre: Mara", 2.5.3).
export function ObjectList({ active, onSelect, ctx, panelId, sheet }: ObjectListProps) {
  const refs = useRef<Partial<Record<ObjectId, HTMLButtonElement | null>>>({});
  const group = partGroupOf(active);
  const lastInGroup = useRef<Partial<Record<PartGroupId, ObjectId>>>({});
  lastInGroup.current[group.id] = active;
  const activeIndex = Math.max(0, group.parts.indexOf(active));

  function onKeyDown(e: React.KeyboardEvent) {
    const next = nextTabIndex(e.key, activeIndex, group.parts.length);
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    const id = group.parts[next];
    onSelect(id);
    refs.current[id]?.focus();
  }
  function selectGroup(id: string) {
    const g = PART_GROUPS.find(x => x.id === id);
    if (!g || g.id === group.id) return;
    onSelect(lastInGroup.current[g.id] ?? g.parts[0]);
  }

  const bg = ctx.effective;
  const swatch = bg.gradient ? `linear-gradient(135deg, ${bg.gradient.from}, ${bg.gradient.to})` : bg.bg?.color;

  return (
    <div className="mn-partpicker" data-sheet={sheet || undefined}>
      <Tabs label="Grupo de partes" active={group.id} onChange={selectGroup}
        tabs={PART_GROUPS.map(g => ({ id: g.id, label: g.label, icon: GROUP_ICON[g.id], withText: true }))} />
      <div role="tablist" aria-label={`Partes: ${group.label}`} aria-orientation="horizontal" onKeyDown={onKeyDown} className="mn-parts">
        {group.parts.map(p => {
          const o = inspectorObject(p);
          const selected = p === active;
          const modified = objectModified(p, ctx.card);
          const name = chipAccessibleName(o, o.chip(ctx), platformLabel);
          const caption = o.shortCaption ?? o.caption;
          return (
            <div key={p} role="none" className="mn-partcell" data-selected={selected || undefined}>
              <button
                ref={el => { refs.current[p] = el; }}
                type="button"
                role="tab"
                id={objectTabId(p)}
                data-part={p}
                aria-selected={selected}
                aria-controls={panelId}
                aria-label={modified ? `${name}, con cambios` : name}
                tabIndex={selected ? 0 : -1}
                className="mn-part"
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
              {/* The visible name (the button's accessible name starts with it). */}
              <span className="mn-part__label" aria-hidden="true" onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onSelect(p); }}>{caption}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const GROUP_ICON: Record<PartGroupId, IconName> = { card: "card", profile: "user", content: "shapes" };
