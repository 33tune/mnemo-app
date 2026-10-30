import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CrewPactView, { type PactViewer } from "@/features/crews/CrewPactView";
import type { Crew } from "@/features/crews/crewTypes";

// El Pacto (Crews, 2026-10-29): the invite link /c/<slug>/unirme?k=<code>.
export const metadata: Metadata = { title: "Unirme · myLand", robots: { index: false } };

export default async function PactPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { slug } = await params;
  const { k } = await searchParams;
  if (!/^[a-z0-9_-]{3,24}$/.test(slug)) notFound();
  const code = (k ?? "").slice(0, 64);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crew_pact", { p_slug: slug, p_code: code });
  if (error || !data) notFound();
  const pact = data as { crew: Crew; valid: boolean; members: number; mine: number | null; banned?: boolean };

  const { data: { user } } = await supabase.auth.getUser();
  let viewer: PactViewer = "guest";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("handle, onboarding_completed").eq("user_id", user.id).maybeSingle();
    const named = !!profile && profile.onboarding_completed !== false && !(profile.handle as string).startsWith("temp_");
    viewer = named ? "ready" : "needs-name";
  }
  return <CrewPactView crew={pact.crew} code={code} valid={pact.valid} members={pact.members} mine={pact.mine} banned={!!pact.banned} viewer={viewer} />;
}
