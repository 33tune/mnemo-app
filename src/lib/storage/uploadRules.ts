/**
 * What the app accepts as an upload (security audit 2026-10-26): before, any
 * file of any size went to the public bucket. Now only what the editor uses —
 * images (GIFs included), MP3s and web fonts — each within a size limit.
 * Pure, so it is tested; the bucket's own limits (Supabase dashboard) are the
 * server-side backstop.
 */
export const UPLOAD_LIMITS = { image: 15, audio: 20, font: 5 } as const; // MB

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
  const max = UPLOAD_LIMITS[kind];
  if (file.size > max * 1024 * 1024) {
    const what = kind === "image" ? "La imagen" : kind === "audio" ? "El audio" : "La fuente";
    return `${what} pesa más de ${max} MB. Probá con un archivo más liviano.`;
  }
  return null;
}
