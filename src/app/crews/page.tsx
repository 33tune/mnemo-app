import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CrewsEditor from "@/features/crews/CrewsEditor";

// Your crews (Crews, 2026-10-29): create, edit (owner), feature on your card.
// Simple forms, so it works on phones too.
export const metadata: Metadata = { title: "Crews · myLand", robots: { index: false } };

export default async function CrewsPage({ searchParams }: { searchParams: Promise<{ crew?: string }> }) {
  const { crew } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?mode=login&next=${encodeURIComponent("/crews")}`);
  const { data: profile } = await supabase.from("profiles").select("handle, onboarding_completed").eq("user_id", user.id).maybeSingle();
  if (!profile || profile.onboarding_completed === false || (profile.handle as string).startsWith("temp_")) redirect("/setup");
  const openCrewId = crew && /^[0-9a-f-]{36}$/.test(crew) ? crew : undefined;
  return <CrewsEditor userId={user.id} handle={profile.handle as string} openCrewId={openCrewId} />;
}
