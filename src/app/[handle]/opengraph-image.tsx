import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { publicStateOf } from "@/lib/publishedState";
import { ogCardOf } from "@/lib/ogCard";
import { OgCardImage, OgFallbackImage, OG_SIZE } from "@/components/og/OgCardImage";
import { withDrawableImages } from "@/server/ogImages";

// The preview WhatsApp / Instagram / Discord show for myland.lol/<name>: the
// published card (ogCard.ts). Same data the public page shows.
export const size = OG_SIZE;
export const contentType = "image/png";
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
  return new ImageResponse(og ? <OgCardImage og={og} /> : <OgFallbackImage handle={handle} />, size);
}
