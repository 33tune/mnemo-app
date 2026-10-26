/**
 * Free text on the canvas is plain text (the editor saves `innerText`), but it
 * used to be drawn as HTML — so markup written straight to the database ran
 * on every visitor's page (stored XSS, security audit 2026-10-26). It is now
 * always drawn as text: old content that still carries line-break markup
 * (`<br>`, `<div>`, `<p>`) keeps its line breaks, every other tag is dropped.
 */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", "#39": "'", apos: "'", nbsp: " " };

/** Stored content → the plain text it shows. */
export function storedTextToPlain(content: unknown): string {
  const s = typeof content === "string" ? content : "";
  if (!/[<&]/.test(s)) return s;
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e: string) => ENTITIES[e])
    .replace(/\n$/, "");
}

/** Plain text escaped for an HTML context (no markup can survive). */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** What a free text renders as HTML: always inert text. */
export function safeTextHtml(content: unknown): string {
  return escapeHtml(storedTextToPlain(content));
}
