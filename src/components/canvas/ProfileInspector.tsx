"use client";
import React, { useLayoutEffect, useRef } from "react";
import type { ProfileCardData } from "@/types";
import { InspectorShell } from "@/ui";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import { inspectorObject, type ObjectId } from "@/lib/inspectorObjects";
import type { SelectionMemory } from "@/lib/editorSelection";
import { INSPECTOR_TITLE_ID } from "@/ui/InspectorShell";
import { ObjectList } from "./ObjectList";
import ProfileConfigMenu from "./ProfileConfigMenu";

interface ProfileInspectorProps {
  /** The aside's id ("Editar"'s aria-controls). */
  id?:        string;
  card:       ProfileCardData;
  baseColor:  string;
  linksFits?: boolean;
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
// header with the object's h2) + ObjectList (tablist) + the active object's
// sections (tabpanel, ProfileConfigMenu). Phase B: mounted by EditorHost
// (CanvasBoard level), CONTROLLED by the editor selection; it only restores
// and records the body scroll per object (session memory).
export default function ProfileInspector({
  id, card, baseColor, linksFits, viewCount, canvas, object, onSelectObject, memory,
  onChange, onClose, returnFocusTo, top, width, mode, height, collapsed, onExpand,
}: ProfileInspectorProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const panelId = `mnemo-inspector-panel-${card.id}`;
  const obj = inspectorObject(object);
  const effective = getProfileCardEffects(card);

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
      title={obj.caption}
      context="Card de presentación"
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
      <ObjectList active={object} onSelect={select} panelId={panelId}
        ctx={{ card, effective, baseColor, viewCount }} />
      <div role="tabpanel" id={panelId} aria-labelledby={INSPECTOR_TITLE_ID} data-object={object}>
        <ProfileConfigMenu object={object} card={card} baseColor={baseColor} linksFits={linksFits}
          canvas={canvas} onChange={onChange} goTo={goTo} />
      </div>
    </InspectorShell>
  );
}
