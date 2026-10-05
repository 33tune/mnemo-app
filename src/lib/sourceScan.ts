/**
 * Test helper (menu redesign Phase 1): source text with comments removed,
 * for the guard tests that read real component source (uiTokens.test.ts,
 * editorCapabilities.test.ts). A color or a control mentioned only in a
 * comment is not in use.
 *
 * Careful with look-alikes: `accept="image/*"` is not a block comment and
 * `https://…` is not a line comment — a comment opener must follow
 * whitespace, a line start or punctuation, never a letter or a quote.
 */
export function stripComments(src: string): string {
  return src
    .replace(/(^|[\s{(;,])\/\*[\s\S]*?\*\//g, "$1")
    .replace(/(^|[\s{(;,])\/\/.*$/gm, "$1");
}

/** Collapses whitespace runs so evidence survives column alignment. */
export function squash(src: string): string {
  return src.replace(/\s+/g, " ");
}
