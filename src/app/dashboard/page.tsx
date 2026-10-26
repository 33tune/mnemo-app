import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import CanvasBoard from "@/components/canvas/CanvasBoard";
import DesktopOnly from "@/components/site/DesktopOnly";
import { isMobileUserAgent } from "@/lib/deviceGate";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Phones only view profiles (deviceGate.ts): the editor is for computers.
  const phone = isMobileUserAgent((await headers()).get("user-agent"));
  if (!user) return phone ? <DesktopOnly /> : redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  // No profile or setup not finished — send to setup.
  // Treat null/undefined onboarding_completed as completed for backward compat.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!profile || (profile as any).onboarding_completed === false) {
    if (phone) return <DesktopOnly />;
    redirect("/setup");
  }
  if (phone) return <DesktopOnly handle={profile.handle ?? undefined} />;

  return <CanvasBoard userHandle={profile.handle ?? ""} />;
}
