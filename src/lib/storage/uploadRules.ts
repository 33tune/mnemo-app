/**
 * What the app accepts as an upload (security audit 2026-10-26): before, any
 * file of any size went to the public bucket. Now only what the editor uses —
 * images (GIFs included), MP3s and web fonts — each within a size limit.
 * Pure, so it is tested; the bucket's own limits (Supabase dashboard) are the
 * server-side backstop.
 */
export const UPLOAD_LIMITS = { image: 15, audio: 20, font: 5 } as const; // MB
/** GIFs can't be shrunk in the browser (it would drop the animation): they
 * get a lower cap here and are re-encoded on the server (/api/media/optimize). */
export const GIF_LIMIT_MB = 8;

const FONT_EXTS = ["woff2", "woff", "ttf", "otf"];
const AUDIO_EXTS = ["mp3"];
const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "bmp"];

export type UploadKind = keyof typeof UPLOAD_LIMITS;

export function uploadKind(file: { name: string; type: string }): UploadKind | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/") || (!type && IMAGE_EXTS.includes(ext))) return "image";
  if (type === "audio/mpeg" || type === "audio/mp3" || AUDIO_EXTS.includes(ext)) return "audio";
  if (type.startsWith("font/") || FONT_EXTS.includes(ext)) return "font";
  return null;
}

/** Why `file` can't be uploaded (in the user's words), or null when it can. */
export function checkUpload(file: { name: string; type: string; size: number }): string | null {
  const kind = uploadKind(file);
  if (!kind) return "Ese tipo de archivo no se puede subir. Usá una imagen, un MP3 o una fuente.";
  if (kind === "image" && contentTypeFor(file) === "image/gif" && file.size > GIF_LIMIT_MB * 1024 * 1024) {
    return `El GIF pesa más de ${GIF_LIMIT_MB} MB. Probá con uno más liviano o más corto.`;
  }
  const max = UPLOAD_LIMITS[kind];
  if (file.size > max * 1024 * 1024) {
    const what = kind === "image" ? "La imagen" : kind === "audio" ? "El audio" : "La fuente";
    return `${what} pesa más de ${max} MB. Probá con un archivo más liviano.`;
  }
  return null;
}

const FONT_TYPES: Record<string, string> = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };
const IMAGE_TYPES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  avif: "image/avif", svg: "image/svg+xml", bmp: "image/bmp",
};

/** The content type to store `file` with: the bucket only accepts images,
 * MP3s and fonts, and some systems hand files over without a type. */
export function contentTypeFor(file: { name: string; type: string }): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const kind = uploadKind(file);
  if (kind === "audio") return "audio/mpeg";
  if (kind === "font") return file.type.startsWith("font/") ? file.type : FONT_TYPES[ext] ?? "font/ttf";
  return file.type || IMAGE_TYPES[ext] || "application/octet-stream";
}

/** Longest side an uploaded picture keeps (a 1440p screen, the room's size). */
export const IMAGE_MAX_SIDE = 2560;

/** Size to shrink a w×h picture to (same proportions), or null to keep it. */
export function shrinkSize(w: number, h: number, max = IMAGE_MAX_SIDE): { w: number; h: number } | null {
  if (!(w > 0 && h > 0)) return null;
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

/** Pictures worth re-encoding: not GIFs (animation), not SVGs (vector). */
export function shouldShrink(file: { name: string; type: string }): boolean {
  if (uploadKind(file) !== "image") return false;
  const t = contentTypeFor(file);
  return t !== "image/gif" && t !== "image/svg+xml";
}

/** A GIF, as uploaded or as optimized on the server (<uuid>-gif.webp). */
export function isGifSrc(src: string | null | undefined): boolean {
  return /(\.gif|-gif\.webp)(\?|$)/i.test(src ?? "");
}
