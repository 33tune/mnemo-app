import sharp from "sharp";
import { isOwnStorageUrl } from "@/lib/thumbImages";

// Explorar (2026-11-26): a small, still copy of a picture of our storage
// (src/lib/thumbImages.ts). Uploads are named by UUID and never change, so
// the answer is cached for a year by the browser and the CDN.

export const runtime = "nodejs";
const SIZES = [160, 240, 400, 640, 960, 1280];

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const u = q.get("u") || "";
  const want = Number(q.get("w")) || 400;
  // anim=1 (2026-11-28, the phone profile): keep every frame of a GIF / animated
  // WebP, only smaller; on any failure send the original rather than nothing.
  const anim = q.get("anim") === "1";
  const w = SIZES.find(s => s >= want) ?? SIZES[SIZES.length - 1];
  const sb = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!isOwnStorageUrl(u, sb)) return new Response("bad url", { status: 400 });
  try {
    const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return anim ? Response.redirect(u, 302) : new Response("not found", { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 25 * 1024 * 1024) return anim ? Response.redirect(u, 302) : new Response("too big", { status: 413 });
    const out = await sharp(buf, { animated: anim, limitInputPixels: 200_000_000 })
      .rotate().resize(w, w, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: anim ? 70 : 74, alphaQuality: 80, effort: anim ? 3 : 4 }).toBuffer();
    return new Response(new Uint8Array(out), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable" },
    });
  } catch {
    if (anim) return Response.redirect(u, 302);
    // Not a picture sharp can read (an SVG with fonts, a broken file): nothing,
    // rather than the full-size original the thumb exists to avoid.
    return new Response("unreadable", { status: 422, headers: { "Cache-Control": "public, max-age=3600" } });
  }
}
