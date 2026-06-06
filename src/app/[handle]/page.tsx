import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import CanvasBoard from "@/components/canvas/CanvasBoard";
import MobilePublicCanvas from "@/components/canvas/MobilePublicCanvas";
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
  return {
    title: `@${data.handle} — MNEMO`,
    icons: { icon: data.photo || "/favicon.ico" },
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
  const headersList = await headers();
  const ua = headersList.get("user-agent") ?? "";
  const isMobileUA = /android|iphone|ipad|ipod|mobile|blackberry|windows phone/i.test(ua);

  const [{ data: canvas }, { data: mobileCanvas }] = await Promise.all([
    supabase
      .from("canvases")
      .select("id, data, name, is_public")
      .eq("user_id", profile.user_id)
      .eq("type", "space")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("canvases")
      .select("id, data")
      .eq("user_id", profile.user_id)
      .eq("type", "space_mobile")
      .maybeSingle(),
  ]);

  if (!canvas) notFound();

  // Use mobile canvas if: device is mobile AND mobile canvas has content
  const mobileState = mobileCanvas?.data as CanvasState | undefined;
  const hasMobileContent = !!(mobileState && (
    (mobileState.cards?.length ?? 0) > 0 ||
    (mobileState.images?.length ?? 0) > 0 ||
    (mobileState.texts?.length ?? 0) > 0 ||
    (mobileState.profiles?.length ?? 0) > 0 ||
    (mobileState.galleries?.length ?? 0) > 0 ||
    (mobileState.medias?.length ?? 0) > 0 ||
    (mobileState.guestbooks?.length ?? 0) > 0
  ));
  const showMobile = isMobileUA && hasMobileContent;

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

  const state = (canvas.data ?? {}) as CanvasState;

  return (
    <>
      {showMobile ? (
        <MobilePublicCanvas
          state={mobileState}
          handle={profile.handle}
          name={profile.display_name ?? ""}
          userId={profile.user_id}
        />
      ) : (
        <CanvasBoard
          canEdit={false}
          viewerLoggedIn={!!viewer && viewer.id !== profile.user_id}
          userHandle={profile.handle}
          initialState={state}
          ownerUserId={profile.user_id}
        />
      )}
    </>
  );
}
