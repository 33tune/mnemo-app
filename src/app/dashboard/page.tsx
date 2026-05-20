import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CanvasBoard from "@/components/canvas/CanvasBoard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  // No profile or setup not finished — send to setup.
  // Treat null/undefined onboarding_completed as completed for backward compat.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!profile || (profile as any).onboarding_completed === false) {
    redirect("/setup");
  }

  return <CanvasBoard userHandle={profile.handle ?? ""} />;
}
