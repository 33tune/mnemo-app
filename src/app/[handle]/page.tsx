import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import CanvasBoard from "@/components/canvas/CanvasBoard";
import { fitRoomToCard } from "@/lib/mobileFit";
import { publicStateOf } from "@/lib/publishedState";
import { dropOutsideRoom } from "@/lib/roomBounds";
import { isMobileUserAgent } from "@/lib/deviceGate";
import type { CanvasState } from "@/types";
import type { Metadata } from "next";

const RESERVED = new Set(["login", "dashboard", "space", "auth", "api", "admin", "settings"]);

export async function generateMetadata(
  { params }: { params: Promise<{ handle: string }> }
): Promise<Metadata> {
  const { handle } = await params;
  if (RESERVED.has(handle)) return { title: "myLand" };
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("handle, photo")
    .eq("handle", handle)
    .maybeSingle();
  if (!data) return { title: "myLand" };
  // The shared link's preview: the card itself is the image
  // (opengraph-image.tsx, a Next file convention).
  const title = `@${data.handle} en myLand`;
  const description = `Mirá la tarjeta de @${data.handle}: myland.lol/${data.handle}`;
  return {
    title: `@${data.handle}`,
    description,
    icons: { icon: data.photo || "/favicon.ico" },
    openGraph: { title, description, url: `https://myland.lol/${data.handle}`, siteName: "myLand", type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  if (RESERVED.has(handle)) notFound();

  const supabase = await createClient();

  const { data: { user: viewer } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, handle, display_name, onboarding_completed")
    .eq("handle", handle)
    .maybeSingle();

  // Profile missing, setup not complete, or temp handle — not publicly accessible
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!profile || (profile as any).onboarding_completed === false || handle.startsWith("temp_")) {
    notFound();
  }

  // Detect mobile via UA header — no flash, server-side
  const isMobileUA = isMobileUserAgent((await headers()).get("user-agent"));

  const { data: canvas } = await supabase
    .from("canvases")
    .select("id, data, name, is_public")
    .eq("user_id", profile.user_id)
    .eq("type", "space")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!canvas) notFound();

  // Track view — fire-and-forget, don't block render
  if (!viewer || viewer.id !== profile.user_id) {
    supabase.from("profile_views").insert({
      profile_user_id: profile.user_id,
      viewer_user_id:  viewer?.id ?? null,
      device_type:     isMobileUA ? "mobile" : "desktop",
    }).then(({ error }) => {
      if (error) console.error("[analytics] profile_views insert failed:", error.message, error.code);
    });
  }

  // Visitors see the last PUBLISHED snapshot, never the working copy
  // (publishedState.ts; rows never published since show their data).
  // The room is one screen (roomBounds.ts): the old scroll's leftovers are not drawn.
  const room = dropOutsideRoom(withLists(publicStateOf(canvas.data)));
  // Music players are out of the app (2026-10-27): only the room's own music.
  const state = { ...room, musicCards: [] };
  // Phones: the same renderer as desktop, the card alone (mobileFit.ts).
  const fit = isMobileUA ? fitRoomToCard(state) : null;

  return (
    <CanvasBoard
      canEdit={false}
      viewerLoggedIn={!isMobileUA && !!viewer && viewer.id !== profile.user_id}
      userHandle={profile.handle}
      initialState={fit ? fit.state : state}
      ownerUserId={profile.user_id}
      mobileFit={fit ?? undefined}
    />
  );
}

/** Rows saved before a list existed lack it; the crop reads every list. */
function withLists(s: CanvasState): CanvasState {
  return {
    ...s,
    cards: s.cards ?? [], images: s.images ?? [], texts: s.texts ?? [], galleries: s.galleries ?? [],
    profiles: s.profiles ?? [], medias: s.medias ?? [], guestbooks: s.guestbooks ?? [],
    socialCards: s.socialCards ?? [], musicCards: s.musicCards ?? [], linksCards: s.linksCards ?? [],
    statsCards: s.statsCards ?? [],
  };
}
