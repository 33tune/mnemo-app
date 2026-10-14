"use client";
import React, { useState } from "react";
import type { SpaceCursor, SpaceFont, SpaceMusic } from "@/types";
import {
  InspectorShell, MenuSection, MenuRow, MenuNote, ColorRow, SliderRow, ActionButton, SwitchRow, Tabs, Icon, UploadField, Accordion,
} from "@/ui";
import { wellHex } from "@/ui/ColorPopover";
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
  /** Editor v3 Phase I: Lienzo › Ajustar a la cuadrícula (local preference). */
  snap: boolean;
  onSnap: (on: boolean) => void;
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

const THEME_ICON: Record<EditorTheme, "sun" | "moon" | undefined> = { light: "sun", dark: "moon", og: undefined };

// Editor v3 Phase D: "Tu sala" — the inspector with nothing selected, opened
// on demand from the rail. Liquid glass (design menu-schema.js "room"):
// Fondo · Ambiente · Lienzo · Apariencia del editor. IDENTICAL operations
// (every enqueue below is the one the old "Ajustes de MyLand" submenu sent).
export default function RoomInspector(p: RoomInspectorProps) {
  const [theme, setTheme] = useEditorTheme();
  // DS accordion: every card starts closed; one open at a time.
  const [open, setOpen] = useState<string | null>(null);
  const { enqueue } = p;
  const customBg = !!p.wallpaper || p.bgColor !== ROOM_DEFAULT_BG || !!p.wallpaperBlur || p.wallpaperBrightness !== 100 || !!p.wallpaperVignette;
  const ambient = [p.spaceMusic?.url && "Música", p.spaceFont && "Fuente", p.spaceCursor?.url && "Cursor"].filter(Boolean) as string[];
  return (
    <InspectorShell
      id={p.id}
      title="Tu sala"
      icon="gear"
      path={`sala · nada seleccionado · ${p.objectCount} ${p.objectCount === 1 ? "objeto" : "objetos"}`}
      onClose={p.onClose}
      returnFocusTo={p.returnFocusTo}
      top={p.top}
      width={p.width}
      mode={p.mode}
      height={p.height}
      collapsed={p.collapsed}
      onExpand={p.onExpand}
    >
      <Accordion open={open} onOpenChange={setOpen}>
      <div className="mn-swap" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <MenuSection label="Fondo" icon="palette" swatch={p.bgColor} summary={p.wallpaper ? "Wallpaper" : wellHex(p.bgColor)}>
          {/* Block 1: picking a color never clears the wallpaper — the color is
              the base layer, the wallpaper paints over it. */}
          <ColorRow label="Color" value={p.bgColor} onChange={v => enqueue({ type: "set_bg", value: v })} />
          <UploadField kind="cover" value={p.wallpaper || null} label="Subir wallpaper" caption="Wallpaper" accept="image/*"
            onPick={() => p.pickWallpaper()} onRemove={() => enqueue({ type: "set_wallpaper", value: "" })} />
          {p.wallpaper && <MenuNote>Se muestra encima del color</MenuNote>}
          <SliderRow label="Desenfoque" icon="blend" value={p.wallpaperBlur} min={0} max={40} step={1} unit="px" defaultValue={0} fmt={v => `${Math.round(v)} px`}
            onChange={v => enqueue({ type: "set_wallpaper_blur", value: v })} />
          <SliderRow label="Brillo" icon="sun" value={p.wallpaperBrightness} min={0} max={200} step={1} unit="%" defaultValue={100} fmt={v => `${Math.round(v)}%`}
            onChange={v => enqueue({ type: "set_wallpaper_brightness", value: v })} />
          <SliderRow label="Viñetado" icon="frame" value={p.wallpaperVignette} min={0} max={100} step={1} unit="" defaultValue={0}
            onChange={v => enqueue({ type: "set_wallpaper_vignette", value: v })} />
          {customBg && (
            <ActionButton variant="secondary" fullWidth onClick={() => {
              enqueue({ type: "set_wallpaper", value: "" });
              enqueue({ type: "set_bg", value: ROOM_DEFAULT_BG });
              enqueue({ type: "set_wallpaper_blur", value: 0 });
              enqueue({ type: "set_wallpaper_brightness", value: 100 });
              enqueue({ type: "set_wallpaper_vignette", value: 0 });
            }}><Icon name="reset" size={15} />Restablecer fondo</ActionButton>
          )}
        </MenuSection>

        <MenuSection label="Ambiente" icon="music" summary={ambient.length ? ambient.join(", ") : "Nada cargado"}>
          <UploadField kind="audio" value={p.spaceMusic?.url || null} name={p.spaceMusic?.name ?? undefined} label="Música de la sala" caption="MP3" accept=".mp3"
            onPick={() => p.pickMusic()} onRemove={() => enqueue({ type: "set_space_music", value: undefined })} />
          {/* The user's own font, written in itself (canvas content). */}
          <UploadField kind="font" value={p.spaceFont ? p.spaceFont.name : null} name={p.spaceFont?.name} label="Fuente global" caption="Fuente propia"
            accept=".woff2,.woff,.ttf,.otf" onPick={() => p.pickFont()} onRemove={() => enqueue({ type: "set_space_font", value: undefined })} />
          <UploadField kind="cursor" value={p.spaceCursor?.url || null} name="cursor.png" label="Cursor" caption="Cursor PNG" accept="image/png"
            onPick={() => p.pickCursor()} onRemove={() => enqueue({ type: "set_space_cursor", value: undefined })} />
        </MenuSection>

        <MenuSection label="Lienzo" icon="frame" summary={[p.grid ? "Cuadrícula" : "Sin cuadrícula", p.snap && "ajuste"].filter(Boolean).join(" · ")}>
          <SwitchRow label="Mostrar cuadrícula" icon="frame" value={p.grid} onChange={v => p.onGrid(v)} hintId="mnemo-room-grid-note" />
          <MenuNote id="mnemo-room-grid-note">Solo se ve mientras editás; nunca en tu perfil.</MenuNote>
          {/* Editor v3 Phase I (review I-V/I-R): Mayús counts WHILE dragging —
              pressed before the click it still toggles the selection. */}
          <SwitchRow label="Ajustar a la cuadrícula" icon="move" value={p.snap} onChange={v => p.onSnap(v)} hintId="mnemo-room-snap-note" />
          <MenuNote id="mnemo-room-snap-note">Mientras arrastrás, mantené Mayús para hacerlo libre. La tarjeta queda centrada.</MenuNote>
          {p.snap && !p.grid && <MenuNote tone="warn">La cuadrícula está oculta</MenuNote>}
        </MenuSection>

        <MenuSection label="Apariencia del editor" icon="sun" summary={THEME_LABEL[theme]}>
          <MenuRow label="Tema">
            <div style={{ width: 228 }}>
              <Tabs tabs={EDITOR_THEMES.map(t => ({ id: t, label: THEME_LABEL[t], icon: THEME_ICON[t], withText: true }))} active={theme} onChange={id => setTheme(id as EditorTheme)} label="Tema del editor" />
            </div>
          </MenuRow>
          <MenuNote>Cambia solo el editor: tu sala y tu perfil se ven igual.</MenuNote>
        </MenuSection>
      </div>
      </Accordion>
    </InspectorShell>
  );
}
