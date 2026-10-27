import sharp from "sharp";
import type { OgCard } from "@/lib/ogCard";

/**
 * The preview renderer (next/og) only reads PNG / JPEG / GIF, and it fails
 * while streaming when a picture can't be read. So every picture is fetched
 * here first and handed over as a small PNG data URL (WebP uploads included);
 * one that can't be fetched or decoded is simply left out.
 */
async function drawable(url: string | null, maxSide: number): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 20 * 1024 * 1024) return null;
    const png = await sharp(buf, { animated: false })
      .resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function withDrawableImages(og: OgCard): Promise<OgCard> {
  const [photo, bgImage, roomImage] = await Promise.all([
    drawable(og.photo, 480), drawable(og.bgImage, 1000), drawable(og.roomImage, 1200),
  ]);
  return { ...og, photo, bgImage, roomImage };
}
