import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import SetupScreen from "@/components/site/SetupScreen";
import { MobileClaimed } from "@/components/site/MobileClaimed";
import { isMobileUserAgent } from "@/lib/deviceGate";

// After signing in with Google: pick myland.lol/<name> (SetupScreen, the
// Auth v4 look). Phones can claim the name too; the card is built on a computer.
export default async function SetupPage() {
  const phone = isMobileUserAgent((await headers()).get("user-agent"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, display_name, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed === true) {
    if (phone) return <MobileClaimed handle={profile.handle as string} />;
    redirect("/dashboard");
  }

  const suggested: string =
    (profile?.display_name as string | null) ??
    ((user.user_metadata?.full_name) as string | undefined) ??
    "";

  return <SetupScreen userId={user.id} suggestedName={suggested} phone={phone} />;
}
