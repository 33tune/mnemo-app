/**
 * Idioma de la app (2026-11-27): "es" | "en", per browser. First visit: the
 * browser's language (Spanish → es, anything else → en). Changing it tells
 * every listener (the Translator, the landing) at once.
 */
export type Lang = "es" | "en";
// The same key the landing already used for its own switch.
const KEY = "myland-lang";
export const LANG_EVENT = "ml-lang-change";

export function getLang(): Lang {
  if (typeof window === "undefined") return "es";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "es" || v === "en") return v;
  } catch { /* storage blocked */ }
  const nav = (navigator.languages?.[0] ?? navigator.language ?? "es").toLowerCase();
  return nav.startsWith("es") ? "es" : "en";
}

export function setLang(lang: Lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* storage blocked: this visit only */ }
  window.dispatchEvent(new CustomEvent<Lang>(LANG_EVENT, { detail: lang }));
}
