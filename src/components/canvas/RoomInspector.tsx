"use client";
import React from "react";
import type { SpaceCursor, SpaceFont, SpaceMusic } from "@/types";
import {
  T, uv, InspectorShell, MenuSection, MenuRow, MenuNote, ColorRow, SliderRow, ActionButton, Toggle, Tabs, Icon,
} from "@/ui";
import { useEditorTheme } from "@/lib/useEditorTheme";
import { EDITOR_THEMES, type EditorTheme } from "@/lib/editorTheme";

/** The room setting ops "Tu sala" writes — the SAME set_* ops the old
 * "Ajustes de MyLand" submenu of the "+" menu sent (CanvasBoard.enqueueOp). */
export type RoomOp =
  | { type: "set_bg"; value: string }
  | { type: "set_wallpaper"; value: string }
  | { type: "set_wallpaper_blur"; value: number }
  | { type: "set_wallpaper_brightness"; value: number }
  | { type: "set_wallpaper_vignette"; value: number }
  | { type: "set_space_music"; value: SpaceMusic | undefined }
  | { type: "set_space_font"; value: SpaceFont | undefined }
  | { type: "set_space_cursor"; value: SpaceCursor | undefined };

export const ROOM_DEFAULT_BG = "#0a0a0c";

const THEME_LABEL: Record<EditorTheme, string> = { light: "Claro", dark: "Oscuro", og: "OG" };

interface RoomInspectorProps {
  id?: string;
  bgColor: string;
  wallpaper: string;
  wallpaperBlur: number;
  wallpaperBrightness: number;
  wallpaperVignette: number;
  spaceMusic?: SpaceMusic;
  spaceFont?: SpaceFont;
  spaceCursor?: SpaceCursor;
  objectCount: number;
  enqueue: (op: RoomOp) => void;
  /** File pickers (the existing hidden inputs of CanvasBoard). */
  pickWallpaper: () => void;
  pickMusic: () => void;
  pickFont: () => void;
  pickCursor: () => void;
  /** Lienzo › Mostrar cuadrícula (editor-only, local preference). */
  grid: boolean;
  onGrid: (on: boolean) => void;
  // Shell
  onClose: () => void;
  returnFocusTo: () => HTMLElement | null;
  top: number;
  width: number;
  mode: "dock" | "sheet";
  height?: number;
  collapsed: boolean;
  onExpand: () => void;
}

