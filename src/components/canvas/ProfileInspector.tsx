"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import type { ProfileCardData } from "@/types";
import { InspectorShell } from "@/ui";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import { inspectorObject, type ObjectId } from "@/lib/inspectorObjects";
import { inspectorSession } from "@/lib/inspectorSession";
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
  onChange:   (patch: Partial<ProfileCardData>) => void;
  onClose:    () => void;
  returnFocusTo: () => HTMLElement | null;
  top:        number;
  width:      number;
  overlay:    boolean;
  collapsed:  boolean;
  onExpand:   () => void;
}

// Menu redesign Phase 2: the ProfileCard inspector = InspectorShell (docked
// aside, header with the object's h2) + ObjectList (tablist) + the active
// object's sections (tabpanel, ProfileConfigMenu). Remembers the active
// object and each object's scroll per card for the session
// (inspectorSession.ts).
export default function ProfileInspector({
  id, card, baseColor, linksFits, viewCount, canvas, onChange, onClose, returnFocusTo, top, width, overlay, collapsed, onExpand,
}: ProfileInspectorProps) {
  const [object, setObject] = useState<ObjectId>(() => inspectorSession.activeObject(card.id));
  const bodyRef = useRef<HTMLDivElement>(null);
  const panelId = `mnemo-inspector-panel-${card.id}`;
  const obj = inspectorObject(object);
  const effective = getProfileCardEffects(card);

  function select(id: ObjectId) {
    if (id === object) return;
    inspectorSession.setActiveObject(card.id, id);
    setObject(id);
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
    if (body) body.scrollTop = inspectorSession.scrollOf(card.id, object);
  }, [object, card.id, collapsed]);

  return (
    <InspectorShell
      id={id}
      title={obj.caption}
      context="Card de presentación"
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      top={top}
      width={width}
      overlay={overlay}
      collapsed={collapsed}
      onExpand={onExpand}
      bodyRef={bodyRef}
      onBodyScroll={e => inspectorSession.setScroll(card.id, object, e.currentTarget.scrollTop)}
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
