import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { publicStateOf } from "@/lib/publishedState";
import { ogCardOf } from "@/lib/ogCard";
import { OgCardImage, OgFallbackImage, OG_SIZE } from "@/components/og/OgCardImage";
import { withDrawableImages, ogJpeg } from "@/server/ogImages";

// The preview WhatsApp / Instagram / Discord show for myland.lol/<name>: the
// published card (ogCard.ts). Same data the public page shows. Served as a
// light JPEG (ogJpeg): WhatsApp ignores big pictures.
export const size = OG_SIZE;
export const contentType = "image/jpeg";
export const alt = "Tarjeta de myLand";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  let og = null;
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase.from("profiles")
      .select("user_id, onboarding_completed").eq("handle", handle).maybeSingle();
    if (profile && profile.onboarding_completed !== false && !handle.startsWith("temp_")) {
      const { data: canvas } = await supabase.from("canvases").select("data")
        .eq("user_id", profile.user_id).eq("type", "space")
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      const card = canvas ? ogCardOf(publicStateOf(canvas.data), handle) : null;
      if (card) og = await withDrawableImages(card);
    }
  } catch { /* the fallback below */ }
  const png = await new ImageResponse(og ? <OgCardImage og={og} /> : <OgFallbackImage handle={handle} />, size).arrayBuffer();
  return new Response(new Uint8Array(await ogJpeg(png)), {
    headers: {
      "Content-Type": "image/jpeg",
      // Crawlers fetch it again and again; a published change shows within the hour.
      "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
