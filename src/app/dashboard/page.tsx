import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import CanvasBoard from "@/components/canvas/CanvasBoard";
import { isMobileUserAgent } from "@/lib/deviceGate";
import { ensureProfile } from "@/server/ensureProfile";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Phones get the phone editor (2026-11-23): the card is edited from the
  // phone; the room (free images / texts) stays a computer thing.
  const phone = isMobileUserAgent((await headers()).get("user-agent"));
  if (!user) redirect("/login");

  // Created here when missing (ensureProfile.ts): signed in without a row
  // used to bounce between /dashboard and /setup.
  const profile = await ensureProfile(supabase, user);

  // No profile or setup not finished — send to setup.
  // Treat null/undefined onboarding_completed as completed for backward compat.
  if (!profile || profile.onboarding_completed === false) redirect("/setup");
  return <CanvasBoard userHandle={profile.handle ?? ""} phoneEdit={phone} />;
}
