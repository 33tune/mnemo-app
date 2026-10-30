/**
 * Liquid glass L6 — "Buscar ajuste" (DS dock search, `/` and ⌘K / Ctrl+K).
 *
 * The settings each inspector shows, by object › card › control (and, for a
 * control inside an effect tile's "Ajustes de X", the tile). It is an INDEX
 * for finding, not a schema: nothing renders from it (CLAUDE.md: no menus
 * generated from a schema / registry). The labels are the visible labels
 * the inspectors render — extracted from the rendered dock and checked
 * against the source by settingsIndex.test.ts (a renamed or moved control
 * fails the test). Search navigates there and flashes the control
 * (InspectorShell); the effect itself still lives in its own control.
 */
import type { IconName } from "@/ui/icons";
import type { ObjectId } from "./inspectorObjects";

export type SearchObject = ObjectId | "text" | "image" | "music" | "room";
/** [card title, card icon (null = pinned card), control labels, tile controls]. */
export type SettingsCard = readonly [string, IconName | null, readonly string[], Readonly<Record<string, readonly string[]>>?];

export const SETTINGS_INDEX: Readonly<Record<SearchObject, readonly SettingsCard[]>> = {
  photo: [
    ["Imagen", null, []],
    ["Forma", "corner", ["Tamaño"]],
    ["Efectos de la foto", "sparkles", ["Borde", "Sombra", "Brillo"], { "Brillo": ["Color", "Intensidad", "Radio", "Pulso", "Velocidad del pulso"] }],
  ],
  name: [
    ["Contenido", null, []],
    ["Tipografía", "case", ["Tamaño", "Peso", "Interletrado", "Interlineado"]],
    ["Color", "palette", ["Color"]],
    ["Efectos del texto", "sparkles", ["Gradiente", "Shimmer", "Rebote", "Sombra", "Brillo", "Pulso", "Contorno", "Desenfoque"], { "Gradiente": ["Ángulo"] }],
    ["Estilo del bloque", "frame", []],
  ],
  handle: [
    ["Contenido", null, []],
    ["Tipografía", "case", ["Tamaño", "Peso", "Interletrado"]],
    ["Color", "palette", ["Color"]],
    ["Efectos del texto", "sparkles", ["Gradiente", "Shimmer", "Sombra", "Brillo", "Pulso", "Contorno", "Desenfoque"]],
    ["Estilo del bloque", "frame", []],
  ],
  descriptor: [
    ["Contenido", null, []],
    ["Tipografía", "case", ["Tamaño", "Peso", "Interletrado"]],
    ["Color", "palette", ["Color"]],
    ["Efectos del texto", "sparkles", ["Gradiente", "Shimmer", "Sombra", "Brillo", "Pulso", "Contorno", "Desenfoque"]],
    ["Estilo del bloque", "frame", []],
  ],
  location: [
    ["Contenido", null, []],
    ["Tipografía", "case", ["Tamaño", "Peso", "Interletrado"]],
    ["Color", "palette", ["Color"]],
    ["Efectos del texto", "sparkles", ["Gradiente", "Shimmer", "Sombra", "Brillo", "Pulso", "Contorno", "Desenfoque"]],
    ["Estilo del bloque", "frame", []],
  ],
  bio: [
    ["Contenido", null, []],
    ["Tipografía", "case", ["Tamaño", "Peso", "Interlineado"]],
    ["Color", "palette", ["Color"]],
    ["Efectos del texto", "sparkles", ["Gradiente", "Shimmer", "Sombra", "Brillo", "Pulso", "Contorno", "Desenfoque"]],
    ["Estilo del bloque", "frame", []],
  ],
  about: [
    ["Contenido", null, []],
    ["Tipografía", "case", ["Tamaño", "Peso", "Interlineado"]],
    ["Color", "palette", ["Color"]],
    ["Efectos del texto", "sparkles", ["Gradiente", "Shimmer", "Sombra", "Brillo", "Pulso", "Contorno", "Desenfoque"]],
    ["Estilo del bloque", "frame", []],
  ],
  views: [
    ["Contador", null, ["Mostrar cantidad"]],
    ["Tipografía", "case", ["Tamaño", "Peso", "Interletrado"]],
    ["Color", "palette", ["Color"]],
    ["Efectos del texto", "sparkles", ["Gradiente", "Shimmer", "Sombra", "Brillo", "Pulso", "Contorno", "Desenfoque"]],
    ["Estilo del bloque", "frame", []],
  ],
  links: [
    ["Links", null, []],
    ["Íconos", "maximize", ["Tamaño"]],
    ["Estilo del bloque", "frame", []],
  ],
  buttons: [
    ["Botones", null, []],
    ["Estilo", "palette", ["Forma", "Relleno", "Color del botón", "Color del texto", "Tamaño", "Ícono de la red"]],
    ["Distribución", "spacing", ["Ancho", "Separación"]],
    ["Al pasar el cursor", "pointer", ["Elevar", "Brillo", "Invertir"]],
  ],
  crew: [
    ["Crew", null, ["Mostrar en la card"]],
    ["Tamaño", "maximize", ["Tamaño"]],
  ],
  stickers: [
    ["Stickers", null, ["Agregar sticker", "Editar", "Aplicar"]],
    ["Capas", "layers", ["Tarjeta"]],
  ],
  logo: [
    ["Imagen", null, []],
    ["Tamaño y giro", "maximize", ["Ancho", "Alto", "Rotación", "Opacidad"]],
    ["Profundidad", "layers", []],
  ],
  cardBg: [
    ["Color", "palette", ["Opacidad"]],
    ["Imagen o GIF", "image", []],
    ["Superficie", "blend", ["Gradiente", "Vidrio", "Desenfoque"]],
    ["Forma y medidas", "corner", ["Esquinas", "Ancho", "Alto"]],
  ],
  cardFx: [
    ["Luz", "sun", ["Borde", "Sombra", "Brillo", "Pulso"], { "Sombra": ["Intensidad", "Color", "Blur", "X", "Y", "Opacidad"] }],
    ["Movimiento", "move", ["Flotar", "Inclinar 3D"], { "Flotar": ["Amplitud", "Ciclo"] }],
    ["Al pasar el cursor", "pointer", ["Brillo", "Escala", "Spotlight"], { "Spotlight": ["Color", "Radio"] }],
    ["Retro", "disc", ["Scanlines", "Ruido VHS", "Flicker", "Aberración"]],
  ],
  allText: [
    ["Color de todos los textos", "palette", ["Color"]],
    ["Alineación y espaciado", "align-center", ["Alineación", "Interlineado secundario"]],
  ],
  text: [
    ["Contenido", null, []],
    ["Tipografía", "case", ["Tamaño", "Interletrado", "Mayúsculas"]],
    ["Color", "palette", ["Opacidad"]],
    ["Medidas", "move", ["X", "Y", "Rotación"]],
  ],
  image: [
    ["Imagen", null, []],
    ["Esquinas", "corner", ["Rectas", "Suaves", "Redondas", "Círculo"]],
    ["Link", "link", []],
    ["Medidas", "move", ["X", "Y", "Ancho", "Alto", "Rotación"]],
  ],
  music: [
    ["Canción", null, ["Título", "Artista", "Volumen inicial"]],
    ["Fondo", "palette", ["Color", "Opacidad", "Gradiente", "Vidrio", "Desenfoque"]],
    ["Texto", "case", ["Color", "Tamaño"]],
    ["Luz", "sun", ["Glow", "Sombra", "Borde"], { "Glow": ["Dónde", "Color", "Intensidad"] }],
    ["Movimiento y cursor", "move", ["Flotar", "Inclinar 3D", "Spotlight", "Glow al pasar"]],
    ["Medidas", "move", ["X", "Y", "Ancho", "Alto", "Rotación"]],
  ],
  room: [
    ["Fondo", "palette", ["Color", "Desenfoque", "Brillo", "Viñetado"]],
    ["Ambiente", "music", []],
    ["Lienzo", "frame", ["Mostrar cuadrícula", "Ajustar a la cuadrícula"]],
    ["Apariencia del editor", "sun", []],
  ],
};

