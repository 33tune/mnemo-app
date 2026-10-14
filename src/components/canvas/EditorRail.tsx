"use client";
import React from "react";
import { T, Icon, type IconName } from "@/ui";
import { EDITOR_UI_ATTR } from "@/lib/editorGuards";
import { RAIL_ROOM_BUTTON_ID, RAIL_LAYERS_BUTTON_ID } from "./EditorHost";

/** id of the rail's "Agregar" button (the "+" menu returns focus here). */
export const RAIL_ADD_BUTTON_ID = "mnemo-rail-add";
/** Liquid glass (L5): the rail is a floating capsule (DS .lg-rail): 16px
 * from the left edge, vertically centered; 4 buttons of 44 + 4 gap. */
const RAIL_STEP = 48;
/** Where the "+" menu opens next to the rail (left, top) — DS: 12px right
 * of the capsule, centered on it. */
export const RAIL_ADD_MENU_POS = { left: T.ui.size.railW + 12, top: "calc(50% - 96px)" } as const;

interface EditorRailProps {
  addOpen: boolean;
  onAdd: () => void;
  /** Seleccionar (V): the only canvas tool today — it cancels a pending
   * "place text" and closes the "+" menu. */
  onSelectTool: () => void;
  selectActive: boolean;
  roomOpen: boolean;
  onRoom: () => void;
  /** Editor v3 Phase E: Capas (L) opens the Layers panel in the dock. */
  layersOpen: boolean;
  onLayers: () => void;
  layersPanelId: string;
  addMenuId: string;
  roomInspectorId: string;
}

function RailButton({ icon, label, tip, keys, pressed, expanded, controls, disabled, onClick, id }: {
  icon: IconName; label: string; tip?: string; keys?: string; pressed?: boolean; expanded?: boolean; controls?: string;
  disabled?: boolean; onClick?: () => void; id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      className="mn-rail__btn mn-tip"
      data-tip-side="right"
      data-tip={keys ? `${tip ?? label}   ${keys}` : (tip ?? label)}
      aria-label={label}
      aria-keyshortcuts={keys}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={expanded ? controls : undefined}
      aria-disabled={disabled || undefined}
      data-active={pressed || expanded ? "" : undefined}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); if (!disabled) onClick?.(); }}
    >
      <Icon name={icon} size={19} />
    </button>
  );
}

// Editor v3 Phase D: the tool rail — only in the editor on wide viewports
// (the narrow layout has none, the "+" stays a floating button there). An
// editor UI surface ([data-mnemo-ui]): themed with the editor (Light / Dark /
// OG), never the canvas; the canvas-level shortcuts V / A / L run only with
// focus on the canvas (positive guard, CanvasBoard).
// Liquid glass (L5, DS .lg-rail): a vertical glass capsule centered on the
// left edge; the active tool sits on an indicator that glides between the
// buttons (spring), tooltips to the right. The logo moved to the brand
// capsule (Topbar).
export function EditorRail({ addOpen, onAdd, onSelectTool, selectActive, roomOpen, onRoom, layersOpen, onLayers, layersPanelId, addMenuId, roomInspectorId }: EditorRailProps) {
  const active = addOpen ? 1 : layersOpen ? 2 : roomOpen ? 3 : selectActive ? 0 : -1;
  return (
    <nav
      aria-label="Herramientas"
      {...{ [EDITOR_UI_ATTR]: "" }}
      className="mn-rail"
      style={{ position: "fixed", left: T.ui.size.dockMargin, top: "50%", transform: "translateY(-50%)", zIndex: 801, fontFamily: T.uiFont.sans }}
    >
      {active >= 0 && <span className="mn-rail__ind" aria-hidden="true" style={{ transform: `translateY(${active * RAIL_STEP}px)` }} />}
      <RailButton icon="pointer" label="Seleccionar" keys="V" pressed={selectActive} onClick={onSelectTool} />
      <RailButton icon="plus" label="Agregar" keys="A" id={RAIL_ADD_BUTTON_ID} expanded={addOpen} controls={addMenuId} onClick={onAdd} />
      <RailButton icon="layers" label="Capas" keys="L" id={RAIL_LAYERS_BUTTON_ID} expanded={layersOpen} controls={layersPanelId} onClick={onLayers} />
      <RailButton icon="gear" label="Tu sala" tip="Ajustes de tu sala" id={RAIL_ROOM_BUTTON_ID} expanded={roomOpen} controls={roomInspectorId} onClick={onRoom} />
    </nav>
  );
}