// Editor v3 Phase D: "Tu sala" — the inspector with nothing selected, opened
// on demand from the rail (user decision 2026-10-08). The room settings
// moved here from the "+" menu with IDENTICAL operations (every enqueue below
// is the one the old "Ajustes de MyLand" submenu sent); plus Lienzo (the
// editor grid) and Apariencia (the editor theme — editor surfaces only,
// never the canvas or the profile).
export default function RoomInspector(p: RoomInspectorProps) {
  const [theme, setTheme] = useEditorTheme();
  const { enqueue } = p;
  return (
    <InspectorShell
      id={p.id}
      title="Tu sala"
      path="sala"
      aside="nada seleccionado"
      meta={`${p.objectCount} ${p.objectCount === 1 ? "objeto" : "objetos"}`}
      onClose={p.onClose}
      returnFocusTo={p.returnFocusTo}
      top={p.top}
      width={p.width}
      mode={p.mode}
      height={p.height}
      collapsed={p.collapsed}
      onExpand={p.onExpand}
    >
      <MenuSection label="Fondo" num="01" tone={1} first>
        {/* Block 1: picking a color never clears the wallpaper — the color is
            the base layer, the wallpaper paints over it. */}
        <ColorRow label="Color de fondo" value={p.bgColor} onChange={v => enqueue({ type: "set_bg", value: v })} />
        {p.wallpaper && <MenuNote>El wallpaper se muestra encima del color.</MenuNote>}
        <ActionButton variant="secondary" fullWidth onClick={() => p.pickWallpaper()}>Subir wallpaper</ActionButton>
        {p.wallpaper && (
          <ActionButton variant="danger" fullWidth onClick={() => enqueue({ type: "set_wallpaper", value: "" })}>Quitar wallpaper</ActionButton>
        )}
        {(p.wallpaper || p.bgColor !== ROOM_DEFAULT_BG) && (
          <ActionButton variant="ghost" fullWidth onClick={() => {
            enqueue({ type: "set_wallpaper", value: "" });
            enqueue({ type: "set_bg", value: ROOM_DEFAULT_BG });
            enqueue({ type: "set_wallpaper_blur", value: 0 });
            enqueue({ type: "set_wallpaper_brightness", value: 100 });
            enqueue({ type: "set_wallpaper_vignette", value: 0 });
          }}>Restablecer fondo por defecto</ActionButton>
        )}
        <SliderRow label="Desenfoque" value={p.wallpaperBlur} min={0} max={40} step={1} unit="px" defaultValue={0}
          onChange={v => enqueue({ type: "set_wallpaper_blur", value: v })} />
        <SliderRow label="Brillo" value={p.wallpaperBrightness} min={0} max={200} step={1} unit="%" defaultValue={100}
          onChange={v => enqueue({ type: "set_wallpaper_brightness", value: v })} />
        <SliderRow label="Viñetado" value={p.wallpaperVignette} min={0} max={100} step={1} unit="" defaultValue={0}
          onChange={v => enqueue({ type: "set_wallpaper_vignette", value: v })} />
      </MenuSection>

      <MenuSection label="Música">
        {p.spaceMusic?.url ? (
          <>
            <div style={{ ...T.type.value, color: uv("text-secondary"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.spaceMusic.name ?? "ambient.mp3"}
            </div>
            <ActionButton variant="secondary" fullWidth onClick={() => p.pickMusic()}>Cambiar música</ActionButton>
            <ActionButton variant="danger" fullWidth onClick={() => enqueue({ type: "set_space_music", value: undefined })}>Quitar música</ActionButton>
          </>
        ) : (
          <ActionButton variant="secondary" fullWidth onClick={() => p.pickMusic()}>Subir música (.mp3)</ActionButton>
        )}
      </MenuSection>

      <MenuSection label="Fuente global">
        {p.spaceFont ? (
          <>
            {/* The user's own font, rendered in itself (canvas content). */}
            <div style={{ fontFamily: `"${p.spaceFont.name}", ${T.uiFont.sans}`, fontSize: 13, lineHeight: "18px", color: uv("text-primary"),
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.spaceFont.name}</div>
            <ActionButton variant="secondary" fullWidth onClick={() => p.pickFont()}>Cambiar fuente</ActionButton>
            <ActionButton variant="danger" fullWidth onClick={() => enqueue({ type: "set_space_font", value: undefined })}>Quitar fuente</ActionButton>
          </>
        ) : (
          <ActionButton variant="secondary" fullWidth onClick={() => p.pickFont()}>Subir fuente (.woff2 .woff .ttf .otf)</ActionButton>
        )}
      </MenuSection>

      <MenuSection label="Cursor">
        {p.spaceCursor?.url ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src={p.spaceCursor.url} alt="Cursor actual" style={{ width: 20, height: 20, objectFit: "contain", imageRendering: "pixelated", opacity: 0.7 }} />
              <span style={{ ...T.type.value, color: uv("text-secondary") }}>cursor.png</span>
            </div>
            <ActionButton variant="secondary" fullWidth onClick={() => p.pickCursor()}>Cambiar cursor</ActionButton>
            <ActionButton variant="danger" fullWidth onClick={() => enqueue({ type: "set_space_cursor", value: undefined })}>Quitar cursor</ActionButton>
          </>
        ) : (
          <ActionButton variant="secondary" fullWidth onClick={() => p.pickCursor()}>Subir cursor (.png)</ActionButton>
        )}
      </MenuSection>

      <MenuSection label="Lienzo" num="02" tone={2}>
        <MenuRow label="Mostrar cuadrícula">
          <Toggle value={p.grid} onChange={v => p.onGrid(v)} />
        </MenuRow>
        <MenuNote>Solo se ve mientras editás; nunca en tu perfil.</MenuNote>
      </MenuSection>

      <MenuSection label="Apariencia" num="03" tone={3}>
        <MenuRow label="Tema del editor">
          <div style={{ width: 196 }}>
            <Tabs tabs={EDITOR_THEMES.map(t => ({ id: t, label: THEME_LABEL[t] }))} active={theme} onChange={id => setTheme(id as EditorTheme)} />
          </div>
        </MenuRow>
        <MenuNote>Cambia solo el editor: tu sala y tu perfil se ven igual.</MenuNote>
      </MenuSection>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
        <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center", background: uv("accent-on"), color: uv("accent-on-ink") }}>
          <Icon name="pointer" size={16} />
        </span>
        <p style={{ margin: 0, fontFamily: T.uiFont.display, fontSize: 20, lineHeight: 1.1, fontWeight: 700, letterSpacing: "-0.03em", color: uv("text-primary") }}>
          Tocá cualquier cosa de la sala para editarla.
        </p>
      </div>
    </InspectorShell>
  );
}