export interface SettingHit {
  object: SearchObject;
  card:   string;
  /** The control (absent = the card itself). */
  label?: string;
  /** The effect tile whose "Ajustes de X" holds the control. */
  tile?:  string;
  icon:   IconName;
}

/** Lowercase, no accents ("Ángulo" ~ "angulo"). */
export function normalizeSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Every setting of `objects`, card first then its controls (index order). */
export function settingsOf(objects: readonly SearchObject[], iconOf?: (o: SearchObject) => IconName): SettingHit[] {
  const out: SettingHit[] = [];
  for (const object of objects) {
    for (const [card, icon, labels, tiles] of SETTINGS_INDEX[object] ?? []) {
      const ic: IconName = icon ?? iconOf?.(object) ?? "sliders";
      out.push({ object, card, icon: ic });
      for (const label of labels) out.push({ object, card, label, icon: ic });
      for (const [tile, ls] of Object.entries(tiles ?? {})) for (const label of ls) out.push({ object, card, label, tile, icon: ic });
    }
  }
  return out;
}

/** DS searchVM: the query matched against the control, its tile, its card
 * and the object's name; empty query = everything. At most `limit`. */
export function searchSettings(hits: readonly SettingHit[], query: string, objectLabel: (o: SearchObject) => string, limit = 40): SettingHit[] {
  const q = normalizeSearch(query);
  if (!q) return hits.slice(0, limit);
  return hits.filter(h => normalizeSearch(`${h.label ?? ""} ${h.tile ?? ""} ${h.card} ${objectLabel(h.object)}`).includes(q)).slice(0, limit);
}
