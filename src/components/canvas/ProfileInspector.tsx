"use client";
import React, { useLayoutEffect, useMemo, useRef } from "react";
import type { ProfileCardData } from "@/types";
import { InspectorShell, CardPaletteProvider } from "@/ui";
import { cardPalette } from "@/lib/cardPalette";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import { inspectorObject, chipLabel, PART_IDS, type ObjectId } from "@/lib/inspectorObjects";
import { settingsOf } from "@/lib/settingsIndex";
import type { SettingsSearchConfig } from "@/ui/SettingsSearch";
import type { SelectionMemory } from "@/lib/editorSelection";
import { INSPECTOR_TITLE_ID } from "@/ui/InspectorShell";
import { ObjectList, partIcon } from "./ObjectList";
import ProfileConfigMenu from "./ProfileConfigMenu";

interface ProfileInspectorProps {
  /** The aside's id ("Editar"'s aria-controls). */
  id?:        string;
  card:       ProfileCardData;
  baseColor:  string;
  linksFits?: boolean;
  buttonsFits?: boolean;
  viewCount?: number;
  canvas?:    { w: number; h: number; topOffset: number };
  /** Controlled (Editor v3 Phase B): the active object comes from the
   * editor selection (editorSelection.ts), never from local state. */
  object:     ObjectId;
  onSelectObject: (id: ObjectId) => void;
  /** Session memory for the body's scroll per object. */
  memory:     SelectionMemory;
  onChange:   (patch: Partial<ProfileCardData>) => void;
  onClose:    () => void;
  returnFocusTo: () => HTMLElement | null;
  top:        number;
  width:      number;
  mode:       "dock" | "sheet";
  height?:    number;
  collapsed:  boolean;
  onExpand:   () => void;
}

// The ProfileCard inspector = InspectorShell (docked aside or bottom sheet,
// header with the object's h2 and, under it, ObjectList — the tablist) + the active object's
// sections (tabpanel, ProfileConfigMenu). Phase B: mounted by EditorHost
// (CanvasBoard level), CONTROLLED by the editor selection; it only restores
// and records the body scroll per object (session memory).
export default function ProfileInspector({
  id, card, baseColor, linksFits, buttonsFits, viewCount, canvas, object, onSelectObject, memory,
  onChange, onClose, returnFocusTo, top, width, mode, height, collapsed, onExpand,
}: ProfileInspectorProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const panelId = `mnemo-inspector-panel-${card.id}`;
  const obj = inspectorObject(object);
  const effective = getProfileCardEffects(card);

  // Liquid glass L6: "Buscar en la tarjeta…" — every part's settings; a hit
  // on another part switches to it first (the shell then opens the card and
  // flashes the control).
  const selectRef = useRef(onSelectObject);
  selectRef.current = onSelectObject;
  const objectRef = useRef(object);
  objectRef.current = object;
  const search = useMemo<SettingsSearchConfig>(() => ({
    placeholder: "Buscar en la tarjeta…",
    hits: settingsOf(PART_IDS, o => partIcon(o as ObjectId)),
    objectLabel: o => chipLabel(inspectorObject(o as ObjectId)),
    go: h => { if (h.object !== objectRef.current) selectRef.current(h.object as ObjectId); },
  }), []);

  function select(id: ObjectId) {
    if (id === object) return;
    onSelectObject(id);
  }
  // r2: in-section links switch object; the link itself unmounts with the
  // old body, so focus goes to the new object's h2 (never <body>).
  function goTo(id: ObjectId) {
    select(id);
    requestAnimationFrame(() => document.getElementById(INSPECTOR_TITLE_ID)?.focus({ preventScroll: true }));
  }
  // Restore the remembered scroll of the object just shown (and on reopen).
  useLayoutEffect(() => {
    if (collapsed) return;
    const body = bodyRef.current;
    if (body) body.scrollTop = memory.scrollOf(card.id, object);
  }, [object, card.id, collapsed, memory]);

  return (
    <InspectorShell
      id={id}
      // Liquid glass header (DS dock): the part's glyph, its name, the route
      // in mono; the part picker stays fixed under it while the cards scroll.
      title={chipLabel(obj)}
      icon={partIcon(object)}
      path={`tarjeta / ${chipLabel(obj).toLowerCase()}`}
      search={search}
      headerExtra={
        <ObjectList active={object} onSelect={select} panelId={panelId} sheet={mode === "sheet"}
          ctx={{ card, effective, baseColor, viewCount }} />
      }
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      top={top}
      width={width}
      mode={mode}
      height={height}
      collapsed={collapsed}
      onExpand={onExpand}
      bodyRef={bodyRef}
      onBodyScroll={e => memory.setScroll(card.id, object, e.currentTarget.scrollTop)}
    >
      <div role="tabpanel" id={panelId} aria-labelledby={INSPECTOR_TITLE_ID} data-object={object}>
        {/* Liquid glass: "Tu tarjeta" — the card's own colors for every color row. */}
        <CardPaletteProvider value={cardPalette(card, effective)}>
          <ProfileConfigMenu object={object} card={card} baseColor={baseColor} linksFits={linksFits}
            buttonsFits={buttonsFits}
            canvas={canvas} onChange={onChange} goTo={goTo} />
        </CardPaletteProvider>
      </div>
    </InspectorShell>
  );
}
