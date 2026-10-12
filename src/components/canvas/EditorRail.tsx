"use client";
import React from "react";
import { T, uv, Icon, type IconName } from "@/ui";
import { EDITOR_UI_ATTR } from "@/lib/editorGuards";
import { RAIL_ROOM_BUTTON_ID, RAIL_LAYERS_BUTTON_ID } from "./EditorHost";

/** id of the rail's "Agregar" button (the "+" menu returns focus here). */
export const RAIL_ADD_BUTTON_ID = "mnemo-rail-add";
/** Where the "+" menu opens next to the rail (left, top). */
export const RAIL_ADD_MENU_POS = { left: T.ui.size.railW + 8, top: 112 } as const;

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

function RailButton({ icon, label, keys, pressed, expanded, controls, disabled, onClick, id }: {
  icon: IconName; label: string; keys?: string; pressed?: boolean; expanded?: boolean; controls?: string;
  disabled?: boolean; onClick?: () => void; id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      className="mn-rail__btn"
      aria-label={label}
      title={keys ? `${label} (${keys})` : label}
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

// Editor v3 Phase D: the tool rail (design screen 01) — 64px on the left,
// only in the editor on wide viewports (the narrow layout has none, the "+"
// stays a floating button there). An editor UI surface ([data-mnemo-ui]):
// themed with the editor (Light / Dark / OG), never the canvas; the
// canvas-level shortcuts V / A / L run only with focus on the canvas
// (positive guard, CanvasBoard).
export function EditorRail({ addOpen, onAdd, onSelectTool, selectActive, roomOpen, onRoom, layersOpen, onLayers, layersPanelId, addMenuId, roomInspectorId }: EditorRailProps) {
  return (
    <nav
      aria-label="Herramientas"
      {...{ [EDITOR_UI_ATTR]: "" }}
      className="mn-rail"
      style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: T.ui.size.railW, zIndex: 801,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingTop: 12, boxSizing: "border-box",
        background: uv("shell-rail"), color: uv("shell-rail-ink"), fontFamily: T.uiFont.sans,
      }}
    >
      {/* The MYLAND mark (the topbar's wordmark names the product). */}
      <img src="/logo.png" alt="" width={34} height={27} draggable={false} style={{ width: 34, height: "auto", marginBottom: 14 }} />
      <RailButton icon="pointer" label="Seleccionar" keys="V" pressed={selectActive} onClick={onSelectTool} />
      <RailButton icon="plus" label="Agregar" keys="A" id={RAIL_ADD_BUTTON_ID} expanded={addOpen} controls={addMenuId} onClick={onAdd} />
      <RailButton icon="layers" label="Capas" keys="L" id={RAIL_LAYERS_BUTTON_ID} expanded={layersOpen} controls={layersPanelId} onClick={onLayers} />
      <div style={{ flex: 1 }} />
      <div style={{ marginBottom: 12 }}>
        <RailButton icon="room" label="Tu sala" id={RAIL_ROOM_BUTTON_ID} expanded={roomOpen} controls={roomInspectorId} onClick={onRoom} />
      </div>
    </nav>
  );
}
