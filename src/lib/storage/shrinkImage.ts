"use client";
import { shrinkSize, shouldShrink } from "./uploadRules";

/**
 * Pictures are stored small (2026-10-27): at most IMAGE_MAX_SIDE on the long
 * side, re-encoded as WebP (JPEG where the browser can't write WebP and the
 * picture has no transparency). Storage and every visitor's download shrink
 * ~10×. GIFs and SVGs go as they are, and so does any file the re-encode
 * would not make smaller. Never throws: on any problem the original goes.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!shouldShrink(file) || typeof createImageBitmap !== "function") return file;
  try {
    const bmp = await createImageBitmap(file);
    const size = shrinkSize(bmp.width, bmp.height);
    if (!size) { bmp.close(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bmp.close(); return file; }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, size.w, size.h);
    bmp.close();
    const toBlob = (type: string) => new Promise<Blob | null>(res => canvas.toBlob(res, type, 0.86));
    let blob = await toBlob("image/webp");
    if (blob && blob.type !== "image/webp") {
      // No WebP encoder (older Safari): JPEG only for pictures without alpha.
      blob = file.type === "image/jpeg" ? await toBlob("image/jpeg") : null;
    }
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
    return new File([blob], name, { type: blob.type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}
