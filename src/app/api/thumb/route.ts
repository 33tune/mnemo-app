import sharp from "sharp";
import { isOwnStorageUrl } from "@/lib/thumbImages";

// Explorar (2026-11-26): a small, still copy of a picture of our storage
// (src/lib/thumbImages.ts). Uploads are named by UUID and never change, so
// the answer is cached for a year by the browser and the CDN.

export const runtime = "nodejs";
const SIZES = [160, 240, 400, 640];

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const u = q.get("u") || "";
  const want = Number(q.get("w")) || 400;
  const w = SIZES.find(s => s >= want) ?? SIZES[SIZES.length - 1];
  const sb = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!isOwnStorageUrl(u, sb)) return new Response("bad url", { status: 400 });
  try {
    const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return new Response("not found", { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 25 * 1024 * 1024) return new Response("too big", { status: 413 });
    const out = await sharp(buf, { animated: false, limitInputPixels: 80_000_000 })
      .rotate().resize(w, w, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 74, alphaQuality: 80 }).toBuffer();
    return new Response(new Uint8Array(out), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable" },
    });
  } catch {
    // Not a picture sharp can read (an SVG with fonts, a broken file): nothing,
    // rather than the full-size original the thumb exists to avoid.
    return new Response("unreadable", { status: 422, headers: { "Cache-Control": "public, max-age=3600" } });
  }
}
