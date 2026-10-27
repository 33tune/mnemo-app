import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import CanvasBoard from "@/components/canvas/CanvasBoard";
import { MobileClaimed } from "@/components/site/MobileClaimed";
import { isMobileUserAgent } from "@/lib/deviceGate";
import { ensureProfile } from "@/server/ensureProfile";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Phones can sign up and claim a name, but the editor is for computers
  // (deviceGate.ts): there they see "¡Es tuyo! … entrá desde una compu".
  const phone = isMobileUserAgent((await headers()).get("user-agent"));
  if (!user) redirect("/login");

  // Created here when missing (ensureProfile.ts): signed in without a row
  // used to bounce between /dashboard and /setup.
  const profile = await ensureProfile(supabase, user);

  // No profile or setup not finished — send to setup.
  // Treat null/undefined onboarding_completed as completed for backward compat.
  if (!profile || profile.onboarding_completed === false) redirect("/setup");
  if (phone) return <MobileClaimed handle={profile.handle ?? ""} />;

  return <CanvasBoard userHandle={profile.handle ?? ""} />;
}
