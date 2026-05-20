import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CanvasBoard from "@/components/canvas/CanvasBoard";
import ProfileViewTracker from "@/components/analytics/ProfileViewTracker";
import type { CanvasState } from "@/types";

const RESERVED = new Set(["login", "dashboard", "space", "auth", "api", "admin", "settings"]);

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

  const { data: canvas } = await supabase
    .from("canvases")
    .select("id, data, name, is_public")
    .eq("user_id", profile.user_id)
    .eq("type", "space")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!canvas) notFound();

  const state = (canvas.data ?? {}) as CanvasState;

  return (
    <>
      <ProfileViewTracker
        handle={profile.handle}
        viewerId={viewer?.id}
      />
      <CanvasBoard
        canEdit={false}
        viewerLoggedIn={!!viewer && viewer.id !== profile.user_id}
        userHandle={profile.handle}
        initialState={state}
        ownerUserId={profile.user_id}
      />
    </>
  );
}
