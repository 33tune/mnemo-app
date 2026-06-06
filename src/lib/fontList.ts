export type FontEntry = { key: string; label: string; style: string };

export const CANVAS_FONTS: FontEntry[] = [
  // ── Sans-serif web ────────────────────────────────────────────────────────
  { key: "DM Sans",        label: "DM Sans",      style: "'DM Sans', sans-serif" },
  { key: "Inter",          label: "Inter",        style: "'Inter', sans-serif" },
  { key: "Roboto",         label: "Roboto",       style: "'Roboto', sans-serif" },
  { key: "Open Sans",      label: "Open Sans",    style: "'Open Sans', sans-serif" },
  { key: "Lato",           label: "Lato",         style: "'Lato', sans-serif" },
  { key: "Montserrat",     label: "Montserrat",   style: "'Montserrat', sans-serif" },
  { key: "Poppins",        label: "Poppins",      style: "'Poppins', sans-serif" },
  { key: "Nunito",         label: "Nunito",       style: "'Nunito', sans-serif" },
  { key: "Mulish",         label: "Mulish",       style: "'Mulish', sans-serif" },
  { key: "Cabin",          label: "Cabin",        style: "'Cabin', sans-serif" },
  { key: "Ubuntu",         label: "Ubuntu",       style: "'Ubuntu', sans-serif" },
  { key: "Josefin Sans",   label: "Josefin",      style: "'Josefin Sans', sans-serif" },
  { key: "Raleway",        label: "Raleway",      style: "'Raleway', sans-serif" },
  { key: "Quicksand",      label: "Quicksand",    style: "'Quicksand', sans-serif" },
  { key: "Comfortaa",      label: "Comfortaa",    style: "'Comfortaa', sans-serif" },
  { key: "Syne",           label: "Syne",         style: "'Syne', sans-serif" },
  // ── Sans-serif system ─────────────────────────────────────────────────────
  { key: "Arial",          label: "Arial",        style: "Arial, sans-serif" },
  { key: "Helvetica",      label: "Helvetica",    style: "Helvetica, Arial, sans-serif" },
  { key: "Verdana",        label: "Verdana",      style: "Verdana, sans-serif" },
  { key: "Tahoma",         label: "Tahoma",       style: "Tahoma, sans-serif" },
  { key: "Trebuchet MS",   label: "Trebuchet",    style: "'Trebuchet MS', sans-serif" },
  // ── Serif ─────────────────────────────────────────────────────────────────
  { key: "Playfair Display", label: "Playfair",   style: "'Playfair Display', serif" },
  { key: "Georgia",        label: "Georgia",      style: "Georgia, serif" },
  { key: "Times New Roman", label: "Times",       style: "'Times New Roman', Times, serif" },
  // ── Display ───────────────────────────────────────────────────────────────
  { key: "Bebas Neue",     label: "Bebas Neue",   style: "'Bebas Neue', sans-serif" },
  { key: "Impact",         label: "Impact",       style: "Impact, sans-serif" },
  { key: "Oswald",         label: "Oswald",       style: "'Oswald', sans-serif" },
  { key: "Anton",          label: "Anton",        style: "'Anton', sans-serif" },
  // ── Monospace ─────────────────────────────────────────────────────────────
  { key: "Space Mono",     label: "Space Mono",   style: "'Space Mono', monospace" },
  { key: "Courier New",    label: "Courier",      style: "'Courier New', Courier, monospace" },
  { key: "JetBrains Mono", label: "JetBrains",   style: "'JetBrains Mono', monospace" },
  { key: "Fira Code",      label: "Fira Code",    style: "'Fira Code', monospace" },
  // ── Script ────────────────────────────────────────────────────────────────
  { key: "Pacifico",       label: "Pacifico",     style: "'Pacifico', cursive" },
  { key: "Dancing Script", label: "Dancing",      style: "'Dancing Script', cursive" },
  { key: "Great Vibes",    label: "Great Vibes",  style: "'Great Vibes', cursive" },
];

export function getFontStyle(font: string | undefined, fallback = "'DM Sans', sans-serif"): string {
  if (!font) return fallback;
  return CANVAS_FONTS.find(f => f.key === font)?.style ?? `'${font}', sans-serif`;
}
