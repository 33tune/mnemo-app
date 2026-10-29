import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import CrewHouseView from "@/features/crews/CrewHouseView";
import type { CrewHouse } from "@/features/crews/crewTypes";

// A crew's house (Crews, 2026-10-29): public for anyone with the link.
async function loadHouse(slug: string): Promise<CrewHouse | null> {
  if (!/^[a-z0-9_-]{3,24}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crew_house", { p_slug: slug });
  if (error || !data) return null;
  return data as CrewHouse;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const house = await loadHouse(slug);
  if (!house) return { title: "myLand" };
  const title = `${house.crew.name} · myLand`;
  const description = house.crew.motto || `${house.members.length} miembros en myland.lol/c/${slug}`;
  return { title, description, openGraph: { title, description, url: `/c/${slug}`, siteName: "myLand" } };
}

export default async function CrewPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { slug } = await params;
  const { nuevo } = await searchParams;
  const house = await loadHouse(slug);
  if (!house) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isMember = !!user && house.members.some(m => m.user_id === user.id);
  const joined = isMember && nuevo && /^\d{1,3}$/.test(nuevo) ? Number(nuevo) : null;
  return <CrewHouseView house={house} joinedNumber={joined} viewerIsMember={isMember} viewerIsOwner={!!user && user.id === house.crew.owner_id} />;
}
