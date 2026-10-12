"use client";
import React from "react";
import { createPortal } from "react-dom";
import type { ProfileCardData } from "@/types";
import { profileEditButtonId, profileInspectorId, type EditorTarget, type SelectionMemory } from "@/lib/editorSelection";
import type { ObjectId } from "@/lib/inspectorObjects";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import { cardBaseColor } from "@/lib/cardColors";
import ProfileInspector from "./ProfileInspector";
import RoomInspector from "./RoomInspector";
import LayersPanel from "./LayersPanel";

type RoomProps = Omit<React.ComponentProps<typeof RoomInspector>,
  "onClose" | "returnFocusTo" | "top" | "width" | "mode" | "height" | "collapsed" | "onExpand" | "id">;

type LayersProps = Omit<React.ComponentProps<typeof LayersPanel>,
  "onClose" | "returnFocusTo" | "top" | "width" | "mode" | "height" | "collapsed" | "onExpand" | "id">;

/** id of the rail's "Tu sala" button (where focus returns when it closes). */
export const RAIL_ROOM_BUTTON_ID = "mnemo-rail-room";
/** Editor v3 Phase E: the rail's "Capas" button and the panel's id. */
export const RAIL_LAYERS_BUTTON_ID = "mnemo-rail-layers";
export const LAYERS_PANEL_ID = "mnemo-layers-panel";

/** Render-time facts about a ProfileCard that only its render knows
 * (composition / views). ProfileCard reports them while its inspector is
 * open (onEditorFacts); the host never recomputes the composition. */
export interface ProfileEditorFacts {
  /** Contact Links still fit in the card (computeBlockLayout's verdict);
   * undefined = not applicable (free layout / no links). */
  linksFits?: boolean;
  viewCount?: number;
}

export interface EditorHostLayout {
  mode:      "dock" | "sheet";
  width:     number;
  /** Sheet height (mode "sheet"). */
  height:    number;
  collapsed: boolean;
}

interface EditorHostProps {
  /** What the inspector edits (editorSelection.ts); null = closed. */
  target:    EditorTarget | null;
  /** The ProfileCard of a "profile" target (undefined if it is gone). */
  profile?:  ProfileCardData;
  facts?:    ProfileEditorFacts;
  /** "Tu sala" (target kind "room"): the room values + writers. */
  room?:     RoomProps;
  /** "Capas" (target kind "layers"): the stacking list + writers. */
  layers?:   LayersProps;
  /** Where focus returns when Capas closes (the rail button, or "+"). */
  layersReturnFocus?: () => HTMLElement | null;
  canvas?:   { w: number; h: number; topOffset: number };
  top:       number;
  layout:    EditorHostLayout;
  memory:    SelectionMemory;
  onSelectObject: (id: ObjectId) => void;
  updateProfile:  (id: string, patch: Partial<ProfileCardData>) => void;
  onClose:   () => void;
  onExpand:  () => void;
}

// Editor v3 Phase B (D2): the ONE place the inspector is mounted — at
// CanvasBoard level, portaled to <body> (never inside the canvas wrapper,
// whose view-offset transform would re-anchor a position:fixed box).
// ProfileCard no longer mounts it. Phase B only hosts the ProfileCard
// inspector; the other target kinds (Tu sala, Texto, Imagen, Music) arrive
// in D/G — until then Music keeps its own floating MenuPanel.
export function EditorHost({
  target, profile, facts, room, layers, layersReturnFocus, canvas, top, layout, memory, onSelectObject, updateProfile, onClose, onExpand,
}: EditorHostProps) {
  if (typeof document === "undefined") return null;
  // Editor v3 Phase D: "Tu sala" — the inspector with nothing selected.
  if (target?.kind === "room" && room) {
    return createPortal(
      <RoomInspector {...room} id="mnemo-room-inspector" onClose={onClose}
        returnFocusTo={() => document.getElementById(RAIL_ROOM_BUTTON_ID)}
        top={top} width={layout.width} mode={layout.mode} height={layout.height}
        collapsed={layout.collapsed} onExpand={onExpand} />,
      document.body,
    );
  }
  // Editor v3 Phase E: Capas.
  if (target?.kind === "layers" && layers) {
    return createPortal(
      <LayersPanel {...layers} id={LAYERS_PANEL_ID} onClose={onClose}
        returnFocusTo={layersReturnFocus ?? (() => document.getElementById(RAIL_LAYERS_BUTTON_ID))}
        top={top} width={layout.width} mode={layout.mode} height={layout.height}
        collapsed={layout.collapsed} onExpand={onExpand} />,
      document.body,
    );
  }
  if (target?.kind !== "profile" || !profile || profile.id !== target.id) return null;

  const id = profileInspectorId(profile.id);
  return createPortal(
    <ProfileInspector
      key={profile.id}
      id={id}
      card={profile}
      baseColor={cardBaseColor(profile, getProfileCardEffects(profile))}
      linksFits={facts?.linksFits}
      viewCount={facts?.viewCount}
      canvas={canvas}
      object={target.objectId}
      onSelectObject={onSelectObject}
      memory={memory}
      onChange={patch => updateProfile(profile.id, patch)}
      onClose={onClose}
      // "Editar"; the canvas when it is gone — usePanelFocus never lets
      // focus fall to <body>.
      returnFocusTo={() => document.getElementById(profileEditButtonId(profile.id))}
      top={top}
      width={layout.width}
      mode={layout.mode}
      height={layout.height}
      collapsed={layout.collapsed}
      onExpand={onExpand}
    />,
    document.body,
  );
}
