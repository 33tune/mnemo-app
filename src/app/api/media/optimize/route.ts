import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { GIF_LIMIT_MB } from "@/lib/storage/uploadRules";

// A GIF the user just uploaded, re-encoded here as an animated WebP (keeps
// the animation, usually 5–10× lighter) and capped at GIF_MAX_SIDE px.
// The browser can't do this without losing the animation (shrinkImage.ts
// leaves GIFs alone). Only the caller's own, just-uploaded GIF; on any
// problem the original stays and the caller keeps using it.
export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "canvas-assets";
/** Longest side of an optimized GIF: decorations and stickers, not photos. */
const GIF_MAX_SIDE = 800;
const PATH_RE = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\.gif$/;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path } = (await req.json().catch(() => ({}))) as { path?: string };
  const m = typeof path === "string" ? PATH_RE.exec(path) : null;
  if (!path || !m || m[1] !== user.id) return NextResponse.json({ error: "Bad path" }, { status: 400 });

  try {
    const { data: blob, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !blob) return NextResponse.json({ kept: true });
    const input = Buffer.from(await blob.arrayBuffer());
    if (input.length > GIF_LIMIT_MB * 1024 * 1024) return NextResponse.json({ kept: true });

    const output = await sharp(input, { animated: true, limitInputPixels: 300_000_000 })
      .resize(GIF_MAX_SIDE, GIF_MAX_SIDE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 60, effort: 4 })
      .toBuffer();
    // Not worth a new file unless it is clearly lighter.
    if (output.length > input.length * 0.9) return NextResponse.json({ kept: true });

    // "-gif" keeps it labelled GIF in the editor (isGifSrc).
    const newPath = `${user.id}/${crypto.randomUUID()}-gif.webp`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, output, {
      upsert: false, contentType: "image/webp", cacheControl: "31536000",
    });
    if (upErr) return NextResponse.json({ kept: true });
    // The original is no longer used by anything (the caller swaps the URL
    // before saving); if this fails, the daily cleanup removes it.
    await supabase.storage.from(BUCKET).remove([path]);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
    return NextResponse.json({ path: newPath, publicUrl: data.publicUrl, before: input.length, after: output.length });
  } catch (e) {
    console.error("[media-optimize]", e);
    return NextResponse.json({ kept: true });
  }
}
